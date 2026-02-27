/**
 * Helper-funktioner för organisationsstruktur i Station-Navet
 *
 * Dessa funktioner tar emot hela listan av organisationer 
 * från databasen och utför sökningar lokalt.
 */

// Denna typ ska matcha vad som returneras från api.organizations.getOrganizations
export type Organization = {
    _id: string; // Id<"organizations"> i convex
    type: "region" | "area" | "station";
    name: string;
    parentId?: string;
};

export type Station = string;
export type Area = string;
export type Region = string;

/**
 * Hämtar området (area) som en station tillhör.
 * @param organizations - Listan av alla organisationer
 * @param stationName - Stationens namn
 * @returns Områdets namn eller null
 */
export function getStationArea(organizations: Organization[], stationName: Station): Area | null {
    const station = organizations.find((o) => o.type === "station" && o.name === stationName);
    if (!station || !station.parentId) return null;

    const area = organizations.find((o) => o._id === station.parentId);
    return area?.name || null;
}

/**
 * Hämtar regionen som en station tillhör.
 * @param organizations - Listan av alla organisationer
 * @param stationName - Stationens namn
 * @returns Regionens namn eller null
 */
export function getRegion(organizations: Organization[], stationName: Station): Region | null {
    const station = organizations.find((o) => o.type === "station" && o.name === stationName);
    if (!station || !station.parentId) return null;

    const area = organizations.find((o) => o._id === station.parentId);
    if (!area || !area.parentId) return null;

    const region = organizations.find((o) => o._id === area.parentId);
    return region?.name || null;
}

/**
 * Hämtar alla stationer i systemet.
 * @param organizations - Listan av alla organisationer
 * @returns Array med alla stationsnamn
 */
export function getAllStations(organizations: Organization[]): Station[] {
    return organizations.filter((o) => o.type === "station").map((o) => o.name);
}

/**
 * Hämtar alla områden i systemet.
 * @param organizations - Listan av alla organisationer
 * @returns Array med alla områdesnamn
 */
export function getAllAreas(organizations: Organization[]): Area[] {
    return organizations.filter((o) => o.type === "area").map((o) => o.name);
}

/**
 * Hämtar alla regioner i systemet.
 * @param organizations - Listan av alla organisationer
 * @returns Array med alla regionnamn
 */
export function getAllRegions(organizations: Organization[]): Region[] {
    return organizations.filter((o) => o.type === "region").map((o) => o.name);
}

/**
 * Hämtar alla stationer inom ett område.
 * @param organizations - Listan av alla organisationer
 * @param areaName - Områdets namn
 * @returns Array med stationer i området, eller tom array om området inte hittas
 */
export function getStationsInArea(organizations: Organization[], areaName: Area): Station[] {
    const area = organizations.find((o) => o.type === "area" && o.name === areaName);
    if (!area) return [];

    return organizations
        .filter((o) => o.type === "station" && o.parentId === area._id)
        .map((o) => o.name);
}

/**
 * Validerar om en station existerar i systemet.
 * @param organizations - Listan av alla organisationer
 * @param stationName - Stationens namn
 * @returns true om stationen finns, annars false
 */
export function isValidStation(organizations: Organization[], stationName: Station): boolean {
    return organizations.some((o) => o.type === "station" && o.name === stationName);
}

/**
 * Validerar om ett område existerar i systemet.
 * @param organizations - Listan av alla organisationer
 * @param areaName - Områdets namn
 * @returns true om området finns, annars false
 */
export function isValidArea(organizations: Organization[], areaName: Area): boolean {
    return organizations.some((o) => o.type === "area" && o.name === areaName);
}

/**
 * Validerar om en region existerar i systemet.
 * @param organizations - Listan av alla organisationer
 * @param regionName - Regionens namn
 * @returns true om regionen finns, annars false
 */
export function isValidRegion(organizations: Organization[], regionName: Region): boolean {
    return organizations.some((o) => o.type === "region" && o.name === regionName);
}

/**
 * getAllStationsInRegion – Returnerar alla stationer inom en region.
 *
 * @param organizations - Listan av alla organisationer
 * @param regionName - Namnet på regionen (t.ex. "Nord")
 * @returns Array med alla stationsnamn i regionen
 */
export function getAllStationsInRegion(organizations: Organization[], regionName: string): string[] {
    const region = organizations.find((o) => o.type === "region" && o.name === regionName);
    if (!region) return [];

    const areas = organizations.filter((o) => o.type === "area" && o.parentId === region._id);
    const areaIds = areas.map((a) => a._id);

    return organizations
        .filter((o) => o.type === "station" && o.parentId && areaIds.includes(o.parentId))
        .map((o) => o.name);
}

/**
 * getAllAreasInRegion – Returnerar alla stationsområden inom en region.
 *
 * @param organizations - Listan av alla organisationer
 * @param regionName - Namnet på regionen (t.ex. "Nord")
 * @returns Array med alla områdesnamn i regionen
 */
export function getAllAreasInRegion(organizations: Organization[], regionName: string): string[] {
    const region = organizations.find((o) => o.type === "region" && o.name === regionName);
    if (!region) return [];

    return organizations
        .filter((o) => o.type === "area" && o.parentId === region._id)
        .map((o) => o.name);
}

/**
 * Bygger en trädstruktur baserat på den platta organisationen.
 */
export interface StationStructure {
    name: string;
}

export interface AreaStructure {
    name: string;
    stations: StationStructure[];
}

export interface RegionStructure {
    name: string;
    areas: AreaStructure[];
}

export function buildOrgTree(organizations: Organization[]): RegionStructure[] {
    const regions = organizations.filter((o) => o.type === "region");

    return regions.map((region) => {
        const areas = organizations.filter((o) => o.type === "area" && o.parentId === region._id);

        return {
            name: region.name,
            areas: areas.map((area) => {
                const stations = organizations.filter((o) => o.type === "station" && o.parentId === area._id);

                return {
                    name: area.name,
                    stations: stations.map((s) => ({ name: s.name })),
                };
            }),
        };
    });
}

