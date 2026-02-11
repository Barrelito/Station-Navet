import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Statuskonstanter som INTE ska visas i feeden ──────────
const HIDDEN_STATUSES = ["draft", "archived"] as const;

/**
 * getIdeas – Hämtar alla synliga idéer, nyaste först.
 *
 * Filtrerar bort "draft" och "archived" – de hör inte hemma
 * i det publika flödet (Torgmötet).
 */
export const getIdeas = query({
    args: {},
    handler: async (ctx) => {
        const allIdeas = await ctx.db
            .query("ideas")
            .order("desc") // Nyaste _creationTime först
            .collect();

        // Filtrera bort dolda statusar
        return allIdeas.filter(
            (idea) => !HIDDEN_STATUSES.includes(idea.status as any)
        );
    },
});

/**
 * submitIdea – Skapar en ny idé kopplad till den inloggade användaren.
 *
 * Flöde:
 * 1. Verifiera att användaren är autentiserad (Clerk).
 * 2. Slå upp den interna user-posten via tokenIdentifier.
 * 3. Spara idén med status "proposal" (redo för stöttning).
 */
export const submitIdea = mutation({
    args: {
        title: v.string(),
        description: v.string(),
        perfectState: v.string(),
        resourceNeeds: v.string(),
    },
    handler: async (ctx, args) => {
        // ── 1. Autentisering ──────────────────────────────────────
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Du måste vara inloggad för att skicka in en idé.");
        }

        // ── 2. Användar-uppslag ───────────────────────────────────
        // Clerk sätter tokenIdentifier, vi använder det för att hitta
        // vår interna user-post (behövs för authorId-relationen).
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) {
            throw new Error("Användarprofil saknas. Kontakta admin.");
        }

        // ── 3. Spara idén ─────────────────────────────────────────
        const ideaId = await ctx.db.insert("ideas", {
            title: args.title,
            description: args.description,
            perfectState: args.perfectState,
            resourceNeeds: args.resourceNeeds,
            authorId: user._id,
            status: "proposal",  // Ny idé → direkt ut till stöttning
            votesCount: 0,
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
