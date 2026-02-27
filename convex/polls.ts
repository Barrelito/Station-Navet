import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
    getStationArea,
    getRegion,
    getAllStations,
    getAllAreas,
    getStationsInArea,
} from "./org_helpers";

/**
 * createPoll – Skapar en omröstning (direkt till voting).
 * Endast för chefer.
 */
export const createPoll = mutation({
    args: {
        title: v.string(),
        description: v.string(),
        targetAudience: v.string(),
    },
    handler: async (ctx, args) => {
        // 1. Autentisering & Behörighetskoll
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Du måste vara inloggad.");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) {
            throw new Error("Användare saknas.");
        }

        const isManager = ["station_manager", "area_manager", "region_manager", "admin"].includes(user.role);
        if (!isManager) {
            throw new Error("Endast chefer kan skapa omröstningar.");
        }

        // 2. Validera targetAudience (återanvänder logik från ideas.ts men förenklad)
        const userArea = await getStationArea(ctx, user.station || "");
        const userRegion = await getRegion(ctx, user.station || "");
        const validTargets: string[] = [];

        if (user.role === "station_manager") {
            if (user.station) validTargets.push(user.station);
            if (userArea) validTargets.push(userArea);
        } else if (user.role === "area_manager") {
            const area = user.area || userArea;
            if (area) {
                validTargets.push(area);
                const stationsInArea = await getStationsInArea(ctx, area);
                validTargets.push(...stationsInArea);
            }
        } else if (user.role === "region_manager") {
            if (userRegion) validTargets.push(userRegion);
        } else if (user.role === "admin") {
            // Admin får göra allt (men vi kanske ska begränsa? kör på detta för nu)
            validTargets.push(args.targetAudience);
        }

        if (user.role !== "admin" && !validTargets.includes(args.targetAudience)) {
            throw new Error(`Du saknar behörighet att posta till ${args.targetAudience}`);
        }


        // 3. Beräkna scope
        let scope: "station" | "area" | "region";
        const allStations = await getAllStations(ctx);
        const allAreas = await getAllAreas(ctx);

        if (allStations.includes(args.targetAudience)) {
            scope = "station";
        } else if (allAreas.includes(args.targetAudience)) {
            scope = "area";
        } else {
            scope = "region";
        }

        // 4. Spara (direkt till voting)
        const ideaId = await ctx.db.insert("ideas", {
            type: "poll",
            title: args.title,
            description: args.description,
            // perfectState & resourceNeeds är optional nu
            authorId: user._id,
            status: "voting", // Direkt till omröstning!
            votesCount: 0,
            targetAudience: args.targetAudience,
            scope,
        });

        // 5. Notiser (Copy-paste logik från ideas.ts men anpassad text)
        // TODO: Refactor notification logic to shared helper later if needed
        let usersToNotify = await ctx.db.query("users").collect();
        const usersToNotifyFiltered: any[] = [];

        for (const u of usersToNotify) {
            if (u._id === user._id) continue;
            const uArea = await getStationArea(ctx, u.station || "");
            const uRegion = await getRegion(ctx, u.station || "");

            if (scope === "station" && u.station === args.targetAudience) {
                usersToNotifyFiltered.push(u);
            } else if (scope === "area" && uArea === args.targetAudience) {
                usersToNotifyFiltered.push(u);
            } else if (scope === "region" && uRegion === args.targetAudience) {
                usersToNotifyFiltered.push(u);
            }
        }

        const userIdsToNotify = usersToNotifyFiltered.map(u => u._id);
        if (userIdsToNotify.length > 0) {
            await ctx.scheduler.runAfter(0, internal.notifications.sendNotification, {
                userIds: userIdsToNotify,
                type: "vote", // Använd röst-ikon
                title: `Ny omröstning: ${args.title}`,
                message: `Din chef vill veta vad du tycker!`,
                link: "/",
                relatedId: ideaId,
            });
        }

        return ideaId;
    },
});
