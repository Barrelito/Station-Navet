import { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { DataModel, Id } from "./_generated/dataModel";

type AnyCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

// ─── Auth ──────────────────────────────────────────────────────

/**
 * requireAdmin – Verifierar att inloggad användare är admin.
 * Kastar fel om ej admin.
 */
export async function requireAdmin(ctx: AnyCtx) {
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

// ─── Notifieringar ─────────────────────────────────────────────

/**
 * getUsersToNotify – Returnerar user-IDs för alla i ett givet scope/targetAudience.
 * Exkluderar avsändaren (excludeUserId).
 *
 * Optimerad: hämtar hela org-strukturen i förväg och bygger lokala lookup-tabeller
 * för att undvika N+1 queries.
 */
export async function getUsersToNotify(
    ctx: AnyCtx,
    scope: "station" | "area" | "region",
    targetAudience: string,
    excludeUserId: string
): Promise<Id<"users">[]> {
    // Hämta alla organisationer och bygger lookup-tabeller lokalt
    const orgs = await ctx.db.query("organizations").collect();

    // Bygg station → area-mapping och station → region-mapping
    const stationToArea = new Map<string, string>();
    const stationToRegion = new Map<string, string>();
    const areaToRegion = new Map<string, string>();

    const stations = orgs.filter((o) => o.type === "station");
    const areas = orgs.filter((o) => o.type === "area");
    const regions = orgs.filter((o) => o.type === "region");

    // area → region
    for (const area of areas) {
        if (area.parentId) {
            const region = regions.find((r) => r._id === area.parentId);
            if (region) areaToRegion.set(area.name, region.name);
        }
    }

    // station → area + region
    for (const station of stations) {
        if (station.parentId) {
            const area = areas.find((a) => a._id === station.parentId);
            if (area) {
                stationToArea.set(station.name, area.name);
                const region = areaToRegion.get(area.name);
                if (region) stationToRegion.set(station.name, region);
            }
        }
    }

    // Hämta alla användare och filtrera med de lokala lookup-tabellerna
    const allUsers = await ctx.db.query("users").collect();
    const result: Id<"users">[] = [];

    for (const u of allUsers) {
        if (u._id === excludeUserId) continue;
        const uStation = u.station || "";
        const uArea = stationToArea.get(uStation) ?? u.area ?? null;
        const uRegion = stationToRegion.get(uStation) ?? u.region ?? null;

        if (scope === "station" && uStation === targetAudience) {
            result.push(u._id);
        } else if (scope === "area" && uArea === targetAudience) {
            result.push(u._id);
        } else if (scope === "region" && uRegion === targetAudience) {
            result.push(u._id);
        }
    }

    return result;
}
