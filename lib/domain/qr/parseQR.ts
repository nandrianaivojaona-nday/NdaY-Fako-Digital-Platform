// lib/domain/qr/parseQR.ts
import type { ParsedQR } from "./types";

export function parseQR(raw: string): ParsedQR {
  const trimmed = raw.trim();
  if (trimmed.startsWith("COL:")) return { kind: "COLLECTOR", raw: trimmed, payload: trimmed.slice(4), parts: {} };
  if (trimmed.startsWith("HH:"))  return { kind: "HOUSEHOLD", raw: trimmed, payload: trimmed.slice(3), parts: {} };
  if (trimmed.startsWith("BIN:")) {
    const [fokontanyId, planTier, streamCode, serial] = trimmed.slice(4).split("-");
    return { kind: "BIN", raw: trimmed, payload: trimmed.slice(4), parts: { fokontanyId, planTier, streamCode, serial } };
  }
  if (trimmed.startsWith("BAG:")) {
    const [fokontanyId, streamCode, batch, serial] = trimmed.slice(4).split("-");
    return { kind: "BAG", raw: trimmed, payload: trimmed.slice(4), parts: { fokontanyId, streamCode, batch, serial } };
  }
  return { kind: "UNKNOWN", raw: trimmed, payload: trimmed, parts: {} };
}

export function describeQR(qr: ParsedQR): string {
  switch (qr.kind) {
    case "COLLECTOR": return `Collector ${qr.payload}`;
    case "BIN":       return `Bin · ${qr.parts.streamCode} · #${qr.parts.serial}`;
    case "BAG":       return `Bag · ${qr.parts.streamCode} · ${qr.parts.batch}-${qr.parts.serial}`;
    case "HOUSEHOLD": return `Household ${qr.payload}`;
    default:          return "Unrecognized code";
  }
}