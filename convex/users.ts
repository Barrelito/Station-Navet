import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * getCurrentUser – Hämtar den inloggade användarens profil.
 * 
 * Används av frontend för att visa station, roll, etc.
 */
export const getCurrentUser = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return null;
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        return user;
    },
});

/**
 * ensureUserExists – Skapar en user-post om den inte finns.
 * 
 * Körs automatiskt vid första inloggningen från frontend.
 */
export const ensureUserExists = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Inte inloggad.");
        }

        const existing = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (existing) {
            return existing._id;
        }

        // Skapa ny användare med tom station (triggar StationSelector)
        const userId = await ctx.db.insert("users", {
            tokenIdentifier: identity.tokenIdentifier,
            name: identity.name ?? "Användare",
            role: "user",
            // station utelämnas (optional) - triggar StationSelector
        });

        return userId;
    },
});

/**
 * updateUserStation – Uppdaterar användarens station.
 * 
 * Används vid första inloggningen via StationSelector-dialogen.
 */
export const updateUserStation = mutation({
    args: {
        station: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Du måste vara inloggad.");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) {
            throw new Error("Användarprofil saknas. Kontakta admin.");
        }

        await ctx.db.patch(user._id, {
            station: args.station,
        });

        return user._id;
    },
});
