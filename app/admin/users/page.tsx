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
    const updateArea = useMutation(api.admin.updateUserArea);
    const updateRegion = useMutation(api.admin.updateUserRegion);

    const [editingUser, setEditingUser] = useState<Id<"users"> | null>(null);
    const [editingField, setEditingField] = useState<"station" | "area" | "region" | null>(null);
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

    // Hämta organisationer per typ
    const stations = organizations
        .filter((org) => org.type === "station")
        .sort((a, b) => a.name.localeCompare(b.name));

    const areas = organizations
        .filter((org) => org.type === "area")
        .sort((a, b) => a.name.localeCompare(b.name));

    const regions = organizations
        .filter((org) => org.type === "region")
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
            setEditingUser(null);
            setEditingField(null);
        } catch (error) {
            console.error("Kunde inte uppdatera station:", error);
            alert("Något gick fel vid uppdatering av station.");
        }
    };

    const handleAreaChange = async (userId: Id<"users">, newArea: string) => {
        try {
            await updateArea({
                userId,
                areaName: newArea,
            });
            setEditingUser(null);
            setEditingField(null);
        } catch (error) {
            console.error("Kunde inte uppdatera område:", error);
            alert("Något gick fel vid uppdatering av område.");
        }
    };

    const handleRegionChange = async (userId: Id<"users">, newRegion: string) => {
        try {
            await updateRegion({
                userId,
                regionName: newRegion,
            });
            setEditingUser(null);
            setEditingField(null);
        } catch (error) {
            console.error("Kunde inte uppdatera region:", error);
            alert("Något gick fel vid uppdatering av region.");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Användarhantering</h2>
                    <p className="text-slate-600 mt-1">Hantera roller och tilldelningar</p>
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
                                Roll
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Tilldelning
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Åtgärder
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredUsers.map((user) => {
                            const isEditing = editingUser === user._id;

                            return (
                                <tr key={user._id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900">{user.name}</div>
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
                                    <td className="px-6 py-4">
                                        {/* Station (för user & station_manager) */}
                                        {(user.role === "user" || user.role === "station_manager") && (
                                            isEditing && editingField === "station" ? (
                                                <select
                                                    value={user.station || ""}
                                                    onChange={(e) => handleStationChange(user._id, e.target.value)}
                                                    className="text-sm border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    autoFocus
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
                                                    🏠 {user.station || <span className="text-slate-400 italic">Ingen station</span>}
                                                </div>
                                            )
                                        )}

                                        {/* Område (för area_manager) */}
                                        {user.role === "area_manager" && (
                                            isEditing && editingField === "area" ? (
                                                <select
                                                    value={user.area || ""}
                                                    onChange={(e) => handleAreaChange(user._id, e.target.value)}
                                                    className="text-sm border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    autoFocus
                                                >
                                                    <option value="">Välj område...</option>
                                                    {areas.map((area) => (
                                                        <option key={area._id} value={area.name}>
                                                            {area.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="text-sm text-slate-900">
                                                    🗺️ {user.area || <span className="text-slate-400 italic">Inget område</span>}
                                                </div>
                                            )
                                        )}

                                        {/* Region (för region_manager) */}
                                        {user.role === "region_manager" && (
                                            isEditing && editingField === "region" ? (
                                                <select
                                                    value={user.region || ""}
                                                    onChange={(e) => handleRegionChange(user._id, e.target.value)}
                                                    className="text-sm border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    autoFocus
                                                >
                                                    <option value="">Välj region...</option>
                                                    {regions.map((region) => (
                                                        <option key={region._id} value={region.name}>
                                                            {region.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="text-sm text-slate-900">
                                                    🌍 {user.region || <span className="text-slate-400 italic">Ingen region</span>}
                                                </div>
                                            )
                                        )}

                                        {/* Admin - ingen tilldelning */}
                                        {user.role === "admin" && (
                                            <div className="text-sm text-slate-400 italic">
                                                Full systemåtkomst
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {user.role !== "admin" && (
                                            <button
                                                onClick={() => {
                                                    setEditingUser(user._id);
                                                    if (user.role === "area_manager") {
                                                        setEditingField("area");
                                                    } else if (user.role === "region_manager") {
                                                        setEditingField("region");
                                                    } else {
                                                        setEditingField("station");
                                                    }
                                                }}
                                                className="text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                Ändra tilldelning
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
