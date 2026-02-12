import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
    getStationArea,
    getRegion,
    getAllStations,
    getAllAreas,
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
    args: {},
    handler: async (ctx) => {
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
        const userStation = user.station;
        const userArea = getStationArea(userStation);
        const userRegion = getRegion(userStation);

        const allowedTargets = [userStation];
        if (userArea) allowedTargets.push(userArea);
        if (userRegion) allowedTargets.push(userRegion);

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

            // Visa endast idéer som riktar sig till användarens station, område eller region
            return allowedTargets.includes(idea.targetAudience);
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

        if (user.role === "user") {
            // Vanliga användare får bara posta till sin egen station
            validatedTargetAudience = user.station;
        } else if (user.role === "manager") {
            // Chefer får välja mellan sin station eller sitt område
            const validTargets = [user.station];
            if (userArea) {
                validTargets.push(userArea);
            }

            if (!validTargets.includes(args.targetAudience)) {
                throw new Error(
                    `Som chef kan du bara posta till din station (${user.station})${userArea ? ` eller ditt område (${userArea})` : ""
                    }.`
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
