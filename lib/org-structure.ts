/**
 * Organisationsstruktur för Station-Navet
 * 
 * Hierarki: Region > Stationsområde > Station
 * 
 * Hårdkodad struktur (tills vidare) för att möjliggöra
 * hierarkisk multi-tenancy och "nedåtarv" av idéer.
 */

export type Station = string;
export type Area = string;
export type Region = string;

export interface AreaStructure {
    name: Area;
    stations: Station[];
}

export interface RegionStructure {
    name: Region;
    areas: AreaStructure[];
}

// ─── Organisationsstruktur ──────────────────────────────────
export const orgStructure: RegionStructure[] = [
    {
        name: "Nord",
        areas: [
            {
                name: "Roslagen",
                stations: ["Norrtälje", "Rimbo", "Hallstavik"],
            },
            {
                name: "City",
                stations: ["Södermalm", "Solna"],
            },
        ],
    },
];

// ─── Helper-funktioner ──────────────────────────────────────

/**
 * Hämtar området (area) som en station tillhör.
 * @param station - Stationens namn
 * @returns Området eller null om stationen inte hittas
 */
export function getStationArea(station: Station): Area | null {
    for (const region of orgStructure) {
        for (const area of region.areas) {
            if (area.stations.includes(station)) {
                return area.name;
            }
        }
    }
    return null;
}

/**
 * Hämtar regionen som en station tillhör.
 * @param station - Stationens namn
 * @returns Regionen eller null om stationen inte hittas
 */
export function getRegion(station: Station): Region | null {
    for (const region of orgStructure) {
        for (const area of region.areas) {
            if (area.stations.includes(station)) {
                return region.name;
            }
        }
    }
    return null;
}

/**
 * Hämtar alla stationer i systemet.
 * @returns Array med alla stationsnamn
 */
export function getAllStations(): Station[] {
    const stations: Station[] = [];
    for (const region of orgStructure) {
        for (const area of region.areas) {
            stations.push(...area.stations);
        }
    }
    return stations;
}

/**
 * Hämtar alla områden i systemet.
 * @returns Array med alla områdesnamn
 */
export function getAllAreas(): Area[] {
    const areas: Area[] = [];
    for (const region of orgStructure) {
        for (const area of region.areas) {
            areas.push(area.name);
        }
    }
    return areas;
}

/**
 * Hämtar alla regioner i systemet.
 * @returns Array med alla regionnamn
 */
export function getAllRegions(): Region[] {
    return orgStructure.map((region) => region.name);
}

/**
 * Hämtar alla stationer inom ett område.
 * @param areaName - Områdets namn
 * @returns Array med stationer i området, eller tom array om området inte hittas
 */
export function getStationsInArea(areaName: Area): Station[] {
    for (const region of orgStructure) {
        for (const area of region.areas) {
            if (area.name === areaName) {
                return area.stations;
            }
        }
    }
    return [];
}

/**
 * Hämtar alla områden inom en region.
 * @param regionName - Regionens namn
 * @returns Array med områden i regionen, eller tom array om regionen inte hittas
 */
export function getAreasInRegion(regionName: Region): AreaStructure[] {
    const region = orgStructure.find((r) => r.name === regionName);
    return region ? region.areas : [];
}

/**
 * Validerar om en station existerar i systemet.
 * @param station - Stationens namn
 * @returns true om stationen finns, annars false
 */
export function isValidStation(station: Station): boolean {
    return getAllStations().includes(station);
}

/**
 * Validerar om ett område existerar i systemet.
 * @param area - Områdets namn
 * @returns true om området finns, annars false
 */
export function isValidArea(area: Area): boolean {
    return getAllAreas().includes(area);
}

/**
 * Validerar om en region existerar i systemet.
 * @param region - Regionens namn
 * @returns true om regionen finns, annars false
 */
export function isValidRegion(region: Region): boolean {
    return getAllRegions().includes(region);
}

/**
 * getAllStationsInRegion – Returnerar alla stationer inom en region.
 * 
 * @param region - Namnet på regionen (t.ex. "Nord")
 * @returns Array med alla stationsnamn i regionen
 */
export function getAllStationsInRegion(region: string): string[] {
    const regionData = orgStructure.find((r) => r.name === region);
    if (!regionData) return [];

    return regionData.areas.flatMap((area) => area.stations);
}

/**
 * getAllAreasInRegion – Returnerar alla stationsområden inom en region.
 * 
 * @param region - Namnet på regionen (t.ex. "Nord")
 * @returns Array med alla områdesnamn i regionen
 */
export function getAllAreasInRegion(region: string): string[] {
    const regionData = orgStructure.find((r) => r.name === region);
    if (!regionData) return [];

    return regionData.areas.map((area) => area.name);
}

