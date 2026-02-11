/**
 * Convex Auth Config
 *
 * Talar om för Convex att lita på JWT-tokens från Clerk.
 * domain-värdet hämtas från CLERK_JWT_ISSUER_DOMAIN env-variabeln.
 */
export default {
    providers: [
        {
            domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
            applicationID: "convex",
        },
    ],
};
