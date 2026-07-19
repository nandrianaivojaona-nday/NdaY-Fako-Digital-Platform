"use client";

import { useState } from "react";
import { User, Mail, Phone, MapPin, Building } from "lucide-react";

interface IdentityStepProps {
  state: any;
  updateState: (newState: any) => void;
  onNext: () => void;
}

export default function IdentityStep({ state, updateState, onNext }: IdentityStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const identity = state.identity || {};

  const handleChange = (field: string, value: string) => {
    updateState({
      identity: { ...identity, [field]: value },
    });
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!identity.name?.trim()) newErrors.name = "Operator name is required";
    if (!identity.email?.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(identity.email)) newErrors.email = "Invalid email format";
    if (!identity.phone?.trim()) newErrors.phone = "Phone number is required";
    if (!identity.address?.trim()) newErrors.address = "Address is required";
    if (!identity.registrationNumber?.trim()) {
      newErrors.registrationNumber = "Registration number is required";
    }
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
        <User className="h-6 w-6 text-emerald-400" />
        <h2 className="text-xl font-bold text-white">Operator Identity</h2>
      </div>
      <p className="text-sm text-white/50">
        Provide basic information about your waste management company.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">
            Operator Name *
          </label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              value={identity.name || ""}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-emerald-500 transition"
              placeholder="e.g., Green Waste Solutions"
            />
          </div>
          {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">
            Email Address *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="email"
              value={identity.email || ""}
              onChange={(e) => handleChange("email", e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-emerald-500 transition"
              placeholder="contact@greenwaste.mg"
            />
          </div>
          {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">
            Phone Number *
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="tel"
              value={identity.phone || ""}
              onChange={(e) => handleChange("phone", e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-emerald-500 transition"
              placeholder="+261 34 12 345 67"
            />
          </div>
          {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">
            Address *
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              value={identity.address || ""}
              onChange={(e) => handleChange("address", e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-emerald-500 transition"
              placeholder="123 Main St, Antananarivo"
            />
          </div>
          {errors.address && <p className="mt-1 text-xs text-red-400">{errors.address}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">
            Registration Number *
          </label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              value={identity.registrationNumber || ""}
              onChange={(e) => handleChange("registrationNumber", e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-emerald-500 transition"
              placeholder="RCS ANA 2025/001"
            />
          </div>
          {errors.registrationNumber && <p className="mt-1 text-xs text-red-400">{errors.registrationNumber}</p>}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-white/10">
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