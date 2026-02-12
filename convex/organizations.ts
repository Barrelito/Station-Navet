import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Helper: Kontrollera om användaren är admin ────────────
async function requireAdmin(ctx: any) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error("Du måste vara inloggad.");
    }

    const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .unique();

    if (!user || user.role !== "admin") {
        throw new Error("Endast administratörer har tillgång till denna funktion.");
    }

    return user;
}

// ─── Queries ─────────────────────────────────────────────────

/**
 * getOrganizations – Hämtar hela organisationsträdet.
 */
export const getOrganizations = query({
    args: {},
    handler: async (ctx) => {
        const all = await ctx.db.query("organizations").collect();
        return all;
    },
});

/**
 * getRegions – Hämtar alla regioner.
 */
export const getRegions = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("organizations")
            .withIndex("by_type", (q) => q.eq("type", "region"))
            .collect();
    },
});

/**
 * getAreas – Hämtar områden inom en region.
 */
export const getAreas = query({
    args: { regionId: v.id("organizations") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("organizations")
            .withIndex("by_parent", (q) => q.eq("parentId", args.regionId))
            .filter((q) => q.eq(q.field("type"), "area"))
            .collect();
    },
});

/**
 * getStations – Hämtar stationer inom ett område.
 */
export const getStations = query({
    args: { areaId: v.id("organizations") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("organizations")
            .withIndex("by_parent", (q) => q.eq("parentId", args.areaId))
            .filter((q) => q.eq(q.field("type"), "station"))
            .collect();
    },
});

// ─── Mutations ───────────────────────────────────────────────

/**
 * createOrganization – Skapar region/område/station.
 */
export const createOrganization = mutation({
    args: {
        type: v.union(v.literal("region"), v.literal("area"), v.literal("station")),
        name: v.string(),
        parentId: v.optional(v.id("organizations")),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        // Validera att parent finns om det är area/station
        if (args.parentId) {
            const parent = await ctx.db.get(args.parentId);
            if (!parent) {
                throw new Error("Parent organization hittades inte.");
            }

            // Validera hierarki
            if (args.type === "area" && parent.type !== "region") {
                throw new Error("Områden måste tillhöra en region.");
            }
            if (args.type === "station" && parent.type !== "area") {
                throw new Error("Stationer måste tillhöra ett område.");
            }
        } else if (args.type !== "region") {
            throw new Error("Endast regioner kan sakna parent.");
        }

        const id = await ctx.db.insert("organizations", {
            type: args.type,
            name: args.name,
            parentId: args.parentId,
        });

        return id;
    },
});

/**
 * updateOrganization – Uppdaterar namn på organization.
 */
export const updateOrganization = mutation({
    args: {
        id: v.id("organizations"),
        name: v.string(),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        await ctx.db.patch(args.id, {
            name: args.name,
        });

        return args.id;
    },
});

/**
 * deleteOrganization – Tar bort organization (cascade delete children).
 */
export const deleteOrganization = mutation({
    args: {
        id: v.id("organizations"),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const org = await ctx.db.get(args.id);
        if (!org) {
            throw new Error("Organization hittades inte.");
        }

        // Kolla om det finns användare tilldelade (för stationer)
        if (org.type === "station") {
            const usersAtStation = await ctx.db
                .query("users")
                .withIndex("by_station", (q) => q.eq("station", org.name))
                .first();

            if (usersAtStation) {
                throw new Error(
                    `Kan inte ta bort station "${org.name}" - det finns användare tilldelade. Flytta användarna först.`
                );
            }
        }

        // Cascade delete: ta bort alla barn först (rekursivt)
        async function deleteWithChildren(id: any) {
            const children = await ctx.db
                .query("organizations")
                .withIndex("by_parent", (q) => q.eq("parentId", id))
                .collect();

            for (const child of children) {
                await deleteWithChildren(child._id);
            }

            await ctx.db.delete(id);
        }

        await deleteWithChildren(args.id);

        return { success: true };
    },
});
