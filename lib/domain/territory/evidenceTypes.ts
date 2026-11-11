// lib/domain/territory/evidenceTypes.ts
//
// Every input that materially affects economics carries an evidence manifest.
// A number is not enough — the system must know how it was obtained and how
// much to trust it.

export type SourceType =
  | "OFFICIAL"
  | "INTERPOLATED"
  | "ESTIMATED"
  | "OPERATOR_ENTERED"
  | "FIELD_SURVEY";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";
export type HazardLevel = "NIL" | "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH" | "UNKNOWN";

export interface FieldEvidence {
  sourceType: SourceType;
  sourceName: string;
  referencePeriod?: string;
  collectionDate?: number;
  method?: string;
  confidence: ConfidenceLevel;
  notes?: string;
}

export function defaultConfidence(sourceType: SourceType): ConfidenceLevel {
  switch (sourceType) {
    case "OFFICIAL":
    case "FIELD_SURVEY":
      return "HIGH";
    case "OPERATOR_ENTERED":
    case "INTERPOLATED":
      return "MEDIUM";
    case "ESTIMATED":
      return "LOW";
  }
}

export function aggregateConfidence(
  evidences: Array<FieldEvidence | undefined>
): ConfidenceLevel {
  const present = evidences.filter(Boolean) as FieldEvidence[];
  if (present.length === 0) return "LOW";

  if (present.some((e) => e.confidence === "LOW")) return "LOW";
  if (present.some((e) => e.confidence === "MEDIUM")) return "MEDIUM";
  return "HIGH";
}

// Convenience builder
export function evidenceFor(
  sourceType: SourceType,
  sourceName: string,
  extras?: Partial<FieldEvidence>
): FieldEvidence {
  return {
    sourceType,
    sourceName,
    confidence: defaultConfidence(sourceType),
    ...extras,
  };
}
