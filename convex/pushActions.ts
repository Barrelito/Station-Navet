"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
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
        // Vi hämtar från den vanliga 'push'-modulen
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
