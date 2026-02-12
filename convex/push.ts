
import { v } from "convex/values";
import { mutation, internalQuery, internalMutation } from "./_generated/server";

/**
 * saveSubscription - Sparar en användares push-subscription.
 * Anropas från frontend när användaren godkänner notiser.
 */
export const saveSubscription = mutation({
    args: {
        endpoint: v.string(),
        keys: v.object({
            p256dh: v.string(),
            auth: v.string()
        }),
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

        if (!user) throw new Error("Användare hittades inte.");

        // Kolla om den redan finns
        const existing = await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
            .first();

        if (existing) {
            // Uppdatera userId om det behövs (t.ex. vid ny inloggning)
            if (existing.userId !== user._id) {
                await ctx.db.patch(existing._id, { userId: user._id });
            }
            return existing._id;
        }

        // Skapa ny
        return await ctx.db.insert("pushSubscriptions", {
            userId: user._id,
            endpoint: args.endpoint,
            keys: args.keys,
        });
    },
});

/**
 * getPushSubscriptions - Intern query för att hämta subs för en user.
 */
export const getSubscriptions = internalQuery({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();
    },
});

// removeSubscription - Tar bort en död subscription. (Intern)
export const removeSubscription = internalMutation({
    args: { endpoint: v.string() },
    handler: async (ctx, args) => {
        const sub = await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
            .first();

        if (sub) {
            await ctx.db.delete(sub._id);
        }
    },
});
