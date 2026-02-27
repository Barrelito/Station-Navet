"use client";

import { useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import StationSelector from "./StationSelector";
import NotificationBell from "./NotificationBell";
import Link from "next/link";

/**
 * Header – Sticky app-header i "native app"-stil.
 *
 * Vänster: Logga + "Station-Navet"
 * Höger:   Clerk UserButton (avatar + meny)
 *
 * Glasmorfism-effekt med backdrop-blur för modern känsla.
 */
export default function Header() {
    const { isAuthenticated } = useConvexAuth();
    const ensureUser = useMutation(api.users.ensureUserExists);

    // Skapa user-post vid första inloggningen, men bara om vi är autentiserade
    useEffect(() => {
        if (isAuthenticated) {
            ensureUser().catch((err) => {
                // Ignorera fel om användaren inte är inloggad
                if (!err.message?.includes("Inte inloggad")) {
                    console.error("Kunde inte skapa användare:", err);
                }
            });
        }
    }, [ensureUser, isAuthenticated]);

    return (
        <>
            {/* StationSelector visas automatiskt om användaren saknar station */}
            <StationSelector />

            <header
                className="sticky top-0 z-50 w-full border-b border-slate-200/60
                     bg-white/80 backdrop-blur-lg"
            >
                <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
                    {/* ── Vänster: Logga + Titel ────────────────────────── */}
                    <div className="flex items-center gap-3">
                        <div
                            className="flex items-center justify-center w-9 h-9 rounded-xl
                        bg-gradient-to-br from-blue-500 to-indigo-600
                        shadow-md shadow-blue-200"
                        >
                            <span className="text-lg">🚑</span>
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-slate-800 leading-tight tracking-tight">
                                Station-Navet
                            </h1>
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                                Självledarskap
                            </p>
                        </div>
                    </div>

                    {/* ── Höger: Notiser + Historik + Clerk UserButton ──────────────────────── */}
                    <div className="flex items-center gap-3">
                        <Link
                            href="/history"
                            className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100/50 hover:bg-slate-100 text-slate-600 transition-colors"
                            title="Historik"
                        >
                            <span className="text-lg">🗄️</span>
                        </Link>

                        <NotificationBell />

                        <UserButton
                            afterSignOutUrl="/sign-in"
                            appearance={{
                                elements: {
                                    avatarBox: "w-9 h-9",
                                },
                            }}
                        />
                    </div>
                </div>
            </header>
        </>
    );
}
