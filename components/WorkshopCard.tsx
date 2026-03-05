"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import type { Id } from "../convex/_generated/dataModel";
import Spinner from "./ui/Spinner";

/**
 * WorkshopCard – Visar verkstadsfasen för en idé.
 *
 * Byter utseende beroende på status:
 *   approved  → "Jag tar ansvar!"
 *   workshop  → Visar ägare + "Markera som färdig" (om ägare)
 *   completed → "Genomförd!" + High-five-knapp
 */
export default function WorkshopCard({
    ideaId,
    ideaStatus,
    currentUser,
    rejectReason,
}: {
    ideaId: Id<"ideas">;
    ideaStatus: string;
    currentUser: any;
    rejectReason?: string;
}) {
    // ── Hämta task kopplad till idén ────────────────────────────
    const task = useQuery(api.tasks.getTaskByIdeaId, { ideaId });

    // ── Mutations ──────────────────────────────────────────────
    const claimTask = useMutation(api.tasks.claimTask);
    const completeTask = useMutation(api.tasks.completeTask);
    const giveHighFive = useMutation(api.tasks.giveHighFive);
    const approveIdea = useMutation(api.ideas.approveIdea);
    const rejectIdea = useMutation(api.ideas.rejectIdea);

    // ── UI state ───────────────────────────────────────────────
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectionReasonInput, setRejectionReasonInput] = useState("");

    // ── Generisk action-handler ────────────────────────────────
    const handleAction = async (
        actionName: string,
        fn: () => Promise<any>,
        onSuccessMessage?: string
    ) => {
        setLoading(actionName);
        setError(null);
        setSuccessMsg(null);
        try {
            await fn();
            if (onSuccessMessage) {
                setSuccessMsg(onSuccessMessage);
                setTimeout(() => setSuccessMsg(null), 4000);
            }
        } catch (err: any) {
            setError(err.message || "Något gick fel.");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="border-t border-slate-100 px-6 py-4 space-y-3">
            {/* ── Fel-meddelande ──────────────────────────────────── */}
            {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* ── Success-meddelande ──────────────────────────────── */}
            {successMsg && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 animate-in fade-in duration-200">
                    <p className="text-sm text-emerald-700 font-medium">{successMsg}</p>
                </div>
            )}

            {/* ═══ STATUS: VOTING → Godkänn-knapp (chef) ═══════════ */}
            {ideaStatus === "voting" && (currentUser?.role === "station_manager" || currentUser?.role === "area_manager" || currentUser?.role === "region_manager" || currentUser?.role === "admin") && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-blue-600">
                        <span className="text-sm font-semibold">
                            Beslut krävs
                        </span>
                    </div>
                    {!showRejectForm ? (
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() =>
                                    handleAction("approve", () => approveIdea({ ideaId }), "Idén är godkänd! 🎉")
                                }
                                disabled={loading !== null}
                                className="w-full rounded-xl bg-indigo-50 border border-indigo-200
                               px-4 py-3 text-sm font-semibold text-indigo-700
                               hover:bg-indigo-100 active:scale-[0.98]
                               disabled:opacity-50 disabled:cursor-not-allowed
                               transition-all duration-200"
                            >
                                {loading === "approve" ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Spinner /> Godkänner...
                                    </span>
                                ) : (
                                    "🔓 Godkänn idén (Chef)"
                                )}
                            </button>
                            <button
                                onClick={() => setShowRejectForm(true)}
                                disabled={loading !== null}
                                className="w-full rounded-xl bg-rose-50 border border-rose-200
                               px-4 py-3 text-sm font-semibold text-rose-700
                               hover:bg-rose-100 active:scale-[0.98]
                               disabled:opacity-50 disabled:cursor-not-allowed
                               transition-all duration-200"
                            >
                                🚫 Avslå idén
                            </button>
                            <p className="text-xs text-slate-400 text-center mt-2">
                                Endast synligt för chefer
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                            <h4 className="text-sm font-semibold text-rose-800">Avslå förslag</h4>
                            <textarea
                                value={rejectionReasonInput}
                                onChange={(e) => setRejectionReasonInput(e.target.value)}
                                placeholder="Ange en anledning till varför förslaget avslås. Detta skickas som notis till skaparen."
                                className="w-full p-3 py-2 text-sm border-rose-200 rounded-lg focus:ring-rose-500 focus:border-rose-500 bg-white"
                                rows={3}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleAction("reject", () => rejectIdea({ ideaId, reason: rejectionReasonInput }), "Förslaget har avslagits. 🚫")}
                                    disabled={loading !== null || rejectionReasonInput.trim().length === 0}
                                    className="flex-1 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-all shadow-sm"
                                >
                                    {loading === "reject" ? <Spinner /> : "Bekräfta avslag"}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowRejectForm(false);
                                        setRejectionReasonInput("");
                                    }}
                                    disabled={loading !== null}
                                    className="flex-1 rounded-lg bg-white border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm"
                                >
                                    Avbryt
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ STATUS: REJECTED → Visas för chefer/historik ═══════════════ */}
            {ideaStatus === "rejected" && (
                <div className="space-y-3">
                    <div className="flex items-start gap-3 rounded-xl bg-rose-50 border border-rose-200 p-4">
                        <div className="text-xl mt-1">🚫</div>
                        <div>
                            <p className="text-sm font-semibold text-rose-800">
                                Förslaget har avslagits
                            </p>
                            {rejectReason && (
                                <p className="text-xs text-rose-700 mt-1 italic">
                                    "{rejectReason}"
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ STATUS: APPROVED → Plocka uppgift ═══════════════ */}
            {ideaStatus === "approved" && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-600">
                        <span className="text-xl">🏁</span>
                        <p className="text-sm font-semibold">
                            Godkänd – väntar på att någon tar ansvar!
                        </p>
                    </div>
                    <button
                        onClick={() =>
                            handleAction(
                                "claim",
                                () => claimTask({ ideaId }),
                                "Du äger denna nu! Kör hårt! 💪"
                            )
                        }
                        disabled={loading !== null}
                        className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500
                       px-4 py-3 text-sm font-bold text-white shadow-md
                       hover:from-emerald-600 hover:to-teal-600
                       active:scale-[0.98]
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200"
                    >
                        {loading === "claim" ? (
                            <span className="flex items-center justify-center gap-2">
                                <Spinner /> Tar ansvar...
                            </span>
                        ) : (
                            "✋ Jag tar ansvar för denna!"
                        )}
                    </button>
                </div>
            )}

            {/* ═══ STATUS: WORKSHOP → Arbete pågår ═════════════════ */}
            {ideaStatus === "workshop" && (
                <div className="space-y-3">
                    {/* Visa ägare */}
                    <div className="flex items-center gap-3 rounded-xl bg-purple-50 border border-purple-100 p-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-200 text-purple-700 font-bold text-lg">
                            {task?.ownerName?.charAt(0) ?? "?"}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-purple-800">
                                {task?.ownerName ?? "Laddar..."}
                            </p>
                            <p className="text-xs text-purple-500">
                                🔧 Arbete pågår
                            </p>
                        </div>
                    </div>

                    {/* Markera som färdig: Visa bara för ägaren eller chef/admin */}
                    {task && (currentUser?._id === task.ownerId || ["station_manager", "area_manager", "region_manager", "admin"].includes(currentUser?.role)) && (
                        <button
                            onClick={() =>
                                handleAction(
                                    "complete",
                                    () => completeTask({ taskId: task._id }),
                                    "Fantastiskt! Uppgiften är klar! 🎉"
                                )
                            }
                            disabled={loading !== null}
                            className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-600
                         px-4 py-3 text-sm font-bold text-white shadow-md
                         hover:from-violet-600 hover:to-purple-700
                         active:scale-[0.98]
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200"
                        >
                            {loading === "complete" ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Spinner /> Markerar som klar...
                                </span>
                            ) : (
                                "✅ Markera som färdig"
                            )}
                        </button>
                    )}
                </div>
            )}

            {/* ═══ STATUS: COMPLETED → High-fives! ═════════════════ */}
            {ideaStatus === "completed" && (
                <div className="space-y-4">
                    {/* Firande-banner */}
                    <div className="rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 p-5 text-center">
                        <span className="text-4xl block mb-2">🎉</span>
                        <p className="text-lg font-bold text-amber-800">Genomförd!</p>
                        {task?.ownerName && (
                            <p className="text-sm text-amber-600 mt-1">
                                Genomförd av {task.ownerName}
                            </p>
                        )}
                    </div>

                    {/* High-five-räknare + knapp */}
                    {task && (
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">🖐️</span>
                                <span className="text-sm font-semibold text-slate-700">
                                    {task.highFives.length}{" "}
                                    {task.highFives.length === 1 ? "high-five" : "high-fives"}
                                </span>
                            </div>
                            <button
                                onClick={() =>
                                    handleAction(
                                        "highfive",
                                        () => giveHighFive({ taskId: task._id }),
                                        "High-five given! 🖐️"
                                    )
                                }
                                disabled={loading !== null}
                                className="inline-flex items-center gap-2 rounded-xl
                           bg-amber-100 border border-amber-300
                           px-5 py-2.5 text-sm font-bold text-amber-800
                           hover:bg-amber-200 active:scale-[0.95]
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-200"
                            >
                                {loading === "highfive" ? (
                                    <span className="flex items-center gap-2">
                                        <Spinner /> Skickar...
                                    </span>
                                ) : (
                                    "👏 Ge High-five"
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

