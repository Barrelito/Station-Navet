import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
    getStationArea,
    getRegion,
    getAllStations,
    getAllAreas,
    getStationsInArea,
    getAllStationsInRegion,
    getAllAreasInRegion,
} from "../lib/org-structure";

// ─── Statuskonstanter som INTE ska visas i feeden ──────────
const HIDDEN_STATUSES = ["draft", "archived"] as const;

/**
 * getIdeas – Hämtar alla synliga idéer för den inloggade användaren.
 *
 * Hierarkisk filtrering: Användaren ser idéer som riktar sig till:
 * - Användarens station
 * - Användarens område (stationsområde)
 * - Användarens region
 *
 * Filtrerar bort "draft" och "archived" – de hör inte hemma
 * i det publika flödet (Torgmötet).
 */
export const getIdeas = query({
    args: {
        station: v.optional(v.string()), // Filtrera på specifik station (för managers)
    },
    handler: async (ctx, args) => {
        // ── 1. Hämta inloggad användare ──────────────────────────
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            // Om ej inloggad, visa inga idéer
            return [];
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user || !user.station) {
            // Användare saknar station → visa inga idéer
            return [];
        }

        // ── 2. Beräkna hierarkiska målgrupper ────────────────────
        // Vilka targets har användaren BEHÖRIGHET att se?
        const allowedTargets: string[] = [];

        // Alla ser sin egen station + område + region
        const userStation = user.station;
        const userArea = getStationArea(userStation);
        const userRegion = getRegion(userStation);

        allowedTargets.push(userStation);
        if (userArea) allowedTargets.push(userArea);
        if (userRegion) allowedTargets.push(userRegion);

        // ── 2b. Utöka synlighet för area/region managers ─────────
        // Area managers ser alla stationer i sitt område
        if (user.role === "area_manager" && userArea) {
            const stationsInArea = getStationsInArea(userArea);
            allowedTargets.push(...stationsInArea);
        }

        // Region managers ser alla stationer och områden i sin region
        if (user.role === "region_manager" && userRegion) {
            const allStationsInRegion = getAllStationsInRegion(userRegion);
            const allAreasInRegion = getAllAreasInRegion(userRegion);
            allowedTargets.push(...allStationsInRegion, ...allAreasInRegion);
        }

        // ── 3. Hämta alla idéer ────────────────────────────────────
        const allIdeas = await ctx.db
            .query("ideas")
            .order("desc") // Nyaste _creationTime först
            .collect();

        // ── 4. Filtrera baserat på hierarki och status ────────────
        return allIdeas.filter((idea) => {
            // Dölj drafts och archived
            if (HIDDEN_STATUSES.includes(idea.status as any)) {
                return false;
            }

            // 1. Grundkoll: Får användaren se idén överhuvudtaget?
            if (!allowedTargets.includes(idea.targetAudience)) {
                return false;
            }

            // 2. Om filter är aktivt: Visa bara idéer relevanta för vald station
            if (args.station) {
                // Stationschefer får bara filtrera på sin egen station (vilket de redan ser)
                // Area/Region managers får filtrera på stationer de har behörighet till

                // Validera att användaren får se denna station
                // (Vi har redan byggt allowedTargets, så om stationen finns där är det OK)
                if (!allowedTargets.includes(args.station)) {
                    // Om man försöker filtrera på en station man inte får se → visa tomt
                    return false;
                }

                // Vilka targets är relevanta för den VALDA stationen?
                // Stationen själv + dess område + dess region
                const filterArea = getStationArea(args.station);
                const filterRegion = getRegion(args.station);

                const relevantForStation = [
                    args.station,
                    filterArea,
                    filterRegion
                ].filter(Boolean); // Ta bort null/undefined

                return relevantForStation.includes(idea.targetAudience);
            }

            return true;
        });
    },
});

/**
 * submitIdea – Skapar en ny idé kopplad till den inloggade användaren.
 *
 * Hierarkisk submission:
 * - Vanliga användare ("user") kan bara posta till sin egen station.
 * - Chefer ("manager") kan välja att posta till sin station eller hela sitt område.
 *
 * Flöde:
 * 1. Verifiera att användaren är autentiserad (Clerk).
 * 2. Slå upp den interna user-posten via tokenIdentifier.
 * 3. Validera targetAudience baserat på användarens roll.
 * 4. Beräkna scope automatiskt.
 * 5. Spara idén med status "proposal" (redo för stöttning).
 */
export const submitIdea = mutation({
    args: {
        title: v.string(),
        description: v.string(),
        perfectState: v.string(),
        resourceNeeds: v.string(),
        targetAudience: v.string(),
    },
    handler: async (ctx, args) => {
        // ── 1. Autentisering ──────────────────────────────────────
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Du måste vara inloggad för att skicka in en idé.");
        }

        // ── 2. Användar-uppslag ───────────────────────────────────
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) {
            throw new Error("Användarprofil saknas. Kontakta admin.");
        }

        if (!user.station) {
            throw new Error("Du måste välja en station innan du kan skapa idéer.");
        }

        // ── 3. Validera targetAudience baserat på roll ────────────
        let validatedTargetAudience = args.targetAudience;
        const userArea = getStationArea(user.station);
        const userRegion = getRegion(user.station);

        const validTargets: string[] = [];

        if (user.role === "user") {
            // Vanliga användare får bara posta till sin egen station
            validatedTargetAudience = user.station;
        } else if (user.role === "station_manager") {
            // Stationschefer får välja mellan sin station eller sitt område
            validTargets.push(user.station);
            if (userArea) validTargets.push(userArea);

            if (!validTargets.includes(args.targetAudience)) {
                throw new Error(
                    `Som stationschef kan du bara posta till din station (${user.station})${userArea ? ` eller ditt område (${userArea})` : ""
                    }.`
                );
            }
        } else if (user.role === "area_manager") {
            // Områdeschefer får posta till sitt område ELLER till enskilda stationer i området
            const actualUserArea = user.area || userArea;
            if (!actualUserArea) {
                throw new Error("Kunde inte hitta ditt område.");
            }

            // Tillåt området själv
            validTargets.push(actualUserArea);

            // Tillåt alla stationer i området
            const stationsInArea = getStationsInArea(actualUserArea);
            validTargets.push(...stationsInArea);

            if (!validTargets.includes(args.targetAudience)) {
                throw new Error(
                    `Som områdeschef kan du bara posta till ditt område (${actualUserArea}) eller till stationer inom området.`
                );
            }
        } else if (user.role === "region_manager") {
            // Regionchefer får bara posta till sin region
            if (!userRegion) {
                throw new Error("Kunde inte hitta din region.");
            }
            validTargets.push(userRegion);

            if (args.targetAudience !== userRegion) {
                throw new Error(
                    `Som regionchef kan du bara posta till din region (${userRegion}).`
                );
            }
        } else {
            throw new Error("Ogiltig användarroll.");
        }

        // ── 4. Beräkna scope automatiskt ──────────────────────────
        let scope: "station" | "area" | "region";
        if (getAllStations().includes(validatedTargetAudience)) {
            scope = "station";
        } else if (getAllAreas().includes(validatedTargetAudience)) {
            scope = "area";
        } else {
            scope = "region";
        }

        // ── 5. Spara idén ─────────────────────────────────────────
        const ideaId = await ctx.db.insert("ideas", {
            title: args.title,
            description: args.description,
            perfectState: args.perfectState,
            resourceNeeds: args.resourceNeeds,
            authorId: user._id,
            status: "proposal",  // Ny idé → direkt ut till stöttning
            votesCount: 0,
            targetAudience: validatedTargetAudience,
            scope,
        });

        return ideaId;
    },
});

/**
 * approveIdea – Stationschefen godkänner en idé efter omröstning.
 *
 * Flyttar idén till "approved" → redo att plockas upp i Verkstaden.
 * (MVP: ingen stenhård roll-check, frontend styr synlighet.)
 */
export const approveIdea = mutation({
    args: {
        ideaId: v.id("ideas"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Du måste vara inloggad.");
        }

        const idea = await ctx.db.get(args.ideaId);
        if (!idea) throw new Error("Idén hittades inte.");

        if (idea.status !== "voting") {
            throw new Error("Idén kan bara godkännas under omröstningsfasen.");
        }

        await ctx.db.patch(args.ideaId, { status: "approved" });
    },
});
