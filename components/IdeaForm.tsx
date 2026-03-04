"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { getStationArea, getRegion, getStationsInArea } from "../lib/org-structure";

/**
 * IdeaForm – "Idé-dumpen"
 *
 * Ett coachande formulär i tre steg som hjälper medarbetaren
 * att gå från problem → vision → resursbehov.
 *
 * Mobile First · Tailwind CSS · Shadcn UI-tänk
 */
export default function IdeaForm() {
    // ── Hämta current user & orgs ─────────────────────────────────────
    const currentUser = useQuery(api.users.getCurrentUser);
    const organizations = useQuery(api.organizations.getOrganizations);

    // ── Formulärstate ───────────────────────────────────────────
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [perfectState, setPerfectState] = useState("");
    const [resourceNeeds, setResourceNeeds] = useState("");

    // ── Nytt: targetAudience state ──────────────────────────────
    // Default till användarens station när den laddats
    const [targetAudience, setTargetAudience] = useState<string>("");

    // ── Mutations & UI-state ────────────────────────────────────
    const submitIdea = useMutation(api.ideas.submitIdea);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // ── Submit-handler ──────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Sätt default targetAudience baserat på roll
            let finalTargetAudience = targetAudience || currentUser?.station || "";

            // För area_manager: default till område
            if (currentUser?.role === "area_manager" && !targetAudience) {
                const area = getStationArea(organizations || [], currentUser.station || "");
                finalTargetAudience = area || currentUser.station || "";
            }

            // För region_manager: default till region
            if (currentUser?.role === "region_manager" && !targetAudience) {
                const region = getRegion(organizations || [], currentUser.station || "");
                finalTargetAudience = region || currentUser.station || "";
            }

            await submitIdea({
                title,
                description,
                perfectState,
                resourceNeeds,
                targetAudience: finalTargetAudience,
            });

            // Rensa formuläret
            setTitle("");
            setDescription("");
            setPerfectState("");
            setResourceNeeds("");
            if (currentUser?.station) {
                setTargetAudience(currentUser.station); // Reset till default
            }

            // Visa success
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 5000);
        } catch (error) {
            console.error("Kunde inte skicka idé:", error);
            alert("Något gick fel. Försök igen!");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (organizations === undefined) {
        return (
            <div className="w-full max-w-2xl mx-auto px-4 py-12 text-center">
                <p className="text-slate-400 mt-6 text-sm">Laddar formulär...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto px-4 py-8">
            {/* ── Success-meddelande ──────────────────────────────── */}
            {showSuccess && (
                <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center animate-in fade-in slide-in-from-top-2 duration-300">
                    <span className="text-2xl block mb-2">🎉</span>
                    <p className="text-emerald-800 font-semibold text-lg">
                        Snyggt! Din idé är nu ute på stationen för stöttning.
                    </p>
                    <p className="text-emerald-600 text-sm mt-1">
                        Dina kollegor kan nu visa sitt intresse.
                    </p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* ── Sektion 1: Gnistan ────────────────────────────── */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-2xl">💡</span>
                        <h2 className="text-xl font-bold text-slate-800">
                            Vad är din gnista?
                        </h2>
                    </div>
                    <p className="text-sm text-slate-500 -mt-2">
                        Beskriv kort vad du ser eller vill ändra på stationen.
                    </p>

                    {/* Titel */}
                    <div className="space-y-2">
                        <label htmlFor="title" className="text-sm font-medium text-slate-700">
                            Rubrik
                        </label>
                        <input
                            id="title"
                            type="text"
                            required
                            placeholder="T.ex. 'Bättre rutin för lämning av utrustning'"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={isSubmitting}
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm
                         placeholder:text-slate-400 focus:outline-none focus:ring-2
                         focus:ring-blue-500 focus:border-transparent
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200"
                        />
                    </div>

                    {/* Beskrivning */}
                    <div className="space-y-2">
                        <label htmlFor="description" className="text-sm font-medium text-slate-700">
                            Beskriv idén
                        </label>
                        <textarea
                            id="description"
                            required
                            rows={4}
                            placeholder="Vad har du observerat? Vad vill du förändra?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={isSubmitting}
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm
                         placeholder:text-slate-400 focus:outline-none focus:ring-2
                         focus:ring-blue-500 focus:border-transparent resize-none
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200"
                        />
                    </div>
                </div>

                {/* ── Sektion 2: Målbilden ─────────────────────────── */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-2xl">🎯</span>
                        <h2 className="text-xl font-bold text-slate-800">
                            Målbilden
                        </h2>
                    </div>
                    <p className="text-sm text-slate-500 -mt-2">
                        <em>Coaching:</em> Lämna problemet. Om detta vore perfekt löst imorgon
                        – hur ser det ut då?
                    </p>

                    <div className="space-y-2">
                        <label htmlFor="perfectState" className="text-sm font-medium text-slate-700">
                            Den perfekta bilden
                        </label>
                        <textarea
                            id="perfectState"
                            required
                            rows={4}
                            placeholder="Beskriv framtiden – hur funkar det när allt är på plats?"
                            value={perfectState}
                            onChange={(e) => setPerfectState(e.target.value)}
                            disabled={isSubmitting}
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm
                         placeholder:text-slate-400 focus:outline-none focus:ring-2
                         focus:ring-blue-500 focus:border-transparent resize-none
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200"
                        />
                    </div>
                </div>

                {/* ── Sektion 3: Möjliggöraren ─────────────────────── */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-2xl">🤝</span>
                        <h2 className="text-xl font-bold text-slate-800">
                            Möjliggöraren
                        </h2>
                    </div>
                    <p className="text-sm text-slate-500 -mt-2">
                        Vad behöver du av mig som stationschef eller av gruppen för att nå dit?
                    </p>

                    <div className="space-y-2">
                        <label htmlFor="resourceNeeds" className="text-sm font-medium text-slate-700">
                            Resursbehov
                        </label>
                        <textarea
                            id="resourceNeeds"
                            required
                            rows={4}
                            placeholder="T.ex. tid på APT, budget för material, beslut från ledning..."
                            value={resourceNeeds}
                            onChange={(e) => setResourceNeeds(e.target.value)}
                            disabled={isSubmitting}
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm
                         placeholder:text-slate-400 focus:outline-none focus:ring-2
                         focus:ring-blue-500 focus:border-transparent resize-none
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200"
                        />
                    </div>
                </div>

                {/* ── Sektion 4: Målgrupp (endast managers) ─────────── */}
                {currentUser?.role === "station_manager" && (
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-2xl">🎯</span>
                            <h2 className="text-xl font-bold text-slate-800">
                                Vem gäller detta?
                            </h2>
                        </div>
                        <p className="text-sm text-slate-500 -mt-2">
                            Som stationschef kan du välja om idén gäller bara din station eller hela området.
                        </p>

                        <div className="space-y-2">
                            <label htmlFor="targetAudience" className="text-sm font-medium text-slate-700">
                                Målgrupp
                            </label>
                            <select
                                id="targetAudience"
                                value={targetAudience || currentUser.station}
                                onChange={(e) => setTargetAudience(e.target.value)}
                                disabled={isSubmitting}
                                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm
                                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                     transition-all duration-200"
                            >
                                <option value={currentUser.station}>
                                    🏠 Min station ({currentUser.station})
                                </option>
                                {(() => {
                                    const area = getStationArea(organizations, currentUser.station || "");
                                    return area ? (
                                        <option value={area}>
                                            🗺️ Hela området ({area})
                                        </option>
                                    ) : null;
                                })()}
                            </select>
                        </div>
                    </div>
                )}

                {currentUser?.role === "area_manager" && (() => {
                    const userArea = currentUser.area || getStationArea(organizations, currentUser.station || "");
                    const stationsInArea = userArea ? getStationsInArea(organizations, userArea) : [];

                    return (
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
                            <div className="flex items-center gap-3 mb-1">
                                <span className="text-2xl">🎯</span>
                                <h2 className="text-xl font-bold text-slate-800">
                                    Vem gäller detta?
                                </h2>
                            </div>
                            <p className="text-sm text-slate-500 -mt-2">
                                Som områdeschef kan du välja om idén gäller hela området eller en specifik station.
                            </p>

                            <div className="space-y-2">
                                <label htmlFor="targetAudience" className="text-sm font-medium text-slate-700">
                                    Målgrupp
                                </label>
                                <select
                                    id="targetAudience"
                                    value={targetAudience || userArea || ""}
                                    onChange={(e) => setTargetAudience(e.target.value)}
                                    disabled={isSubmitting}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm
                                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                         disabled:opacity-50 disabled:cursor-not-allowed
                                         transition-all duration-200"
                                >
                                    <option value={userArea || ""}>
                                        🗺️ Hela området ({userArea})
                                    </option>
                                    {stationsInArea.map((station: string) => (
                                        <option key={station} value={station}>
                                            🏠 {station}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    );
                })()}

                {currentUser?.role === "region_manager" && (
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-2xl">🎯</span>
                            <h2 className="text-xl font-bold text-slate-800">
                                Vem gäller detta?
                            </h2>
                        </div>
                        <p className="text-sm text-slate-500 -mt-2">
                            Som regionchef postar du till hela din region.
                        </p>

                        <div className="space-y-2">
                            <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3">
                                <p className="text-sm font-medium text-purple-800">
                                    🌍 Hela regionen ({(() => {
                                        const region = getRegion(organizations, currentUser.station || "");
                                        return region || "Okänd region";
                                    })()})
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Submit-knapp ──────────────────────────────────── */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-blue-600 px-6 py-4 text-base font-semibold
                     text-white shadow-md hover:bg-blue-700 active:scale-[0.98]
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600
                     transition-all duration-200"
                >
                    {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Skickar...
                        </span>
                    ) : (
                        "🚀 Skicka in din idé"
                    )}
                </button>
            </form>
        </div>
    );
}
