"use client";

import { useState } from "react";
import { Truck, Recycle, Trash2, Leaf, Building, Map } from "lucide-react";

interface ServicesStepProps {
  state: any;
  updateState: (newState: any) => void;
  onBack: () => void;
  onNext: () => void;
}

const SERVICE_TYPES = [
  { id: "household", label: "Household Collection", icon: Trash2 },
  { id: "commercial", label: "Commercial Waste", icon: Building },
  { id: "recycling", label: "Recycling Services", icon: Recycle },
  { id: "organic", label: "Organic Waste", icon: Leaf },
  { id: "bulky", label: "Bulky Items", icon: Truck },
];

export default function ServicesStep({ state, updateState, onBack, onNext }: ServicesStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const services = state.services || { selectedTypes: [], coverage: "", description: "" };

  const handleToggleService = (id: string) => {
    const current = services.selectedTypes || [];
    const updated = current.includes(id)
      ? current.filter((s: string) => s !== id)
      : [...current, id];
    updateState({
      services: { ...services, selectedTypes: updated },
    });
  };

  const handleChange = (field: string, value: string) => {
    updateState({
      services: { ...services, [field]: value },
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!services.selectedTypes || services.selectedTypes.length === 0) {
      newErrors.selectedTypes = "Select at least one service type";
    }
    if (!services.coverage?.trim()) newErrors.coverage = "Coverage area is required";
    if (!services.description?.trim()) newErrors.description = "Description is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Truck className="h-6 w-6 text-emerald-400" />
        <h2 className="text-xl font-bold text-white">Services Offered</h2>
      </div>
      <p className="text-sm text-white/50">
        Select the types of waste collection services you provide.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Service Types *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SERVICE_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = (services.selectedTypes || []).includes(type.id);
              return (
                <button
                  key={type.id}
                  onClick={() => handleToggleService(type.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                      : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{type.label}</span>
                </button>
              );
            })}
          </div>
          {errors.selectedTypes && (
            <p className="mt-1 text-xs text-red-400">{errors.selectedTypes}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">
            Coverage Area *
          </label>
          <div className="relative">
            <Map className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              value={services.coverage || ""}
              onChange={(e) => handleChange("coverage", e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-emerald-500 transition"
              placeholder="e.g., Antananarivo, Ambohimanga, etc."
            />
          </div>
          {errors.coverage && <p className="mt-1 text-xs text-red-400">{errors.coverage}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">
            Description of Services *
          </label>
          <textarea
            value={services.description || ""}
            onChange={(e) => handleChange("description", e.target.value)}
            rows={3}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-emerald-500 transition resize-none"
            placeholder="Describe your waste collection approach, frequency, and any special services..."
          />
          {errors.description && <p className="mt-1 text-xs text-red-400">{errors.description}</p>}
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