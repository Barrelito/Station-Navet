import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ─── Schema för Station-Navet ───────────────────────────────
export default defineSchema({
  // ─── Users ────────────────────────────────────────────────
  // Kopplas till Clerk via tokenIdentifier.
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("user"),
      v.literal("station_manager"),
      v.literal("area_manager"),
      v.literal("region_manager"),
      v.literal("admin") // Full system access
    ),
    station: v.optional(v.string()), // Optional - tom vid första inloggning
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_station", ["station"]),

  // ─── Organizations ────────────────────────────────────────
  organizations: defineTable({
    type: v.union(
      v.literal("region"),
      v.literal("area"),
      v.literal("station")
    ),
    name: v.string(),
    parentId: v.optional(v.id("organizations")), // null för regions
  })
    .index("by_type", ["type"])
    .index("by_parent", ["parentId"]),

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
    targetAudience: v.string(),  // T.ex. "Norrtälje", "Roslagen", "Nord"
    scope: v.union(
      v.literal("station"),      // Station-nivå
      v.literal("area"),          // Stationsområde-nivå
      v.literal("region"),        // Region-nivå
    ),
  })
    .index("by_status", ["status"])
    .index("by_author", ["authorId"])
    .index("by_target", ["targetAudience"]),

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
