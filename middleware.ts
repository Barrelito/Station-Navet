import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Alla routes utom sign-in/sign-up kräver inloggning
const isPublicRoute = createRouteMatcher([
    "/sign-in(.*)",
    "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
        await auth.protect();
    }
});

export const config = {
    matcher: [
        // Skippa Next.js internals och statiska filer
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        // Kör alltid för API-routes
        "/(api|trpc)(.*)",
    ],
};
