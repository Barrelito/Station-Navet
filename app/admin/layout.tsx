"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function AdminLayout({
    children,
}: {
    children: React.Node;
}) {
    const isAdmin = useQuery(api.admin.isAdmin);
    const router = useRouter();

    useEffect(() => {
        if (isAdmin === false) {
            // Inte admin - redirecta till startsidan
            router.push("/");
        }
    }, [isAdmin, router]);

    // Visa loading medan vi kollar admin-status
    if (isAdmin === undefined) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Kontrollerar behörighet...</p>
                </div>
            </div>
        );
    }

    // Inte admin
    if (!isAdmin) {
        return null; // Router.push() hanterar redirect
    }

    // Admin - visa layout
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Admin Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">⚙️ Admin Dashboard</h1>
                            <p className="text-purple-100 mt-1">Hantera användare och organisationsstruktur</p>
                        </div>
                        <Link
                            href="/"
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        >
                            ← Tillbaka till appen
                        </Link>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4">
                    <nav className="flex gap-8">
                        <Link
                            href="/admin/users"
                            className="px-4 py-4 text-sm font-medium border-b-2 border-transparent hover:border-blue-500 hover:text-blue-600 transition-colors"
                        >
                            👥 Användare
                        </Link>
                        <Link
                            href="/admin/organizations"
                            className="px-4 py-4 text-sm font-medium border-b-2 border-transparent hover:border-blue-500 hover:text-blue-600 transition-colors"
                        >
                            🏢 Organisationsstruktur
                        </Link>
                    </nav>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {children}
            </div>
        </div>
    );
}
