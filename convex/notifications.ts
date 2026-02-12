
import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ─── Public API ──────────────────────────────────────────────

/**
 * getNotifications – Hämtar användarens notiser.
 * Hämtar alla olästa + de 10 senaste lästa (som inte är arkiverade).
 */
export const getNotifications = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) return [];

        // Hämta alla aktiva (ej arkiverade) för användaren
        const notifications = await ctx.db
            .query("notifications")
            .withIndex("by_user", (q) => q.eq("userId", user._id).eq("isArchived", false))
            .order("desc")
            .take(20); // Hämta de 20 senaste för nu

        return notifications;
    },
});

/**
 * getUnreadCount – Räknar antalet olästa notiser.
 * Används för badgen på klockan.
 */
export const getUnreadCount = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return 0;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) return 0;

        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_user_unread", (q) => q.eq("userId", user._id).eq("isRead", false))
            .collect();

        return unread.length;
    },
});

/**
 * markAsRead – Markerar en specifik notis som läst.
 */
export const markAsRead = mutation({
    args: {
        notificationId: v.id("notifications"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        // Verifiera att notisen tillhör användaren (säkerhet)
        const notification = await ctx.db.get(args.notificationId);
        if (!notification) return;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user || notification.userId !== user._id) return;

        await ctx.db.patch(args.notificationId, { isRead: true });
    },
});

/**
 * markAllAsRead – Markerar alla användarens notiser som lästa.
 */
export const markAllAsRead = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) return;

        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_user_unread", (q) => q.eq("userId", user._id).eq("isRead", false))
            .collect();

        for (const n of unread) {
            await ctx.db.patch(n._id, { isRead: true });
        }
    },
});

/**
 * archiveNotification – Gömmer notisen helt (arkiverar).
 */
export const archiveNotification = mutation({
    args: {
        notificationId: v.id("notifications"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const notification = await ctx.db.get(args.notificationId);
        if (!notification) return;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user || notification.userId !== user._id) return;

        await ctx.db.patch(args.notificationId, { isArchived: true });
    },
});

// ─── Internal API (anropas från andra backend-funktioner) ────

/**
 * sendNotification – Skapar en notis till en eller flera användare.
 * Används av t.ex. submitIdea.
 */
export const sendNotification = internalMutation({
    args: {
        userIds: v.array(v.id("users")), // Mottagare
        type: v.string(),
        title: v.string(),
        message: v.string(),
        link: v.string(),
        relatedId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        for (const userId of args.userIds) {
            await ctx.db.insert("notifications", {
                userId,
                type: args.type,
                title: args.title,
                message: args.message,
                link: args.link,
                relatedId: args.relatedId,
                isRead: false,
                isArchived: false,
            });

            // Schemalägg push-notis (om användaren har prenumererat)
            // Vi gör detta asynkront via scheduler för att inte blockera
            await ctx.scheduler.runAfter(0, internal.pushActions.sendPushToUser, {
                userId,
                title: args.title,
                message: args.message,
                link: args.link,
                relatedId: args.relatedId,
            });
        }
    },
});
