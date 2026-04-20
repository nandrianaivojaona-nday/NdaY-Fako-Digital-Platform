"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import {
    Expand,
    Minimize2,
    Plus,
    Pencil,
    Trash2,
    Users,
    Route,
    Activity,
    X,
    Upload,
    Download,
    FileSpreadsheet,
} from "lucide-react";
import { OperabilityInputs } from "@/types/campaign";
import SubscriberSheet, { SubscriberDraft } from "./SubscriberSheet";

type Props = {
    value: OperabilityInputs;
    subscribers: SubscriberDraft[];
    onMetricChange: <K extends keyof OperabilityInputs>(
        key: K,
        value: OperabilityInputs[K]
    ) => void;
    onSubscribersChange: (subscribers: SubscriberDraft[]) => void;
    onClose: () => void;
    onCancel: () => void;
    onSave: () => void | Promise<void>;
    saving?: boolean;
};
// Add this function at the top of the file, before emptySubscriber()
function generateUUID(): string {
    // Try crypto.randomUUID first
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    // Fallback for older browsers or HTTP environments
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
function emptySubscriber(): SubscriberDraft {
    return {
        id: generateUUID(), // Use the safe function instead of crypto.randomUUID()
        subscriberName: "",
        subscriberType: "HOUSEHOLD",
        zone: "",
        gps: "",
        estimatedWasteKgPerWeek: 0,
        collectionFrequency: "WEEKLY",
        distanceToCollectionPointMeters: 0,
        distanceToPredumpingMeters: 0,
        distanceToDumpingMeters: 0,
        travelTimeMinutes: 0,
        serviceTimeMinutes: 0,
        roadCondition: "GOOD",
        vehicleAccess: "YES",
        willingnessToJoin: "UNKNOWN",
        feeToleranceAr: 0,
        comments: "",
    };
}

function clamp(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function deriveMetricsFromSubscribers(subscribers: SubscriberDraft[]): Partial<OperabilityInputs> {
    if (!Array.isArray(subscribers) || subscribers.length === 0) {
        return {
            routeComplexity: 45,
            accessibilityScore: 70,
            assetReadiness: 60,
            workforceReadiness: 65,
            traceabilityReadiness: 55,
            monitoringEase: 60,
            stakeholderCoordination: 58,
            operatorSlotFillRate: 50,
        };
    }

    const count = subscribers.length;
    const avgTravel = subscribers.reduce((sum, s) => sum + (s.travelTimeMinutes || 0), 0) / count;
    const avgService = subscribers.reduce((sum, s) => sum + (s.serviceTimeMinutes || 0), 0) / count;
    const avgDumpDistance = subscribers.reduce((sum, s) => sum + (s.distanceToDumpingMeters || 0), 0) / count;
    const accessYesRate = subscribers.filter((s) => s.vehicleAccess === "YES").length / count;
    const gpsRate = subscribers.filter((s) => Boolean(s.gps?.trim())).length / count;
    const zoneRate = subscribers.filter((s) => Boolean(s.zone?.trim())).length / count;
    const willingnessYesRate = subscribers.filter((s) => s.willingnessToJoin === "YES").length / count;
    const willingnessMaybeRate = subscribers.filter((s) => s.willingnessToJoin === "MAYBE").length / count;
    const poorRoadRate = subscribers.filter((s) => s.roadCondition === "POOR").length / count;

    return {
        routeComplexity: clamp(25 + avgTravel * 1.2 + avgService * 0.8 + avgDumpDistance / 120 + poorRoadRate * 18),
        accessibilityScore: clamp(accessYesRate * 100 - poorRoadRate * 20 + 10),
        assetReadiness: clamp(45 + count * 4),
        workforceReadiness: clamp(willingnessYesRate * 100 + willingnessMaybeRate * 40),
        traceabilityReadiness: clamp(gpsRate * 60 + zoneRate * 40),
        monitoringEase: clamp(80 - avgTravel * 0.9 - poorRoadRate * 15),
        stakeholderCoordination: clamp(willingnessYesRate * 85 + willingnessMaybeRate * 25),
        operatorSlotFillRate: clamp(Math.min(100, count * 12)),
    };
}

// Helper: Convert subscribers to CSV string
function subscribersToCSV(subscribers: SubscriberDraft[]): string {
    if (!subscribers.length) return "";

    const headers = [
        "subscriberName",
        "subscriberType",
        "zone",
        "gps",
        "estimatedWasteKgPerWeek",
        "collectionFrequency",
        "distanceToCollectionPointMeters",
        "distanceToPredumpingMeters",
        "distanceToDumpingMeters",
        "travelTimeMinutes",
        "serviceTimeMinutes",
        "roadCondition",
        "vehicleAccess",
        "willingnessToJoin",
        "feeToleranceAr",
        "comments",
    ];

    const rows = subscribers.map((s) =>
        headers.map((h) => {
            const val = s[h as keyof SubscriberDraft];
            // Escape commas and quotes
            if (typeof val === "string" && (val.includes(",") || val.includes('"'))) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val ?? "";
        })
    );

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

// Helper: Parse CSV string to SubscriberDraft array (simple but robust)
function csvToSubscribers(csvText: string): SubscriberDraft[] {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim());
    const requiredHeaders = [
        "subscriberName",
        "subscriberType",
        "zone",
        "gps",
        "estimatedWasteKgPerWeek",
        "collectionFrequency",
        "distanceToCollectionPointMeters",
        "distanceToPredumpingMeters",
        "distanceToDumpingMeters",
        "travelTimeMinutes",
        "serviceTimeMinutes",
        "roadCondition",
        "vehicleAccess",
        "willingnessToJoin",
        "feeToleranceAr",
        "comments",
    ];

    // Validate headers (allow extra columns, but at least these)
    const missing = requiredHeaders.filter((h) => !headers.includes(h));
    if (missing.length) {
        throw new Error(`Missing required columns: ${missing.join(", ")}`);
    }

    const subscribers: SubscriberDraft[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Simple CSV parsing: split by comma, but ignore commas inside quotes
        const values: string[] = [];
        let inQuote = false;
        let current = "";
        for (let j = 0; j < line.length; j++) {
            const ch = line[j];
            if (ch === '"') {
                inQuote = !inQuote;
            } else if (ch === "," && !inQuote) {
                values.push(current.trim());
                current = "";
            } else {
                current += ch;
            }
        }
        values.push(current.trim());

        // Map headers to values
        const record: any = {};
        headers.forEach((h, idx) => {
            let val = values[idx] || "";
            // Remove surrounding quotes
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1).replace(/""/g, '"');
            }
            record[h] = val;
        });

        // Create SubscriberDraft with defaults for missing fields
        const subscriber: SubscriberDraft = {
            id: crypto.randomUUID(),
            subscriberName: record.subscriberName || "",
            subscriberType: record.subscriberType || "HOUSEHOLD",
            zone: record.zone || "",
            gps: record.gps || "",
            estimatedWasteKgPerWeek: parseFloat(record.estimatedWasteKgPerWeek) || 0,
            collectionFrequency: record.collectionFrequency || "WEEKLY",
            distanceToCollectionPointMeters: parseFloat(record.distanceToCollectionPointMeters) || 0,
            distanceToPredumpingMeters: parseFloat(record.distanceToPredumpingMeters) || 0,
            distanceToDumpingMeters: parseFloat(record.distanceToDumpingMeters) || 0,
            travelTimeMinutes: parseFloat(record.travelTimeMinutes) || 0,
            serviceTimeMinutes: parseFloat(record.serviceTimeMinutes) || 0,
            roadCondition: record.roadCondition || "GOOD",
            vehicleAccess: record.vehicleAccess || "YES",
            willingnessToJoin: record.willingnessToJoin || "UNKNOWN",
            feeToleranceAr: parseFloat(record.feeToleranceAr) || 0,
            comments: record.comments || "",
        };
        subscribers.push(subscriber);
    }
    return subscribers;
}

export default function OperabilityModal({
    value,
    subscribers = [],
    onMetricChange,
    onSubscribersChange,
    onClose,
    onCancel,
    onSave,
    saving = false,
}: Props) {
    const [maximized, setMaximized] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [sheetValue, setSheetValue] = useState<SubscriberDraft>(emptySubscriber());
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-derive metrics when subscribers change
    useEffect(() => {
        const derived = deriveMetricsFromSubscribers(subscribers);
        const updates: [keyof OperabilityInputs, number][] = [];

        (Object.keys(derived) as (keyof OperabilityInputs)[]).forEach((key) => {
            const newVal = derived[key];
            if (newVal !== undefined && value[key] !== newVal) {
                updates.push([key, newVal]);
            }
        });

        if (updates.length > 0) {
            updates.forEach(([key, newVal]) => {
                onMetricChange(key, newVal);
            });
        }
    }, [subscribers, value, onMetricChange]);

    // ESC handling
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && sheetOpen) {
                setSheetOpen(false);
                return;
            }
            if (event.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKeyDown);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = "";
        };
    }, [onClose, sheetOpen]);

    const liveScore = useMemo(() => {
        const values = [
            value.routeComplexity !== undefined ? 100 - value.routeComplexity : 50,
            value.accessibilityScore ?? 50,
            value.assetReadiness ?? 50,
            value.workforceReadiness ?? 50,
            value.traceabilityReadiness ?? 50,
            value.monitoringEase ?? 50,
            value.stakeholderCoordination ?? 50,
            value.operatorSlotFillRate ?? 50,
        ];
        return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    }, [value]);

    // --- Subscriber CRUD ---
    function openNewSubscriber() {
        setEditingId(null);
        setSheetValue(emptySubscriber());
        setSheetOpen(true);
    }

    function openEditSubscriber(id: string) {
        const found = subscribers.find((s) => s.id === id);
        if (!found) return;
        setEditingId(id);
        setSheetValue(found);
        setSheetOpen(true);
    }

    function saveSubscriber(next: SubscriberDraft) {
        if (editingId) {
            onSubscribersChange(subscribers.map((s) => (s.id === editingId ? next : s)));
        } else {
            onSubscribersChange([...subscribers, next]);
        }
        setSheetOpen(false);
    }

    function removeSubscriber(id: string) {
        onSubscribersChange(subscribers.filter((s) => s.id !== id));
    }

    // --- CSV Export ---
    function handleExportCSV() {
        const csv = subscribersToCSV(subscribers);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "subscribers.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // --- CSV Import ---
    function handleImportCSV(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csvText = e.target?.result as string;
                const imported = csvToSubscribers(csvText);
                if (imported.length === 0) {
                    alert("No valid subscribers found in CSV.");
                    return;
                }
                // Replace current subscribers (or merge? We'll replace for simplicity)
                if (confirm(`Import ${imported.length} subscribers? This will replace your current list.`)) {
                    onSubscribersChange(imported);
                }
            } catch (err: any) {
                alert(`CSV import error: ${err.message}`);
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsText(file, "UTF-8");
    }

    // --- Google Sheets template ---
    function openGoogleSheetsTemplate() {
        // This URL creates a new Google Sheet with a pre-filled template.
        // You can replace with your own published template URL.
        const templateUrl = "https://docs.google.com/spreadsheets/d/1kHkHkHkHkHkHkHkHkHkHkHkHkHk/edit?usp=sharing";
        // Alternative: open a blank sheet with instructions
        window.open("https://docs.google.com/spreadsheets/create?usp=sheets_home&ths=true", "_blank");
        alert("Please copy the column headers from the sample below into your sheet:\n\n" +
            "subscriberName,subscriberType,zone,gps,estimatedWasteKgPerWeek,collectionFrequency," +
            "distanceToCollectionPointMeters,distanceToPredumpingMeters,distanceToDumpingMeters," +
            "travelTimeMinutes,serviceTimeMinutes,roadCondition,vehicleAccess,willingnessToJoin," +
            "feeToleranceAr,comments\n\nThen export as CSV and import here.");
    }




    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onMouseDown={onClose}>
            <div
                onMouseDown={(e) => e.stopPropagation()}
                className={
                    maximized
                        ? "fixed inset-4 overflow-hidden rounded-3xl border border-white/10 bg-slate-950 text-white shadow-2xl"
                        : "fixed left-1/2 top-1/2 h-[88vh] w-[min(1280px,96vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-white/10 bg-slate-950 text-white shadow-2xl"
                }
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 bg-white/3 px-5 py-4">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/45">
                            Floating operability workspace
                        </p>
                        <h2 className="mt-1 text-lg font-black text-white">
                            Operability draft editor
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setMaximized((v) => !v)}
                            className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 hover:bg-white/10"
                        >
                            {maximized ? <Minimize2 size={18} /> : <Expand size={18} />}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 hover:bg-white/10"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Two‑column layout */}
                <div className="grid h-[calc(100%-73px)] grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)]">
                    {/* Left: Subscriber list */}
                    <aside className="border-r border-white/10 bg-black/20 p-5 flex flex-col">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">
                                    Subscribers
                                </p>
                                <p className="mt-1 text-sm text-white/60">
                                    One sheet per subscriber
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={openNewSubscriber}
                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-black text-white"
                                >
                                    <Plus size={16} />
                                    Add
                                </button>
                                {/* CSV Import/Export buttons */}
                                <button
                                    type="button"
                                    onClick={handleExportCSV}
                                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white"
                                    title="Export to CSV"
                                >
                                    <Download size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white"
                                    title="Import from CSV"
                                >
                                    <Upload size={16} />
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept=".csv"
                                    onChange={handleImportCSV}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={openGoogleSheetsTemplate}
                                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white"
                                    title="Open Google Sheets template"
                                >
                                    <FileSpreadsheet size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
                            {subscribers.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-white/55">
                                    No subscriber draft yet. Add the first subscriber to see metrics update interactively.
                                </div>
                            ) : (
                                subscribers.map((subscriber) => (
                                    <div key={subscriber.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-bold text-white">
                                                    {subscriber.subscriberName || "Unnamed subscriber"}
                                                </div>
                                                <div className="mt-1 text-xs text-white/55">
                                                    {subscriber.subscriberType} · {subscriber.zone || "No zone"}
                                                </div>
                                            </div>
                                            <div className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-bold text-white/75">
                                                {subscriber.collectionFrequency}
                                            </div>
                                        </div>
                                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/60">
                                            <MiniStat label="Travel" value={`${subscriber.travelTimeMinutes}m`} />
                                            <MiniStat label="Service" value={`${subscriber.serviceTimeMinutes}m`} />
                                            <MiniStat label="Access" value={subscriber.vehicleAccess} />
                                            <MiniStat label="Join" value={subscriber.willingnessToJoin} />
                                        </div>
                                        <div className="mt-4 flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openEditSubscriber(subscriber.id)}
                                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white"
                                            >
                                                <Pencil size={14} />
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeSubscriber(subscriber.id)}
                                                className="inline-flex items-center justify-center rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-rose-200"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </aside>

                    {/* Right: Metrics display and derivation info */}
                    <main className="overflow-y-auto p-5">
                        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                            <section className="space-y-5">
                                {/* Derivation map */}
                                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-300">
                                            <Activity size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">
                                                Automatic derivation
                                            </p>
                                            <h3 className="mt-1 text-lg font-black text-white">
                                                Subscriber inputs → Operability metrics
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_80px_1fr]">
                                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                                                <Users size={16} />
                                                Subscriber inputs
                                            </div>
                                            <div className="space-y-2 text-sm text-white/70">
                                                <DiagramChip label="Travel time" />
                                                <DiagramChip label="Service time" />
                                                <DiagramChip label="Dumping distance" />
                                                <DiagramChip label="Road condition" />
                                                <DiagramChip label="Vehicle access" />
                                                <DiagramChip label="Willingness to join" />
                                                <DiagramChip label="GPS / Zone traceability" />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-center text-white/35">
                                            <Route size={32} />
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                            <div className="mb-3 text-sm font-bold text-white">
                                                Derived metrics (auto-updated)
                                            </div>
                                            <div className="space-y-2 text-sm text-white/70">
                                                <DiagramChip label={`Route complexity · ${value.routeComplexity ?? 0}%`} />
                                                <DiagramChip label={`Accessibility · ${value.accessibilityScore ?? 0}%`} />
                                                <DiagramChip label={`Asset readiness · ${value.assetReadiness ?? 0}%`} />
                                                <DiagramChip label={`Workforce readiness · ${value.workforceReadiness ?? 0}%`} />
                                                <DiagramChip label={`Traceability · ${value.traceabilityReadiness ?? 0}%`} />
                                                <DiagramChip label={`Monitoring ease · ${value.monitoringEase ?? 0}%`} />
                                                <DiagramChip label={`Coordination · ${value.stakeholderCoordination ?? 0}%`} />
                                                <DiagramChip label={`Slot fill rate · ${value.operatorSlotFillRate ?? 0}%`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Metrics preview (read-only) */}
                                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                                    <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">
                                        Current operability metrics
                                    </p>
                                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                                        <MetricPreview label="Route complexity" value={value.routeComplexity ?? 0} tone="amber" />
                                        <MetricPreview label="Accessibility score" value={value.accessibilityScore ?? 0} tone="emerald" />
                                        <MetricPreview label="Asset readiness" value={value.assetReadiness ?? 0} tone="sky" />
                                        <MetricPreview label="Workforce readiness" value={value.workforceReadiness ?? 0} tone="emerald" />
                                        <MetricPreview label="Traceability readiness" value={value.traceabilityReadiness ?? 0} tone="sky" />
                                        <MetricPreview label="Monitoring ease" value={value.monitoringEase ?? 0} tone="emerald" />
                                        <MetricPreview label="Stakeholder coordination" value={value.stakeholderCoordination ?? 0} tone="sky" />
                                        <MetricPreview label="Operator slot fill rate" value={value.operatorSlotFillRate ?? 0} tone="emerald" />
                                    </div>
                                </div>
                            </section>

                            {/* Right sidebar: Score and actions */}
                            <aside className="space-y-5">
                                <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                                    <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">
                                        Live operability score
                                    </p>
                                    <div className="mt-3 text-5xl font-black text-white">{liveScore}</div>
                                    <p className="mt-2 text-sm text-white/65">Estimated operability /100</p>
                                    <div className="mt-3 inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                                        {liveScore >= 80
                                            ? "Strong"
                                            : liveScore >= 60
                                                ? "Viable"
                                                : liveScore >= 40
                                                    ? "Weak"
                                                    : "Not recommended"}
                                    </div>
                                </div>

                                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                                    <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">
                                        Subscriber summary
                                    </p>
                                    <div className="mt-4 space-y-3">
                                        <SummaryRow label="Total subscribers" value={`${subscribers.length}`} />
                                        <SummaryRow
                                            label="Avg travel time"
                                            value={
                                                subscribers.length
                                                    ? `${Math.round(
                                                        subscribers.reduce((sum, s) => sum + s.travelTimeMinutes, 0) /
                                                        subscribers.length
                                                    )} min`
                                                    : "0 min"
                                            }
                                        />
                                        <SummaryRow
                                            label="Avg service time"
                                            value={
                                                subscribers.length
                                                    ? `${Math.round(
                                                        subscribers.reduce((sum, s) => sum + s.serviceTimeMinutes, 0) /
                                                        subscribers.length
                                                    )} min`
                                                    : "0 min"
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={onCancel}
                                        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void onSave()}
                                        disabled={saving}
                                        className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        {saving ? "Saving..." : "Save draft"}
                                    </button>
                                </div>
                            </aside>
                        </div>
                    </main>
                </div>

                {/* Subscriber sheet modal (for add/edit) */}
                {sheetOpen && (
                    <SubscriberSheet
                        value={sheetValue}
                        onChange={setSheetValue}
                        onClose={() => setSheetOpen(false)}
                        onSave={() => saveSubscriber(sheetValue)}
                    />
                )}
            </div>
        </div>
    );
}

// --- Helper components (unchanged, but included for completeness) ---
function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-white/10 bg-black/20 px-2 py-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">{label}</div>
            <div className="mt-1 font-semibold text-white/80">{value}</div>
        </div>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm">
            <span className="text-white/65">{label}</span>
            <span className="font-bold text-white">{value}</span>
        </div>
    );
}

function DiagramChip({ label }: { label: string }) {
    return <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">{label}</div>;
}

function MetricPreview({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: "emerald" | "sky" | "amber";
}) {
    const barClass = {
        emerald: "bg-emerald-400",
        sky: "bg-sky-400",
        amber: "bg-amber-400",
    }[tone];

    return (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white">{label}</div>
                <div className="text-lg font-black text-white">{value}%</div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                    className={`h-full rounded-full ${barClass} transition-all duration-300`}
                    style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                />
            </div>
        </div>
    );
}