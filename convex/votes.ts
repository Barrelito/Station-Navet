import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Tröskelvärde: antal stöttningar för att nå omröstning ──
const SUPPORT_THRESHOLD = 3;

/**
 * castVote – Lägger en röst (stöd eller skarp) på en idé.
 *
 * Flöde:
 * 1. Auth – verifiera inloggning.
 * 2. Dubbelröstningskontroll – via kompositindexet by_idea_user.
 * 3. Insert – spara rösten.
 * 4. Tröskeln – om tillräckligt med stöd → flytta idén till "voting".
 */
export const castVote = mutation({
    args: {
        ideaId: v.id("ideas"),
        type: v.union(
            v.literal("support"),
            v.literal("yes"),
            v.literal("no"),
        ),
    },
    handler: async (ctx, args) => {
        // ── 1. Autentisering ──────────────────────────────────────
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Du måste vara inloggad för att rösta.");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (!user) {
            throw new Error("Användarprofil saknas. Kontakta admin.");
        }

        // ── 2. Dubbelröstningskontroll ────────────────────────────
        // Kompositindexet by_idea_user ger oss snabb lookup.
        const existingVotes = await ctx.db
            .query("votes")
            .withIndex("by_idea_user", (q) =>
                q.eq("ideaId", args.ideaId).eq("userId", user._id)
            )
            .collect();

        // Validera baserat på typ av röst
        if (args.type === "support") {
            const hasSupported = existingVotes.some((v) => v.type === "support");
            if (hasSupported) {
                throw new Error("Du har redan stöttat denna idé.");
            }
        } else if (args.type === "yes" || args.type === "no") {
            const previousVote = existingVotes.find(
                (v) => v.type === "yes" || v.type === "no"
            );

            if (previousVote) {
                if (previousVote.type === args.type) {
                    // Användaren klickar på samma röst igen -> gör inget (eller ta bort? Vi gör inget nu)
                    return;
                }

                // Ändra röst: Ta bort den gamla, lägg till den nya (eller patcha)
                // Eftersom vi vill ha en "ren" logg kan vi patcha den befintliga.
                await ctx.db.patch(previousVote._id, { type: args.type });
                return; // Klart, vi behöver inte göra en insert nedan
            }
        }

        // ── 2b. Validera att man inte röstar på sin egen idé ──────
        const idea = await ctx.db.get(args.ideaId);
        if (!idea) throw new Error("Idén hittades inte.");

        if (idea.authorId === user._id) {
            throw new Error("Du kan inte rösta på din egen omröstning (eller idé).");
        }

        // ── 3. Spara rösten (om ingen tidigare hittades/ändrades) ──────
        await ctx.db.insert("votes", {
            ideaId: args.ideaId,
            userId: user._id,
            type: args.type,
        });

        // ── 4. Tröskeln: Stöd → Omröstning ───────────────────────
        // Räkna alla 'support'-röster på denna idé (inklusive den nya).
        if (args.type === "support") {
            // (Idea är redan hämtad ovan)

            const allSupportVotes = await ctx.db
                .query("votes")
                .withIndex("by_idea", (q) => q.eq("ideaId", args.ideaId))
                .collect();

            const supportCount = allSupportVotes.filter(
                (v) => v.type === "support"
            ).length;

            // Uppdatera votesCount (denormaliserat för snabb visning)
            await ctx.db.patch(args.ideaId, { votesCount: supportCount });

            // Om tröskeln nås OCH idén fortfarande är i "proposal"-fas
            if (supportCount >= SUPPORT_THRESHOLD && idea.status === "proposal") {
                await ctx.db.patch(args.ideaId, { status: "voting" });
            }
        }
    },
});

/**
 * getVoteStats – Hämtar röstfördelning för en idé (Ja/Nej).
 */
export const getVoteStats = query({
    args: { ideaId: v.id("ideas") },
    handler: async (ctx, args) => {
        const votes = await ctx.db
            .query("votes")
            .withIndex("by_idea", (q) => q.eq("ideaId", args.ideaId))
            .collect();

        const yes = votes.filter((v) => v.type === "yes").length;
        const no = votes.filter((v) => v.type === "no").length;

        return { yes, no, total: yes + no };
    },
});
