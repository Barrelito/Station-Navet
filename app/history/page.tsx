"use client";

import Header from "../../components/Header";
import IdeaFeed from "../../components/IdeaFeed";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function HistoryPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            <Header />

            <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
                {/* ── Tillbaka-navigering ──────────────────────────────── */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Tillbaka till Torgmötet
                </Link>

                {/* ── Rubrik ───────────────────────────────────────────── */}
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <span className="text-3xl">🗄️</span> Historik
                    </h1>
                    <p className="text-slate-500 text-sm">
                        Här samlas alla idéer och omröstningar som har genomförts på stationen.
                    </p>
                </div>

                {/* ── Flödet (endast genomförda) ───────────────────────── */}
                {/* Vi skickar in showCompleted till getIdeas via IdeaFeeds props om vi anpassar den, 
                    eller så skapar vi en ny vy här. Eftersom IdeaFeed gör mycket, kan vi skicka in 
                    en prop till IdeaFeed för att tvinga den att visa historik, ELLER 
                    kopiera in list-logiken här. Vi väljer att skicka in en prop till IdeaFeed för återanvändning. 
                    
                    Vänta, IdeaFeed sätter `activeTab` och filtrerar lokalt och gör API-anrop!
                    Det är renare om IdeaFeed accepterar en "isHistoryView" prop.
                */}
                <IdeaFeed isHistoryView />
            </main>

            <footer className="max-w-2xl mx-auto px-4 py-8 text-center">
                <p className="text-xs text-slate-300">
                    Station-Navet · Historik
                </p>
            </footer>
        </div>
    );
}
