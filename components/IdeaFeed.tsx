"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import type { Id } from "../convex/_generated/dataModel";
import WorkshopCard from "./WorkshopCard";
import { getStationsInArea, getAllStationsInRegion, getStationArea } from "../lib/org-structure";

// ─── Tröskelvärde (visas i UI:t) ──────────────────────────
const SUPPORT_THRESHOLD = 3;

/**
 * IdeaFeed – "Torgmötet"
 *
 * Listar alla synliga idéer. Varje kort visar olika actions
 * beroende på idéns status:
 *   proposal → "Stötta idén"
 *   voting   → "Ja" / "Nej"
 *   approved → "Redo för verkstaden"
 */
export default function IdeaFeed() {
    // ── Hämta användare för att kolla behörighet ───────────────
    const currentUser = useQuery(api.users.getCurrentUser);

    // ── Filter-state (för managers) ────────────────────────────
    const [stationFilter, setStationFilter] = useState<string>("");

    // Hämta idéer (med eventuellt filter)
    const ideas = useQuery(api.ideas.getIdeas, {
        station: stationFilter || undefined
    });

    const castVote = useMutation(api.votes.castVote);

    // ── Laddningsläge ──────────────────────────────────────────
    if (ideas === undefined) {
        return (
            <div className="w-full max-w-2xl mx-auto px-4 py-12 text-center">
                <div className="animate-pulse space-y-6">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-48 rounded-2xl bg-slate-100 border border-slate-200"
                        />
                    ))}
                </div>
                <p className="text-slate-400 mt-6 text-sm">Laddar idéer...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    <span className="text-3xl">🏛️</span> Torgmötet
                </h1>

                {/* ── Filter-dropdown för managers ────────────────── */}
                {(currentUser?.role === "area_manager" || currentUser?.role === "region_manager") && (
                    <StationFilter
                        currentUser={currentUser}
                        value={stationFilter}
                        onChange={setStationFilter}
                    />
                )}
            </div>

            <p className="text-slate-500 text-sm -mt-3">
                Stötta idéer du tror på. {SUPPORT_THRESHOLD} stöttningar → skarp omröstning.
            </p>

            {/* ── Tomt läge (efter filter) ────────────────────── */}
            {ideas.length === 0 ? (
                <div className="w-full py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <span className="text-4xl block mb-3">👻</span>
                    <h2 className="text-lg font-medium text-slate-600">
                        {stationFilter ? `Inga idéer för ${stationFilter}` : "Inga idéer ännu"}
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Var den första att skicka in en gnista!
                    </p>
                </div>
            ) : (
                ideas.map((idea) => (
                    <IdeaCard key={idea._id} idea={idea} castVote={castVote} />
                ))
            )}
        </div>
    );
}

// ─── Filter-komponent ─────────────────────────────────────────

function StationFilter({
    currentUser,
    value,
    onChange
}: {
    currentUser: any;
    value: string;
    onChange: (val: string) => void;
}) {
    // Räkna ut vilka stationer som kan väljas
    const stations = (() => {
        if (currentUser.role === "area_manager") {
            const area = currentUser.area || getStationArea(currentUser.station || "");
            return area ? getStationsInArea(area) : [];
        }
        if (currentUser.role === "region_manager") {
            // För regionchefer, visa alla i regionen
            // (Här skulle vi kunna gruppera per område, men en platt lista funkar för nu)
            return currentUser.region ? getAllStationsInRegion(currentUser.region) : [];
        }
        return [];
    })();

    if (stations.length === 0) return null;

    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="text-sm border-slate-200 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
            <option value="">🗺️ Alla stationer</option>
            {stations.map((s) => (
                <option key={s} value={s}>
                    🏠 {s}
                </option>
            ))}
        </select>
    );
}

// ─── Typ för idé (från Convex) ────────────────────────────────
type Idea = {
    _id: Id<"ideas">;
    _creationTime: number;
    title: string;
    description: string;
    perfectState: string;
    resourceNeeds: string;
    status: string;
    votesCount: number;
    targetAudience: string; // T.ex. "Norrtälje", "Roslagen", "Nord"
    scope: string;          // "station", "area", eller "region"
};

// ─── Status-badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; style: string }> = {
        proposal: {
            label: "Söker stöd",
            style: "bg-amber-100 text-amber-700 border-amber-200",
        },
        voting: {
            label: "Omröstning pågår",
            style: "bg-blue-100 text-blue-700 border-blue-200",
        },
        approved: {
            label: "Godkänd",
            style: "bg-emerald-100 text-emerald-700 border-emerald-200",
        },
        workshop: {
            label: "I verkstaden",
            style: "bg-purple-100 text-purple-700 border-purple-200",
        },
        completed: {
            label: "Klart!",
            style: "bg-green-100 text-green-700 border-green-200",
        },
    };

    const { label, style } = config[status] ?? {
        label: status,
        style: "bg-slate-100 text-slate-600 border-slate-200",
    };

    return (
        <span
            className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${style}`}
        >
            {label}
        </span>
    );
}

// ─── Scope-badge ───────────────────────────────────────────────
function ScopeBadge({ scope, targetAudience }: { scope: string; targetAudience: string }) {
    const config: Record<string, { icon: string; style: string; prefix: string }> = {
        station: {
            icon: "🏠",
            style: "bg-slate-100 text-slate-700 border-slate-300",
            prefix: "",
        },
        area: {
            icon: "🗺️",
            style: "bg-blue-100 text-blue-700 border-blue-300",
            prefix: "Hela ",
        },
        region: {
            icon: "🌍",
            style: "bg-purple-100 text-purple-700 border-purple-300",
            prefix: "Region ",
        },
    };

    const { icon, style, prefix } = config[scope] ?? config["station"];

    return (
        <span
            className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${style}`}
        >
            {icon} {prefix}{targetAudience}
        </span>
    );
}

// ─── Idékort ──────────────────────────────────────────────────
function IdeaCard({
    idea,
    castVote,
}: {
    idea: Idea;
    castVote: any;
}) {
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Generisk rösthanterare
    const handleVote = async (type: "support" | "yes" | "no") => {
        setLoading(type);
        setError(null);
        try {
            await castVote({ ideaId: idea._id, type });
        } catch (err: any) {
            setError(err.message || "Något gick fel.");
        } finally {
            setLoading(null);
        }
    };

    // Tidsstämpel → läsbar text
    const timeAgo = formatTimeAgo(idea._creationTime);

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md">
            {/* ── Header ──────────────────────────────────────────── */}
            <div className="p-6 pb-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="text-lg font-bold text-slate-800 leading-snug">
                        {idea.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <ScopeBadge scope={idea.scope} targetAudience={idea.targetAudience} />
                        <StatusBadge status={idea.status} />
                    </div>
                </div>

                <p className="text-slate-600 text-sm leading-relaxed">
                    {idea.description}
                </p>
            </div>

            {/* ── Detaljer (Målbild + Resurser) ───────────────────── */}
            <div className="px-6 pb-4 space-y-3">
                <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        🎯 Målbild
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed">
                        {idea.perfectState}
                    </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        🤝 Resursbehov
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed">
                        {idea.resourceNeeds}
                    </p>
                </div>
            </div>

            {/* ── Meta-info ───────────────────────────────────────── */}
            <div className="px-6 pb-3">
                <p className="text-xs text-slate-400">
                    En kollega · {timeAgo}
                </p>
            </div>

            {/* ── Fel-meddelande ──────────────────────────────────── */}
            {error && (
                <div className="mx-6 mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-2">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* ── Actions (beroende på status) ────────────────────── */}
            {idea.status === "proposal" && (
                <div className="border-t border-slate-100 px-6 py-4">
                    <ProposalActions
                        votesCount={idea.votesCount}
                        loading={loading}
                        onSupport={() => handleVote("support")}
                    />
                </div>
            )}

            {/* Voting, Approved, Workshop, Completed → WorkshopCard */}
            {(idea.status === "voting" ||
                idea.status === "approved" ||
                idea.status === "workshop" ||
                idea.status === "completed") && (
                    <WorkshopCard ideaId={idea._id} ideaStatus={idea.status} />
                )}
        </div>
    );
}

// ─── Proposal-actions: "Stötta idén" ──────────────────────────
function ProposalActions({
    votesCount,
    loading,
    onSupport,
}: {
    votesCount: number;
    loading: string | null;
    onSupport: () => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                {/* Progress-indikator */}
                <div className="flex gap-1">
                    {Array.from({ length: SUPPORT_THRESHOLD }).map((_, i) => (
                        <div
                            key={i}
                            className={`w-3 h-3 rounded-full transition-colors duration-300 ${i < votesCount
                                ? "bg-amber-400"
                                : "bg-slate-200"
                                }`}
                        />
                    ))}
                </div>
                <span className="text-xs text-slate-500">
                    {votesCount} / {SUPPORT_THRESHOLD} stöttningar
                </span>
            </div>

            <button
                onClick={onSupport}
                disabled={loading === "support"}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200
                   px-4 py-2.5 text-sm font-semibold text-amber-700
                   hover:bg-amber-100 active:scale-[0.97]
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-200"
            >
                {loading === "support" ? (
                    <span className="flex items-center gap-2">
                        <Spinner /> Stöttar...
                    </span>
                ) : (
                    "👍 Stötta idén"
                )}
            </button>
        </div>
    );
}

// ─── Voting-actions: "Ja" / "Nej" ────────────────────────────
function VotingActions({
    loading,
    onYes,
    onNo,
}: {
    loading: string | null;
    onYes: () => void;
    onNo: () => void;
}) {
    return (
        <div className="space-y-3">
            <p className="text-sm font-semibold text-blue-600 flex items-center gap-2">
                <span className="text-lg">⚡</span> Skarp omröstning pågår
            </p>
            <div className="flex gap-3">
                <button
                    onClick={onYes}
                    disabled={loading !== null}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl
                     bg-emerald-50 border border-emerald-200 px-4 py-2.5
                     text-sm font-semibold text-emerald-700
                     hover:bg-emerald-100 active:scale-[0.97]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200"
                >
                    {loading === "yes" ? <Spinner /> : "✅"} Ja
                </button>
                <button
                    onClick={onNo}
                    disabled={loading !== null}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl
                     bg-red-50 border border-red-200 px-4 py-2.5
                     text-sm font-semibold text-red-700
                     hover:bg-red-100 active:scale-[0.97]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200"
                >
                    {loading === "no" ? <Spinner /> : "❌"} Nej
                </button>
            </div>
        </div>
    );
}

// ─── Hjälpkomponenter ─────────────────────────────────────────

function Spinner() {
    return (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
        </svg>
    );
}

/**
 * Enkel relativ tidsformatering.
 * Visar "Just nu", "X min sedan", "X tim sedan", osv.
 */
function formatTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMin = Math.floor(diffMs / 60_000);

    if (diffMin < 1) return "Just nu";
    if (diffMin < 60) return `${diffMin} min sedan`;

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} tim sedan`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Igår";
    if (diffDays < 7) return `${diffDays} dagar sedan`;

    return new Date(timestamp).toLocaleDateString("sv-SE");
}
