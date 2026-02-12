"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";

export default function AdminUsersPage() {
    const users = useQuery(api.admin.getAllUsers);
    const organizations = useQuery(api.organizations.getOrganizations);
    const updateRole = useMutation(api.admin.updateUserRole);
    const updateStation = useMutation(api.admin.updateUserStation);

    const [editingUser, setEditingUser] = useState<Id<"users"> | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    if (!users || !organizations) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Laddar användare...</p>
            </div>
        );
    }

    // Filtrera användare baserat på sökning
    const filteredUsers = users.filter((user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.station?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Hämta alla stationer för dropdown
    const stations = organizations
        .filter((org) => org.type === "station")
        .sort((a, b) => a.name.localeCompare(b.name));

    const handleRoleChange = async (userId: Id<"users">, newRole: string) => {
        try {
            await updateRole({
                userId,
                role: newRole as any,
            });
        } catch (error) {
            console.error("Kunde inte uppdatera roll:", error);
            alert("Något gick fel vid uppdatering av roll.");
        }
    };

    const handleStationChange = async (userId: Id<"users">, newStation: string) => {
        try {
            await updateStation({
                userId,
                stationName: newStation,
            });
        } catch (error) {
            console.error("Kunde inte uppdatera station:", error);
            alert("Något gick fel vid uppdatering av station.");
        }
    };

    const getRoleBadge = (role: string) => {
        const styles = {
            user: "bg-slate-100 text-slate-700",
            station_manager: "bg-blue-100 text-blue-700",
            area_manager: "bg-purple-100 text-purple-700",
            region_manager: "bg-pink-100 text-pink-700",
            admin: "bg-red-100 text-red-700",
        };

        const labels = {
            user: "Användare",
            station_manager: "Stationschef",
            area_manager: "Områdeschef",
            region_manager: "Regionchef",
            admin: "Admin",
        };

        return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${styles[role as keyof typeof styles] || styles.user}`}>
                {labels[role as keyof typeof labels] || role}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Användarhantering</h2>
                    <p className="text-slate-600 mt-1">Hantera roller och stationstilldelningar</p>
                </div>
                <div className="text-sm text-slate-500">
                    {filteredUsers.length} användare
                </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-lg shadow-sm p-4">
                <input
                    type="text"
                    placeholder="Sök användare (namn eller station)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Namn
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Station
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Område / Region
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Roll
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Åtgärder
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredUsers.map((user) => (
                            <tr key={user._id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-slate-900">{user.name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {editingUser === user._id ? (
                                        <select
                                            value={user.station || ""}
                                            onChange={(e) => {
                                                handleStationChange(user._id, e.target.value);
                                                setEditingUser(null);
                                            }}
                                            className="text-sm border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Välj station...</option>
                                            {stations.map((station) => (
                                                <option key={station._id} value={station.name}>
                                                    {station.name}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="text-sm text-slate-900">
                                            {user.station || <span className="text-slate-400 italic">Ingen station</span>}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-slate-600">
                                        {user.stationInfo?.area || "-"} / {user.stationInfo?.region || "-"}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <select
                                        value={user.role}
                                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                        className="text-sm border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="user">Användare</option>
                                        <option value="station_manager">Stationschef</option>
                                        <option value="area_manager">Områdeschef</option>
                                        <option value="region_manager">Regionchef</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <button
                                        onClick={() => setEditingUser(user._id)}
                                        className="text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        Ändra station
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
