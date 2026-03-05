"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

const STEPS = [
    {
        emoji: "🚀",
        title: "Välkommen till Station-Navet!",
        description: "Här kan du och dina kollegor vara med och påverka stationens och verksamhetens framtid. Från idé till verkstad!",
    },
    {
        emoji: "💡",
        title: "Skapa Förslag",
        description: "Saknar du ett verktyg, eller har du en idé om hur något kan göras bättre? Skapa ett förslag från startsidan!",
    },
    {
        emoji: "🗳️",
        title: "Torgmötet & Omröstningar",
        description: "På Torgmötet ser du allas förslag. Stötta idéer du tror på! Får ett förslag 3 stöttningar går det direkt till en skarp omröstning.",
    },
    {
        emoji: "🔧",
        title: "Verkstaden & Rapporter",
        description: "När en chef godkänt en idé landar den i Verkstaden. Ta ansvar, fixa det, och avsluta med att skriva en kort rapport om vad du gjort!",
    },
    {
        emoji: "🎉",
        title: "Nu är du redo att köra igång!",
        description: "Din första uppgift: titta igenom Torgmötet och se om det finns någon bra idé att stötta!",
    }
];

export default function OnboardingGuide() {
    const user = useQuery(api.users.getCurrentUser);
    const markSeen = useMutation(api.users.markOnboardingSeen);

    const [currentStep, setCurrentStep] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [dismissLocally, setDismissLocally] = useState(false);

    // Inte inloggad, saknar station (då ska StationSelector visas istället),
    // har redan sett guiden, eller manuellt stängd nyss.
    if (user === undefined) return null; // Laddar
    if (!user || !user.station || user.hasSeenOnboarding || dismissLocally) return null;

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = async () => {
        setIsSaving(true);
        try {
            await markSeen();
            setDismissLocally(true);
        } catch (error) {
            console.error("Kunde inte spara onboarding-status:", error);
            // Stäng lokalt ändå så de inte fastnar om databasen knasar
            setDismissLocally(true);
        } finally {
            setIsSaving(false);
        }
    };

    const progressPercent = ((currentStep + 1) / STEPS.length) * 100;
    const isLastStep = currentStep === STEPS.length - 1;
    const step = STEPS[currentStep];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">

                {/* Progress bar i toppen */}
                <div className="h-2 w-full bg-slate-100">
                    <div
                        className="h-full bg-blue-500 transition-all duration-300 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                <div className="p-8 pb-6 flex-1 flex flex-col justify-center items-center text-center space-y-6 min-h-[300px]">
                    <span className="text-7xl block animate-in zoom-in duration-300">
                        {step.emoji}
                    </span>
                    <div className="space-y-3">
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                            {step.title}
                        </h2>
                        <p className="text-slate-600 leading-relaxed text-sm">
                            {step.description}
                        </p>
                    </div>
                </div>

                {/* Dots indicator */}
                <div className="flex justify-center gap-2 pb-6">
                    {STEPS.map((_, i) => (
                        <div
                            key={i}
                            className={`w-2 h-2 rounded-full transition-colors duration-300 ${i === currentStep ? "bg-blue-500" : "bg-slate-200"}`}
                        />
                    ))}
                </div>

                {/* Footer buttons */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                    {currentStep > 0 && !isLastStep && (
                        <button
                            onClick={handleBack}
                            className="px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                            Tillbaka
                        </button>
                    )}

                    {!isLastStep ? (
                        <button
                            onClick={handleNext}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white py-3 px-6 rounded-xl font-bold transition-all shadow-sm"
                        >
                            Nästa
                        </button>
                    ) : (
                        <button
                            onClick={handleComplete}
                            disabled={isSaving}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md"
                        >
                            {isSaving ? "Sparar..." : "Kom igång!"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
