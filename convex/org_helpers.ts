import { GenericQueryCtx } from "convex/server";
import { DataModel, Id } from "./_generated/dataModel";

type QueryCtx = GenericQueryCtx<DataModel>;

export type Organization = {
    _id: Id<"organizations">;
    _creationTime: number;
    type: "region" | "area" | "station";
    name: string;
    parentId?: Id<"organizations">;
};

/**
 * Hämtar området (area) som en station tillhör.
 * @param ctx - Convex QueryCtx
 * @param stationName - Stationens namn
 * @returns Områdets namn eller null
 */
export async function getStationArea(ctx: QueryCtx, stationName: string): Promise<string | null> {
    const station = await ctx.db
        .query("organizations")
        .withIndex("by_type", (q) => q.eq("type", "station"))
        .filter((q) => q.eq(q.field("name"), stationName))
        .first();

    if (!station || !station.parentId) return null;

    const area = await ctx.db.get(station.parentId);
    return area?.name || null;
}

/**
 * Hämtar regionen som en station tillhör.
 * @param ctx - Convex QueryCtx
 * @param stationName - Stationens namn
 * @returns Regionens namn eller null
 */
export async function getRegion(ctx: QueryCtx, stationName: string): Promise<string | null> {
    const station = await ctx.db
        .query("organizations")
        .withIndex("by_type", (q) => q.eq("type", "station"))
        .filter((q) => q.eq(q.field("name"), stationName))
        .first();

    if (!station || !station.parentId) return null;

    const area = await ctx.db.get(station.parentId);
    if (!area || !area.parentId) return null;

    const region = await ctx.db.get(area.parentId);
    return region?.name || null;
}

/**
 * Hämtar alla stationer i systemet.
 * @param ctx - Convex QueryCtx
 * @returns Array med alla stationsnamn
 */
export async function getAllStations(ctx: QueryCtx): Promise<string[]> {
    const stations = await ctx.db
        .query("organizations")
        .withIndex("by_type", (q) => q.eq("type", "station"))
        .collect();
    return stations.map((s) => s.name);
}

/**
 * Hämtar alla områden i systemet.
 * @param ctx - Convex QueryCtx
 * @returns Array med alla områdesnamn
 */
export async function getAllAreas(ctx: QueryCtx): Promise<string[]> {
    const areas = await ctx.db
        .query("organizations")
        .withIndex("by_type", (q) => q.eq("type", "area"))
        .collect();
    return areas.map((a) => a.name);
}

/**
 * Hämtar alla regioner i systemet.
 * @param ctx - Convex QueryCtx
 * @returns Array med alla regionnamn
 */
export async function getAllRegions(ctx: QueryCtx): Promise<string[]> {
    const regions = await ctx.db
        .query("organizations")
        .withIndex("by_type", (q) => q.eq("type", "region"))
        .collect();
    return regions.map((r) => r.name);
}

/**
 * Hämtar alla stationer inom ett område.
 * @param ctx - Convex QueryCtx
 * @param areaName - Områdets namn
 * @returns Array med stationer i området
 */
export async function getStationsInArea(ctx: QueryCtx, areaName: string): Promise<string[]> {
    const area = await ctx.db
        .query("organizations")
        .withIndex("by_type", (q) => q.eq("type", "area"))
        .filter((q) => q.eq(q.field("name"), areaName))
        .first();

    if (!area) return [];

    const stations = await ctx.db
        .query("organizations")
        .withIndex("by_parent", (q) => q.eq("parentId", area._id))
        .filter((q) => q.eq(q.field("type"), "station"))
        .collect();

    return stations.map((s) => s.name);
}

/**
 * getAllStationsInRegion – Returnerar alla stationer inom en region.
 *
 * @param ctx - Convex QueryCtx
 * @param regionName - Namnet på regionen (t.ex. "Nord")
 * @returns Array med alla stationsnamn i regionen
 */
export async function getAllStationsInRegion(ctx: QueryCtx, regionName: string): Promise<string[]> {
    const region = await ctx.db
        .query("organizations")
        .withIndex("by_type", (q) => q.eq("type", "region"))
        .filter((q) => q.eq(q.field("name"), regionName))
        .first();

    if (!region) return [];

    const areas = await ctx.db
        .query("organizations")
        .withIndex("by_parent", (q) => q.eq("parentId", region._id))
        .filter((q) => q.eq(q.field("type"), "area"))
        .collect();

    let stations: string[] = [];
    for (const area of areas) {
        const areaStations = await ctx.db
            .query("organizations")
            .withIndex("by_parent", (q) => q.eq("parentId", area._id))
            .filter((q) => q.eq(q.field("type"), "station"))
            .collect();
        stations.push(...areaStations.map((s) => s.name));
    }

    return stations;
}

/**
 * getAllAreasInRegion – Returnerar alla stationsområden inom en region.
 *
 * @param ctx - Convex QueryCtx
 * @param regionName - Namnet på regionen (t.ex. "Nord")
 * @returns Array med alla områdesnamn i regionen
 */
export async function getAllAreasInRegion(ctx: QueryCtx, regionName: string): Promise<string[]> {
    const region = await ctx.db
        .query("organizations")
        .withIndex("by_type", (q) => q.eq("type", "region"))
        .filter((q) => q.eq(q.field("name"), regionName))
        .first();

    if (!region) return [];

    const areas = await ctx.db
        .query("organizations")
        .withIndex("by_parent", (q) => q.eq("parentId", region._id))
        .filter((q) => q.eq(q.field("type"), "area"))
        .collect();

    return areas.map((a) => a.name);
}
