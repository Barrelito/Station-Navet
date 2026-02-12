import { mutation } from "./_generated/server";
import { orgStructure } from "../lib/org-structure";

/**
 * seedOrganizations – Migrera hårdkodad org-struktur till databas.
 * 
 * Körs EN GÅNG för att populera organizations-tabellen.
 * Efter detta kan strukturen hanteras via admin-gränssnittet.
 */
export const seedOrganizations = mutation({
    args: {},
    handler: async (ctx) => {
        // Kolla om redan seedat
        const existing = await ctx.db.query("organizations").first();
        if (existing) {
            throw new Error("Organizations redan seedade. Kör inte denna migration igen.");
        }

        // Iterera genom regioner
        for (const region of orgStructure) {
            // Skapa region
            const regionId = await ctx.db.insert("organizations", {
                type: "region",
                name: region.name,
            });

            // Skapa områden inom regionen
            for (const area of region.areas) {
                const areaId = await ctx.db.insert("organizations", {
                    type: "area",
                    name: area.name,
                    parentId: regionId,
                });

                // Skapa stationer inom området
                for (const station of area.stations) {
                    await ctx.db.insert("organizations", {
                        type: "station",
                        name: station,
                        parentId: areaId,
                    });
                }
            }
        }

        return { success: true, message: "Organizations seedade framgångsrikt!" };
    },
});
