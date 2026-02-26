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

export const migratePolls = mutation({
    args: {},
    handler: async (ctx) => {
        // Hämta alla idéer
        const allIdeas = await ctx.db.query("ideas").collect();
        let count = 0;

        for (const idea of allIdeas) {
            // Om type redan är satt, bry oss inte
            if (idea.type !== undefined) continue;

            // Enkel heuristic:
            // Om den var i voting direkt (eller vi gissar utifrån status),
            // men för att vara helt säkra: Omröstningar gjorda av chefer går direkt till "voting" 
            // vilket innebär att de ofta har votesCount 0 till en början när de är nyskapta, men
            // enklast är att man kollar om votesCount < 3 men status är voting/approved/completed
            // ELLER om den bara har status voting/completed/osv.
            // Låt oss säga att om den saknar perfectState och resourceNeeds OCH är voting -> poll.
            if (idea.status === "voting" && idea.votesCount < 3) {
                await ctx.db.patch(idea._id, { type: "poll" });
                count++;
            } else {
                await ctx.db.patch(idea._id, { type: "idea" });
            }
        }
        return `Migrerade ${count} gamla inlägg till polls, och resten till ideas (explicit).`;
    }
});
