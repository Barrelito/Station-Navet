import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════

/**
 * getTaskByIdeaId – Hämtar tasken kopplad till en idé.
 *
 * Joinar in ägarens namn via ownerId → users.name.
 * Returnerar null om ingen task finns (idén är ännu inte plockad).
 */
export const getTaskByIdeaId = query({
    args: { ideaId: v.id("ideas") },
    handler: async (ctx, args) => {
        const task = await ctx.db
            .query("tasks")
            .withIndex("by_idea", (q) => q.eq("ideaId", args.ideaId))
            .first();

        if (!task) return null;

        // Joina in ägarens namn (om en ägare finns)
        let ownerName: string | null = null;
        if (task.ownerId) {
            const owner = await ctx.db.get(task.ownerId);
            ownerName = owner?.name ?? "Okänd";
        }

        return { ...task, ownerName };
    },
});

// ═══════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * claimTask – En medarbetare "räcker upp handen" och tar ansvar.
 *
 * Flöde:
 * 1. Auth → hämta userId.
 * 2. Kolla att idén har status "approved" (kan bara plockas en gång).
 * 3. Skapa en task med ownerId + status "in_progress".
 * 4. Flytta idén till status "workshop".
 */
export const claimTask = mutation({
    args: {
        ideaId: v.id("ideas"),
    },
    handler: async (ctx, args) => {
        // ── 1. Auth ───────────────────────────────────────────────
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Du måste vara inloggad.");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (!user) throw new Error("Användarprofil saknas. Kontakta admin.");

        // ── 2. Validera idéstatus ─────────────────────────────────
        const idea = await ctx.db.get(args.ideaId);
        if (!idea) throw new Error("Idén hittades inte.");

        if (idea.status !== "approved") {
            throw new Error("Denna idé kan bara plockas om den är godkänd.");
        }

        // Kolla att ingen redan plockat denna idé
        const existingTask = await ctx.db
            .query("tasks")
            .withIndex("by_idea", (q) => q.eq("ideaId", args.ideaId))
            .first();

        if (existingTask) {
            throw new Error("Någon har redan tagit ansvar för denna idé.");
        }

        // ── 3. Skapa task ─────────────────────────────────────────
        const taskId = await ctx.db.insert("tasks", {
            ideaId: args.ideaId,
            ownerId: user._id,
            description: idea.title, // Använder idéns titel som task-beskrivning
            status: "in_progress",
            highFives: [],
        });

        // ── 4. Flytta idén till "workshop" ────────────────────────
        await ctx.db.patch(args.ideaId, { status: "workshop" });

        return taskId;
    },
});

/**
 * completeTask – Markera en task som klar.
 *
 * Uppdaterar taskens status → "done" och idéns status → "completed".
 */
export const completeTask = mutation({
    args: {
        taskId: v.id("tasks"),
        completionReport: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Du måste vara inloggad.");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (!user) throw new Error("Användarprofil saknas. Kontakta admin.");

        const task = await ctx.db.get(args.taskId);
        if (!task) throw new Error("Uppgiften hittades inte.");

        if (task.status === "done") {
            throw new Error("Uppgiften är redan markerad som klar.");
        }

        // ── Behörighetskontroll ───────────────────────────────────
        // Endast taskens ägare ELLER en chef/admin får markera som klar.
        const isManager = ["station_manager", "area_manager", "region_manager", "admin"].includes(user.role);
        if (task.ownerId !== user._id && !isManager) {
            throw new Error("Endast den som äger uppgiften kan markera den som klar.");
        }

        if (args.completionReport.trim().length === 0) {
            throw new Error("Du måste skriva en kort rapport om vad du har gjort.");
        }

        // Markera task som klar och spara rapporten
        await ctx.db.patch(args.taskId, {
            status: "done",
            completionReport: args.completionReport
        });

        // Flytta idén till "completed"
        await ctx.db.patch(task.ideaId, { status: "completed" });
    },
});

/**
 * giveHighFive – Ge beröm till den som genomfört uppgiften! 🖐️
 *
 * Lägger till användarens ID i highFives-arrayen.
 * Samma person kan bara ge en high-five per task.
 */
export const giveHighFive = mutation({
    args: {
        taskId: v.id("tasks"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Du måste vara inloggad.");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (!user) throw new Error("Användarprofil saknas. Kontakta admin.");

        const task = await ctx.db.get(args.taskId);
        if (!task) throw new Error("Uppgiften hittades inte.");

        // Kolla att användaren inte redan gett high-five
        if (task.highFives.includes(user._id)) {
            throw new Error("Du har redan gett en high-five! 🖐️");
        }

        // Lägg till high-five
        await ctx.db.patch(args.taskId, {
            highFives: [...task.highFives, user._id],
        });
    },
});
