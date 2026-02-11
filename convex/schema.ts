import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── Användare ───────────────────────────────────────────────
  // Kopplas till Clerk via tokenIdentifier.
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
    station: v.optional(v.string()), // För framtida multi-stations-stöd
  })
    .index("by_token", ["tokenIdentifier"]),

  // ─── Idéer ───────────────────────────────────────────────────
  // Kärnan i flödet: Idé → Intressekoll → Omröstning → Verkstad.
  ideas: defineTable({
    title: v.string(),
    description: v.string(),
    perfectState: v.string(),    // Vision: "Hur ser det ut när det är klart?"
    resourceNeeds: v.string(),   // Vad krävs? Tid/Pengar/Beslut (kan vara JSON-sträng)
    authorId: v.id("users"),     // Relation → users
    status: v.union(
      v.literal("draft"),
      v.literal("proposal"),
      v.literal("voting"),
      v.literal("approved"),
      v.literal("workshop"),
      v.literal("completed"),
      v.literal("archived"),
    ),
    votesCount: v.number(),      // Denormaliserat för snabb sortering
  })
    .index("by_status", ["status"])
    .index("by_author", ["authorId"]),

  // ─── Röster ──────────────────────────────────────────────────
  // Stöd-röster (intressekoll) och skarpa röster (omröstning).
  // Kompositindex by_idea_user förhindrar dubbelröstning per fas.
  votes: defineTable({
    ideaId: v.id("ideas"),       // Relation → ideas
    userId: v.id("users"),       // Relation → users
    type: v.union(
      v.literal("support"),      // Intressekoll-fas
      v.literal("yes"),          // Skarp omröstning
      v.literal("no"),
      v.literal("option_a"),     // Alternativ-röstning
      v.literal("option_b"),
    ),
  })
    .index("by_idea", ["ideaId"])
    .index("by_idea_user", ["ideaId", "userId"]),

  // ─── Kommentarer ─────────────────────────────────────────────
  // Diskussion kopplad till en idé. Typ styr visning/ikon.
  comments: defineTable({
    ideaId: v.id("ideas"),       // Relation → ideas
    userId: v.id("users"),       // Relation → users
    text: v.string(),
    type: v.union(
      v.literal("general"),
      v.literal("warning"),      // "Tänk på att…"
      v.literal("kudos"),        // Beröm / uppmuntran
    ),
  })
    .index("by_idea", ["ideaId"]),

  // ─── Uppgifter (Verkstadsfas) ────────────────────────────────
  // Bryts ut från godkända idéer. Teamet plockar uppgifter fritt.
  tasks: defineTable({
    ideaId: v.id("ideas"),       // Relation → ideas
    ownerId: v.optional(v.id("users")), // Den som räcker upp handen
    description: v.string(),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("done"),
    ),
    highFives: v.array(v.id("users")), // Kollegor som ger beröm 🖐️
  })
    .index("by_idea", ["ideaId"])
    .index("by_owner", ["ownerId"]),
});
