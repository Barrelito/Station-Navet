"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

/**
 * ConvexClientProvider – Kopplar ihop Convex med Clerk-auth.
 *
 * ConvexProviderWithClerk skickar automatiskt Clerk-tokens
 * till Convex-backend, så ctx.auth.getUserIdentity() fungerar.
 */
const convex = new ConvexReactClient(
    process.env.NEXT_PUBLIC_CONVEX_URL as string
);

export default function ConvexClientProvider({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            {children}
        </ConvexProviderWithClerk>
    );
}
