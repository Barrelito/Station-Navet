"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import Header from "../components/Header";
import IdeaForm from "../components/IdeaForm";
import PollForm from "../components/PollForm";
import IdeaFeed from "../components/IdeaFeed";
import Link from "next/link";

/**
 * Stationens Dashboard – Huvudsidan
 *
 * Struktur (top → bottom):
 * 1. Sticky Header
 * 2. Välkomstsektion
 * 3. "Ny idé"-knapp + IdeaForm (i collapsible)
 * 4. Torgmötes-flödet (IdeaFeed)
 */
export default function DashboardPage() {
    const currentUser = useQuery(api.users.getCurrentUser);

    // ── State för collapsible IdeaForm ─────────────────────────
    // Förenklad state: "idea" | "poll" | null
    const [isFormOpen, setIsFormOpen] = useState<"idea" | "poll" | null>(null);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* ── 1. Header ──────────────────────────────────────────── */}
            <Header />

            {/* ── Huvudyta ───────────────────────────────────────────── */}
            <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
                {/* ── 2. Välkomstsektion ────────────────────────────────── */}
                <section className="text-center pt-2">
                    <h2 className="text-2xl font-bold text-slate-800">
                        Välkommen! 👋
                    </h2>
                    <p className="text-slate-500 mt-1 text-sm">
                        Vad vill du förbättra på stationen idag?
                    </p>
                </section>

                {/* ── Admin-länk (visas bara för admins) ───────────────── */}
                {currentUser?.role === "admin" && (
                    <Link
                        href="/admin"
                        className="flex items-center justify-between gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3 text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors"
                    >
                        <span>⚙️ Gå till Admin-panelen</span>
                        <span className="text-purple-400">→</span>
                    </Link>
                )}

                {/* ── 3. Ny idé – Collapsible ──────────────────────────── */}
                <section className="space-y-4">
                    {/* Skapa nytt förslag (Alla) */}
                    <div>
                        <button
                            onClick={() => setIsFormOpen(isFormOpen === "idea" ? null : "idea")}
                            className="w-full rounded-2xl border-2 border-dashed border-blue-300
                           bg-gradient-to-r from-blue-50 to-indigo-50
                           px-6 py-5 text-center
                           hover:border-blue-400 hover:from-blue-100 hover:to-indigo-100
                           active:scale-[0.99]
                           transition-all duration-200 group"
                        >
                            <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform duration-200">
                                💡
                            </span>
                            <span className="text-base font-bold text-blue-700">
                                {isFormOpen === "idea" ? "Stäng formuläret" : "Skapa nytt förslag"}
                            </span>
                            <p className="text-xs text-blue-500 mt-0.5">
                                Din idé – stationens framtid
                            </p>
                        </button>

                        <div
                            className={`overflow-hidden transition-all duration-500 ease-in-out ${isFormOpen === "idea"
                                ? "max-h-[2000px] opacity-100 mt-4"
                                : "max-h-0 opacity-0"
                                }`}
                        >
                            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-2">
                                <IdeaForm />
                            </div>
                        </div>
                    </div>

                    {/* Skapa ny omröstning (Endast chefer) */}
                    {["station_manager", "area_manager", "region_manager", "admin"].includes(currentUser?.role || "") && (
                        <div>
                            <button
                                onClick={() => setIsFormOpen(isFormOpen === "poll" ? null : "poll")}
                                className="w-full rounded-2xl border-2 border-dashed border-indigo-300
                               bg-gradient-to-r from-indigo-50 to-purple-50
                               px-6 py-5 text-center
                               hover:border-indigo-400 hover:from-indigo-100 hover:to-purple-100
                               active:scale-[0.99]
                               transition-all duration-200 group"
                            >
                                <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform duration-200">
                                    📊
                                </span>
                                <span className="text-base font-bold text-indigo-700">
                                    {isFormOpen === "poll" ? "Stäng formuläret" : "Skapa ny omröstning"}
                                </span>
                                <p className="text-xs text-indigo-500 mt-0.5">
                                    Starta en omröstning direkt
                                </p>
                            </button>

                            <div
                                className={`overflow-hidden transition-all duration-500 ease-in-out ${isFormOpen === "poll"
                                    ? "max-h-[2000px] opacity-100 mt-4"
                                    : "max-h-0 opacity-0"
                                    }`}
                            >
                                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-2">
                                    <PollForm />
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* ── 4. Flödet ────────────────────────────────────────── */}
                <IdeaFeed />
            </main>

            {/* ── Footer ─────────────────────────────────────────────── */}
            <footer className="max-w-2xl mx-auto px-4 py-8 text-center">
                <p className="text-xs text-slate-300">
                    Station-Navet · Byggt för självledarskap 🚀
                </p>
            </footer>
        </div>
    );
}
