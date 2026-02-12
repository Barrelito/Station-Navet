"use node";

import { v } from "convex/values";
import { internalAction, mutation, query, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import webpush from "web-push";

/**
 * setupWebPush - Konfigurerar biblioteket.
 * Anropas i action-handlern.
 */
function setupWebPush() {
    const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
        console.warn("⚠️ VAPID keys är inte inställda i miljövariabler (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY).");
        return false;
    }

    // Mejladress för kontakt vid problem (byt ut vid prod)
    webpush.setVapidDetails(
        'mailto:support@station-navet.se',
        publicKey,
        privateKey
    );
    return true;
}

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

/**
 * removeSubscription - Tar bort en död subscription.
 */
export const removeSubscription = mutation({
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

/**
 * sendPushToUser - Skickar pushnotis till ALLA enheter för en användare.
 */
export const sendPushToUser = internalAction({
    args: {
        userId: v.id("users"),
        title: v.string(),
        message: v.string(),
        link: v.string(),
        relatedId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        if (!setupWebPush()) return;

        // 1. Hämta abonnemang via runQuery (eftersom vi är i en action)
        const subscriptions = await ctx.runQuery(internal.push.getSubscriptions, {
            userId: args.userId
        });

        if (subscriptions.length === 0) return;

        // 2. Skicka till alla
        const payload = JSON.stringify({
            title: args.title,
            message: args.message,
            link: args.link,
            relatedId: args.relatedId,
        });

        const promises = subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: sub.keys,
                }, payload);
            } catch (err: any) {
                // Om endpointen är död (404/410), ta bort den
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await ctx.runMutation(internal.push.removeSubscription, {
                        endpoint: sub.endpoint
                    });
                    console.log(`Rensade död subscription: ${sub.endpoint}`);
                } else {
                    console.error("Fel vid push:", err);
                }
            }
        });

        await Promise.all(promises);
    },
});
