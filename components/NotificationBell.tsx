"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { subscribeToPush } from "../lib/push-client";

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Hämta data
    // Om api.notifications inte är genererat än kan detta ge type-error lokalt, men funkar i runtime.
    const unreadCount = useQuery(api.notifications.getUnreadCount) || 0;
    const notifications = useQuery(api.notifications.getNotifications);

    // Mutations
    const markAsRead = useMutation(api.notifications.markAsRead);
    const markAllAsRead = useMutation(api.notifications.markAllAsRead);
    const saveSubscription = useMutation(api.push.saveSubscription);

    // Push state
    const [pushEnabled, setPushEnabled] = useState(false);

    const [isLoading, setIsLoading] = useState(false);

    // Kolla status vid mount och när menyn öppnas
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPushEnabled(Notification.permission === 'granted');
        }
    }, [isOpen]);

    const handleEnablePush = async () => {
        setIsLoading(true);
        try {
            const result = await subscribeToPush(saveSubscription);
            if (result) {
                setPushEnabled(true);
                alert("Push-notiser är nu aktiverade! 🎉");
            } else {
                alert("Kunde inte aktivera notiser. Kontrollera behörigheter eller försök igen senare.");
            }
        } catch (err) {
            console.error(err);
            alert("Ett fel uppstod.");
        } finally {
            setIsLoading(false);
        }
    };

    // Stäng dropdown om man klickar utanför
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleNotificationClick = async (n: any) => {
        // Markera som läst
        if (!n.isRead) {
            await markAsRead({ notificationId: n._id });
        }
        setIsOpen(false);
        // Navigera
        if (n.link) {
            router.push(n.link);
        }
    };

    const handleMarkAllRead = async () => {
        await markAllAsRead();
    };

    return (
        <div className="relative mr-4" ref={dropdownRef}>
            {/* ── Klockan ────────────────────────────────────────── */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            >
                {/* 🔔 Ikon */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>

                {/* 🔴 Badge */}
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* ── Dropdown ───────────────────────────────────────── */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 ring-1 ring-black ring-opacity-5 z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                        <h3 className="text-sm font-semibold text-slate-700">Notiser</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Markera alla som lästa
                            </button>
                        )}
                    </div>

                    {/* ── Push-aktivering ───────────────────────────── */}
                    {!pushEnabled && (
                        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                            <p className="text-xs text-blue-800 mb-2">
                                Vill du ha notiser i mobilen även när du inte använder appen?
                            </p>
                            <button
                                disabled={isLoading}
                                className={`w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded shadow-sm transition-colors ${isLoading ? "opacity-75 cursor-wait" : ""}`}
                            >
                                {isLoading ? "Aktiverar..." : "Slå på push-notiser 📲"}
                            </button>
                        </div>
                    )}

                    <div className="max-h-96 overflow-y-auto">
                        {!notifications || notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-slate-400">
                                <span className="text-2xl block mb-2">😴</span>
                                <p className="text-sm">Inga nya notiser</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-50">
                                {notifications.map((n) => (
                                    <li key={n._id}>
                                        <button
                                            onClick={() => handleNotificationClick(n)}
                                            className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex gap-3 ${!n.isRead ? "bg-blue-50/50" : ""
                                                }`}
                                        >
                                            <div className="flex-shrink-0 mt-1">
                                                {/* Exempel på ikon baserat på typ - kan utökas */}
                                                {n.type === "new_idea" ? (
                                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 text-lg">💡</span>
                                                ) : n.type === "vote" ? (
                                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-lg">👍</span>
                                                ) : (
                                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg">📣</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className={`text-sm ${!n.isRead ? "font-semibold text-slate-800" : "text-slate-600"}`}>
                                                    {n.title}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                                    {n.message}
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    {new Date(n._creationTime).toLocaleDateString()}
                                                </p>
                                            </div>
                                            {!n.isRead && (
                                                <div className="flex-shrink-0 mt-2">
                                                    <span className="block w-2 h-2 bg-blue-500 rounded-full"></span>
                                                </div>
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
