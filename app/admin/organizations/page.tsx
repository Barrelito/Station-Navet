"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";

export default function AdminOrganizationsPage() {
    const organizations = useQuery(api.organizations.getOrganizations);
    const createOrg = useMutation(api.organizations.createOrganization);
    const updateOrg = useMutation(api.organizations.updateOrganization);
    const deleteOrg = useMutation(api.organizations.deleteOrganization);

    const [editingId, setEditingId] = useState<Id<"organizations"> | null>(null);
    const [editingName, setEditingName] = useState("");
    const [addingType, setAddingType] = useState<"region" | "area" | "station" | null>(null);
    const [addingParentId, setAddingParentId] = useState<Id<"organizations"> | null>(null);
    const [newName, setNewName] = useState("");

    if (!organizations) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Laddar organisationsstruktur...</p>
            </div>
        );
    }

    // Bygg hierarkiskt träd
    const regions = organizations.filter((org) => org.type === "region");

    const getChildren = (parentId: Id<"organizations">) => {
        return organizations.filter((org) => org.parentId === parentId);
    };

    const handleCreate = async () => {
        if (!newName.trim() || !addingType) return;

        try {
            await createOrg({
                type: addingType,
                name: newName.trim(),
                parentId: addingParentId || undefined,
            });
            setNewName("");
            setAddingType(null);
            setAddingParentId(null);
        } catch (error: any) {
            alert(error.message || "Kunde inte skapa organization.");
        }
    };

    const handleUpdate = async (id: Id<"organizations">) => {
        if (!editingName.trim()) return;

        try {
            await updateOrg({ id, name: editingName.trim() });
            setEditingId(null);
            setEditingName("");
        } catch (error: any) {
            alert(error.message || "Kunde inte uppdatera organization.");
        }
    };

    const handleDelete = async (id: Id<"organizations">, name: string) => {
        if (!confirm(`Är du säker på att du vill ta bort "${name}"? Detta tar även bort alla underliggande enheter.`)) {
            return;
        }

        try {
            await deleteOrg({ id });
        } catch (error: any) {
            alert(error.message || "Kunde inte ta bort organization.");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Organisationsstruktur</h2>
                    <p className="text-slate-600 mt-1">Hantera regioner, områden och stationer</p>
                </div>
                <button
                    onClick={() => {
                        setAddingType("region");
                        setAddingParentId(null);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                    + Lägg till region
                </button>
            </div>

            {/* Add Form */}
            {addingType && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-3">
                        Lägg till {addingType === "region" ? "region" : addingType === "area" ? "område" : "station"}
                    </h3>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            placeholder="Namn..."
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                        <button
                            onClick={handleCreate}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Skapa
                        </button>
                        <button
                            onClick={() => {
                                setAddingType(null);
                                setAddingParentId(null);
                                setNewName("");
                            }}
                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                        >
                            Avbryt
                        </button>
                    </div>
                </div>
            )}

            {/* Organization Tree */}
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
                {regions.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        <p className="text-lg font-medium mb-2">Ingen organisationsstruktur ännu</p>
                        <p className="text-sm">Börja med att lägga till en region</p>
                    </div>
                ) : (
                    regions.map((region) => {
                        const areas = getChildren(region._id);
                        return (
                            <div key={region._id} className="border border-slate-200 rounded-lg p-4">
                                {/* Region */}
                                <div className="flex items-center justify-between mb-3">
                                    {editingId === region._id ? (
                                        <div className="flex items-center gap-2 flex-1">
                                            <span className="text-2xl">🌍</span>
                                            <input
                                                type="text"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                className="flex-1 px-3 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <button
                                                onClick={() => handleUpdate(region._id)}
                                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                                            >
                                                Spara
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingId(null);
                                                    setEditingName("");
                                                }}
                                                className="px-3 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 text-sm"
                                            >
                                                Avbryt
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">🌍</span>
                                                <span className="text-lg font-bold text-slate-800">{region.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setAddingType("area");
                                                        setAddingParentId(region._id);
                                                    }}
                                                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm font-medium"
                                                >
                                                    + Område
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingId(region._id);
                                                        setEditingName(region.name);
                                                    }}
                                                    className="px-3 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 text-sm"
                                                >
                                                    Redigera
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(region._id, region.name)}
                                                    className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                                                >
                                                    Ta bort
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Areas */}
                                {areas.length > 0 && (
                                    <div className="ml-8 space-y-3">
                                        {areas.map((area) => {
                                            const stations = getChildren(area._id);
                                            return (
                                                <div key={area._id} className="border-l-2 border-purple-300 pl-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        {editingId === area._id ? (
                                                            <div className="flex items-center gap-2 flex-1">
                                                                <span className="text-xl">🗺️</span>
                                                                <input
                                                                    type="text"
                                                                    value={editingName}
                                                                    onChange={(e) => setEditingName(e.target.value)}
                                                                    className="flex-1 px-3 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                />
                                                                <button
                                                                    onClick={() => handleUpdate(area._id)}
                                                                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                                                                >
                                                                    Spara
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingId(null);
                                                                        setEditingName("");
                                                                    }}
                                                                    className="px-3 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 text-sm"
                                                                >
                                                                    Avbryt
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xl">🗺️</span>
                                                                    <span className="font-semibold text-slate-700">{area.name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            setAddingType("station");
                                                                            setAddingParentId(area._id);
                                                                        }}
                                                                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs font-medium"
                                                                    >
                                                                        + Station
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingId(area._id);
                                                                            setEditingName(area.name);
                                                                        }}
                                                                        className="px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 text-xs"
                                                                    >
                                                                        Redigera
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete(area._id, area.name)}
                                                                        className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-xs"
                                                                    >
                                                                        Ta bort
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Stations */}
                                                    {stations.length > 0 && (
                                                        <div className="ml-6 space-y-1">
                                                            {stations.map((station) => (
                                                                <div key={station._id} className="flex items-center justify-between py-1">
                                                                    {editingId === station._id ? (
                                                                        <div className="flex items-center gap-2 flex-1">
                                                                            <span>🏠</span>
                                                                            <input
                                                                                type="text"
                                                                                value={editingName}
                                                                                onChange={(e) => setEditingName(e.target.value)}
                                                                                className="flex-1 px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                                            />
                                                                            <button
                                                                                onClick={() => handleUpdate(station._id)}
                                                                                className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                                                                            >
                                                                                Spara
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditingId(null);
                                                                                    setEditingName("");
                                                                                }}
                                                                                className="px-2 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 text-xs"
                                                                            >
                                                                                Avbryt
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            <div className="flex items-center gap-2">
                                                                                <span>🏠</span>
                                                                                <span className="text-sm text-slate-600">{station.name}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1">
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setEditingId(station._id);
                                                                                        setEditingName(station.name);
                                                                                    }}
                                                                                    className="px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 text-xs"
                                                                                >
                                                                                    Redigera
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDelete(station._id, station.name)}
                                                                                    className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-xs"
                                                                                >
                                                                                    Ta bort
                                                                                </button>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
