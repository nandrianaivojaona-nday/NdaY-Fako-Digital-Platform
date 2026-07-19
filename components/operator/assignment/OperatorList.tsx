// /components/operator-assignment/OperatorList.tsx
"use client";

import { useState } from "react";
import type { Operator } from "@/types/operator";
import { Truck, MapPin, Users, CheckCircle, AlertCircle } from "lucide-react";

interface Props {
  operators: Operator[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  campaignId: string;
}

export default function OperatorList({
  operators,
  selectedId,
  onSelect,
  campaignId,
}: Props) {
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  if (operators.length === 0) {
    return (
      <div className="p-8 border rounded-2xl bg-white/5 backdrop-blur-sm text-center space-y-4">
        <div className="flex justify-center">
          <AlertCircle className="h-12 w-12 text-amber-400/50" />
        </div>
        <h3 className="text-white font-medium">No Operators Available</h3>
        <p className="text-white/50 text-sm">
          No eligible operators found for this campaign.
          <br />
          Check that operators exist and match the campaign location.
        </p>
        <div className="flex justify-center gap-3">
          <a
            href="/operator/register"
            className="px-4 py-2 bg-emerald-600 rounded-lg text-white text-sm hover:bg-emerald-700 transition-colors"
          >
            Register New Operator
          </a>
          <a
            href={`/campaigns/${campaignId}/activate`}
            className="px-4 py-2 bg-white/10 rounded-lg text-white/70 text-sm hover:bg-white/20 transition-colors"
          >
            Back to Activation
          </a>
        </div>
      </div>
    );
  }

  // Filter operators
  const filteredOperators = operators.filter((op) => {
    const matchesFilter = filter === "all" || op.status === filter;
    const matchesSearch =
      op.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.city?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="border rounded-2xl bg-white/5 backdrop-blur-sm overflow-hidden">
      {/* Header with filters */}
      <div className="p-4 border-b border-white/10 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-white">
            Available Operators
            <span className="ml-2 text-sm font-normal text-white/40">
              ({filteredOperators.length})
            </span>
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-lg text-xs ${
                filter === "all"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-white/5 text-white/40 hover:text-white/70"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-3 py-1 rounded-lg text-xs ${
                filter === "active"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-white/5 text-white/40 hover:text-white/70"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-3 py-1 rounded-lg text-xs ${
                filter === "pending"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-white/5 text-white/40 hover:text-white/70"
              }`}
            >
              Pending
            </button>
          </div>
        </div>

        <input
          type="text"
          placeholder="Search by name or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm placeholder:text-white/30 focus:border-emerald-500 focus:outline-none transition-colors"
        />
      </div>

      {/* Operator cards */}
      <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
        {filteredOperators.map((operator) => {
          const isSelected = selectedId === operator.id;

          return (
            <button
              key={operator.id}
              onClick={() => onSelect(operator.id)}
              className={`w-full text-left p-4 transition-all ${
                isSelected
                  ? "bg-emerald-500/10 border-l-4 border-emerald-500"
                  : "hover:bg-white/5"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Selection indicator */}
                <div
                  className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-white/20"
                  }`}
                >
                  {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-medium truncate">
                      {operator.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        operator.status === "active"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {operator.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-white/50">
                    {operator.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {operator.city}
                      </span>
                    )}
                    {operator.type && (
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {operator.type}
                      </span>
                    )}
                    {operator.contact && (
                      <span className="flex items-center gap-1">
                        {operator.contact}
                      </span>
                    )}
                  </div>

                  {operator.capacity && (
                    <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                      <span>Capacity: {operator.capacity} households</span>
                      <span>•</span>
                      <span>Collectors: {operator.collectors || "N/A"}</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {filteredOperators.length === 0 && (
          <div className="p-8 text-center text-white/40">
            No operators match your filters
          </div>
        )}
      </div>
    </div>
  );
}