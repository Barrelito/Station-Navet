"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { getStationArea, getRegion, getStationsInArea } from "../lib/org-structure";

export default function PollForm() {
    const currentUser = useQuery(api.users.getCurrentUser);
    const organizations = useQuery(api.organizations.getOrganizations);
    const createPoll = useMutation(api.polls.createPoll); // Vi måste exponera denna i api

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [targetAudience, setTargetAudience] = useState<string>("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Default audience logic (Samma som IdeaForm, flytta till hook sen?)
            let finalTargetAudience = targetAudience || currentUser?.station || "";
            if (currentUser?.role === "area_manager" && !targetAudience) {
                const area = getStationArea(organizations || [], currentUser.station || "");
                finalTargetAudience = area || currentUser.station || "";
            }
            if (currentUser?.role === "region_manager" && !targetAudience) {
                const region = getRegion(organizations || [], currentUser.station || "");
                finalTargetAudience = region || currentUser.station || "";
            }

            await createPoll({
                title,
                description,
                targetAudience: finalTargetAudience,
            });

            setTitle("");
            setDescription("");
            if (currentUser?.station) setTargetAudience(currentUser.station);

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 5000);

        } catch (error) {
            console.error("Kunde inte skapa omröstning:", error);
            alert("Något gick fel.");
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
            {showSuccess && (
                <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center animate-in fade-in slide-in-from-top-2 duration-300">
                    <span className="text-2xl block mb-2">📊</span>
                    <p className="text-emerald-800 font-semibold text-lg">
                        Omröstning skapad!
                    </p>
                    <p className="text-emerald-600 text-sm mt-1">
                        Den ligger nu live i flödet.
                    </p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-2xl">🗳️</span>
                        <h2 className="text-xl font-bold text-slate-800">
                            Vad vill du rösta om?
                        </h2>
                    </div>

                    {/* Titel */}
                    <div className="space-y-2">
                        <label htmlFor="pollTitle" className="text-sm font-medium text-slate-700">
                            Fråga / Rubrik
                        </label>
                        <input
                            id="pollTitle"
                            type="text"
                            required
                            placeholder="T.ex. Ska vi köpa in en ny kaffemaskin?"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={isSubmitting}
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>

                    {/* Beskrivning */}
                    <div className="space-y-2">
                        <label htmlFor="pollDescription" className="text-sm font-medium text-slate-700">
                            Bakgrund / Alternativ
                        </label>
                        <textarea
                            id="pollDescription"
                            required
                            rows={3}
                            placeholder="Förklara varför vi röstar..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={isSubmitting}
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                        />
                    </div>
                </div>

                {/* Målgruppsväljare (Samma logik som IdeaForm - för managers) */}
                {currentUser?.role === "station_manager" && (
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-2xl">🎯</span>
                            <h2 className="text-xl font-bold text-slate-800">Målgrupp</h2>
                        </div>
                        <select
                            value={targetAudience || currentUser.station}
                            onChange={(e) => setTargetAudience(e.target.value)}
                            disabled={isSubmitting}
                            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
                        >
                            <option value={currentUser.station}>🏠 Min station ({currentUser.station})</option>
                            {(() => {
                                const area = getStationArea(organizations, currentUser.station || "");
                                return area ? <option value={area}>🗺️ Hela området ({area})</option> : null;
                            })()}
                        </select>
                    </div>
                )}
                {currentUser?.role === "area_manager" && (() => {
                    const userArea = currentUser.area || getStationArea(organizations, currentUser.station || "");
                    const stationsInArea = userArea ? getStationsInArea(organizations, userArea) : [];
                    return (
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
                            <div className="flex items-center gap-3 mb-1">
                                <span className="text-2xl">🎯</span>
                                <h2 className="text-xl font-bold text-slate-800">Målgrupp</h2>
                            </div>
                            <select
                                value={targetAudience || userArea || ""}
                                onChange={(e) => setTargetAudience(e.target.value)}
                                disabled={isSubmitting}
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
                            >
                                <option value={userArea || ""}>🗺️ Hela området ({userArea})</option>
                                {stationsInArea.map(s => <option key={s} value={s}>🏠 {s}</option>)}
                            </select>
                        </div>
                    );
                })()}


                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-indigo-600 px-6 py-4 text-base font-semibold text-white shadow-md hover:bg-indigo-700 transition-all"
                >
                    {isSubmitting ? "Skapar..." : "🗳️ Skapa omröstning"}
                </button>
            </form>
        </div>
    );
}
