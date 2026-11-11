import crypto from "node:crypto";

function canonicalize(obj: unknown): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return "[" + obj.map(canonicalize).join(",") + "]";
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return "{" + keys.map(
    (k) => JSON.stringify(k) + ":" + canonicalize((obj as Record<string, unknown>)[k])
  ).join(",") + "}";
}

export function computeContentHash(v: {
  pricingFramework: unknown;
  financialRules: unknown;
  operatorRequirements: unknown;
}): string {
  const canonical = canonicalize({
    pricingFramework: v.pricingFramework,
    financialRules: v.financialRules,
    operatorRequirements: v.operatorRequirements,
  });
  return crypto.createHash("sha256").update(canonical).digest("hex");
}
