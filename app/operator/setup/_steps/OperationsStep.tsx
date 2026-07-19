"use client";

import { useState } from "react";
import { Settings, Users, Calendar, Clock, MapPin, Truck } from "lucide-react";

interface OperationsStepProps {
  state: any;
  updateState: (newState: any) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function OperationsStep({ state, updateState, onBack, onNext }: OperationsStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const operations = state.operations || {
    fleetSize: 0,
    staffCount: 0,
    collectionDays: [],
    startTime: "",
    endTime: "",
    coverageRadius: 0,
  };

  const handleChange = (field: string, value: any) => {
    updateState({
      operations: { ...operations, [field]: value },
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const toggleDay = (day: string) => {
    const current = operations.collectionDays || [];
    const updated = current.includes(day)
      ? current.filter((d: string) => d !== day)
      : [...current, day];
    handleChange("collectionDays", updated);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!operations.fleetSize || operations.fleetSize < 1) {
      newErrors.fleetSize = "Fleet size must be at least 1";
    }
    if (!operations.staffCount || operations.staffCount < 1) {
      newErrors.staffCount = "Staff count must be at least 1";
    }
    if (!operations.collectionDays || operations.collectionDays.length === 0) {
      newErrors.collectionDays = "Select at least one collection day";
    }
    if (!operations.startTime) newErrors.startTime = "Start time is required";
    if (!operations.endTime) newErrors.endTime = "End time is required";
    if (!operations.coverageRadius || operations.coverageRadius < 0.1) {
      newErrors.coverageRadius = "Coverage radius must be greater than 0";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-emerald-400" />
        <h2 className="text-xl font-bold text-white">Operations</h2>
      </div>
      <p className="text-sm text-white/50">
        Provide details about your operational capacity and schedule.
      </p>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">
              Fleet Size *
            </label>
            <div className="relative">
              <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="number"
                min="1"
                value={operations.fleetSize || 0}
                onChange={(e) => handleChange("fleetSize", parseInt(e.target.value) || 0)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
            {errors.fleetSize && <p className="mt-1 text-xs text-red-400">{errors.fleetSize}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">
              Staff Count *
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="number"
                min="1"
                value={operations.staffCount || 0}
                onChange={(e) => handleChange("staffCount", parseInt(e.target.value) || 0)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
            {errors.staffCount && <p className="mt-1 text-xs text-red-400">{errors.staffCount}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">
            Collection Days *
          </label>
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map((day) => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`px-3 py-1 rounded-full text-sm transition ${
                  (operations.collectionDays || []).includes(day)
                    ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500"
                    : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          {errors.collectionDays && <p className="mt-1 text-xs text-red-400">{errors.collectionDays}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">
              Start Time *
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="time"
                value={operations.startTime || ""}
                onChange={(e) => handleChange("startTime", e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
            {errors.startTime && <p className="mt-1 text-xs text-red-400">{errors.startTime}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">
              End Time *
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="time"
                value={operations.endTime || ""}
                onChange={(e) => handleChange("endTime", e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
            {errors.endTime && <p className="mt-1 text-xs text-red-400">{errors.endTime}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">
            Coverage Radius (km) *
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={operations.coverageRadius || 0}
              onChange={(e) => handleChange("coverageRadius", parseFloat(e.target.value) || 0)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
          {errors.coverageRadius && <p className="mt-1 text-xs text-red-400">{errors.coverageRadius}</p>}
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-white/10">
        <button
          onClick={onBack}
          className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition"
        >
          ← Back
        </button>
        <button
          onClick={handleNext}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-medium transition"
        >
          Next Step →
        </button>
      </div>
    </div>
  );
}