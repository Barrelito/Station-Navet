import { query, mutation, QueryCtx } from "./_generated/server";
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
 * isAdmin – Kontrollerar om inloggad användare är admin.
 */
export const isAdmin = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return false;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        return user?.role === "admin";
    },
});

/**
 * getAllUsers – Hämtar alla användare med org-info.
 */
export const getAllUsers = query({
    args: {},
    handler: async (ctx) => {
        await requireAdmin(ctx);

        const users = await ctx.db.query("users").collect();

        // Berika med stationsinfo (om station finns i DB)
        const enrichedUsers = await Promise.all(
            users.map(async (user) => {
                if (!user.station) return { ...user, stationInfo: null };

                // Hitta station i organizations
                const stationOrg = await ctx.db
                    .query("organizations")
                    .filter((q) =>
                        q.and(
                            q.eq(q.field("type"), "station"),
                            q.eq(q.field("name"), user.station)
                        )
                    )
                    .first();

                if (!stationOrg || !stationOrg.parentId) {
                    return { ...user, stationInfo: null };
                }

                // Hitta område
                const areaOrg = await ctx.db.get(stationOrg.parentId);
                if (!areaOrg || !areaOrg.parentId) {
                    return { ...user, stationInfo: { area: null, region: null } };
                }

                // Hitta region
                const regionOrg = await ctx.db.get(areaOrg.parentId);

                return {
                    ...user,
                    stationInfo: {
                        area: areaOrg.name,
                        region: regionOrg?.name || null,
                    },
                };
            })
        );

        return enrichedUsers;
    },
});

// ─── Mutations ───────────────────────────────────────────────

/**
 * updateUserRole – Uppdaterar en användares roll.
 */
export const updateUserRole = mutation({
    args: {
        userId: v.id("users"),
        role: v.union(
            v.literal("user"),
            v.literal("station_manager"),
            v.literal("area_manager"),
            v.literal("region_manager"),
            v.literal("admin")
        ),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        await ctx.db.patch(args.userId, {
            role: args.role,
        });

        return args.userId;
    },
});

/**
 * updateUserStation – Uppdaterar en användares station.
 */
export const updateUserStation = mutation({
    args: {
        userId: v.id("users"),
        stationName: v.string(),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        // Validera att stationen finns
        const station = await ctx.db
            .query("organizations")
            .filter((q) =>
                q.and(
                    q.eq(q.field("type"), "station"),
                    q.eq(q.field("name"), args.stationName)
                )
            )
            .first();

        if (!station) {
            throw new Error(`Station "${args.stationName}" hittades inte.`);
        }

        await ctx.db.patch(args.userId, {
            station: args.stationName,
        });

        return args.userId;
    },
});
