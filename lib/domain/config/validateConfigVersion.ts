// Server-side validator. Mirrors validateLocal() from useCampaignValidation.ts.
// Extend as new bounds are added client-side.
export interface ConfigVersionPayload {
  pricingFramework: Record<string, unknown>;
  financialRules: Record<string, unknown>;
  operatorRequirements: Record<string, unknown>;
}

function requireObject(name: string, v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error(`${name} must be an object`);
  return v as Record<string, unknown>;
}

function requireNumber(name: string, v: unknown, min: number, max: number): number {
  if (typeof v !== "number" || Number.isNaN(v)) throw new Error(`${name} must be a number`);
  if (v < min || v > max) throw new Error(`${name} must be between ${min} and ${max}`);
  return v;
}

export function validateConfigVersion(input: unknown): ConfigVersionPayload {
  if (!input || typeof input !== "object") throw new Error("payload must be an object");
  const p = input as Record<string, unknown>;

  const pricing = requireObject("pricingFramework", p.pricingFramework);
  const fin = requireObject("financialRules", p.financialRules);
  const op = requireObject("operatorRequirements", p.operatorRequirements);

  // Bounds matching current client validateLocal()
  const mode = String(pricing.mode ?? "");
  if (mode && !["FIXED", "BOUNDED", "GUIDED"].includes(mode)) {
    throw new Error("pricingFramework.mode must be FIXED|BOUNDED|GUIDED");
  }
  if (mode !== "FIXED") {
    const min = requireNumber("pricingFramework.min", pricing.min, 0, 1e9);
    const rec = requireNumber("pricingFramework.recommended", pricing.recommended, 0, 1e9);
    const max = requireNumber("pricingFramework.max", pricing.max, 0, 1e9);
    if (!(min < rec && rec < max)) {
      throw new Error("pricingFramework must satisfy min < recommended < max");
    }
  }
  requireNumber("financialRules.commission", fin.commission, 0, 100);
  if (!Array.isArray(fin.methods) || fin.methods.length === 0) {
    throw new Error("financialRules.methods must be a non-empty array");
  }
  const collectors = requireNumber("operatorRequirements.collectors", op.collectors, 1, 10000);
  if (!Number.isInteger(collectors)) throw new Error("operatorRequirements.collectors must be integer");
  const freq = String(op.frequency ?? "");
  if (!["daily", "weekly", "on-demand"].includes(freq)) {
    throw new Error("operatorRequirements.frequency must be daily|weekly|on-demand");
  }
  return { pricingFramework: pricing, financialRules: fin, operatorRequirements: op };
}
