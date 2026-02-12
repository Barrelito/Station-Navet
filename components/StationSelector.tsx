"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { orgStructure } from "../lib/org-structure";

/**
 * StationSelector – Dialog för första inloggning
 *
 * Tvingas visas för användare som saknar station.
 * Kan inte stängas utan att välja en station.
 */
export default function StationSelector() {
    const user = useQuery(api.users.getCurrentUser);
    const updateStation = useMutation(api.users.updateUserStation);

    const [selectedStation, setSelectedStation] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Laddar användare ──────────────────────────────────────
    if (user === undefined) {
        return null; // Laddar fortfarande
    }

    // ── Användaren har redan valt station ─────────────────────
    if (user === null || user.station) {
        return null; // Inte inloggad eller har redan station
    }

    // ── Hantera submit ────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStation) return;

        setIsSubmitting(true);
        try {
            await updateStation({ station: selectedStation });
            // Dialog stängs automatiskt när user.station uppdateras
        } catch (error) {
            console.error("Kunde inte uppdatera station:", error);
            alert("Något gick fel. Försök igen!");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md mx-4 rounded-2xl border border-slate-200 bg-white shadow-2xl p-8 space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <span className="text-5xl block">🏠</span>
                    <h2 className="text-2xl font-bold text-slate-800">
                        Välkommen till Station-Navet!
                    </h2>
                    <p className="text-sm text-slate-500">
                        För att komma igång behöver vi veta vilken station du tillhör.
                    </p>
                </div>

                {/* Formulär */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-3">
                        <label htmlFor="station" className="text-sm font-medium text-slate-700">
                            Välj din station
                        </label>

                        {/* Grupperade stationer efter område */}
                        <select
                            id="station"
                            required
                            value={selectedStation}
                            onChange={(e) => setSelectedStation(e.target.value)}
                            disabled={isSubmitting}
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                 disabled:opacity-50 disabled:cursor-not-allowed
                                 transition-all duration-200"
                        >
                            <option value="">-- Välj station --</option>
                            {orgStructure.map((region) =>
                                region.areas.map((area) => (
                                    <optgroup key={area.name} label={`${area.name} (${region.name})`}>
                                        {area.stations.map((station) => (
                                            <option key={station} value={station}>
                                                {station}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))
                            )}
                        </select>
                    </div>

                    {/* Submit-knapp */}
                    <button
                        type="submit"
                        disabled={!selectedStation || isSubmitting}
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
                                Sparar...
                            </span>
                        ) : (
                            "Fortsätt"
                        )}
                    </button>
                </form>

                {/* Hjälptext */}
                <p className="text-xs text-slate-400 text-center">
                    Du kan inte ändra detta senare. Kontakta admin om du valt fel.
                </p>
            </div>
        </div>
    );
}
