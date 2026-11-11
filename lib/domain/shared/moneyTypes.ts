// lib/domain/shared/moneyTypes.ts
//
// Three precision tiers for every monetary value:
//
//   Raw        — analytical, full floating point
//   Normalized — operational (100 MGA), used for OPEX, entitlement, split
//   Commercial — customer-facing (500 MGA), used for the subscription fee
//
// The type system enforces which tier a value belongs to. Rounding
// happens at declared boundaries only.

declare const RAW: unique symbol;
declare const NORMALIZED: unique symbol;
declare const COMMERCIAL: unique symbol;

export type RawMGA = number & { readonly [RAW]: true };
export type NormalizedMGA = number & { readonly [NORMALIZED]: true };
export type CommercialMGA = number & { readonly [COMMERCIAL]: true };

// -----------------------------------------------------------------
// The paired representation for values that need multiple views
// -----------------------------------------------------------------
export interface MonetaryValue {
  raw: RawMGA;
  normalized: NormalizedMGA;
  commercial: CommercialMGA;
}

// -----------------------------------------------------------------
// Steps
// -----------------------------------------------------------------
export const OPERATIONAL_STEP = 100;
export const COMMERCIAL_STEP = 500;
export const REPORTING_STEP = 1_000;

// -----------------------------------------------------------------
// Constructors — used only at declared boundaries
// -----------------------------------------------------------------
export function makeRaw(raw: number): RawMGA {
  return raw as RawMGA;
}

export function toNormalized(raw: number): NormalizedMGA {
  return (Math.round(raw / OPERATIONAL_STEP) * OPERATIONAL_STEP) as NormalizedMGA;
}

export function toCommercial(raw: number): CommercialMGA {
  return (Math.round(raw / COMMERCIAL_STEP) * COMMERCIAL_STEP) as CommercialMGA;
}

export function toReporting(raw: number): number {
  return Math.round(raw / REPORTING_STEP) * REPORTING_STEP;
}

// -----------------------------------------------------------------
// Reads — never round in these
// -----------------------------------------------------------------
export function readRaw(v: RawMGA | number): number {
  return v as number;
}

export function readNormalized(v: NormalizedMGA | number): number {
  return v as number;
}

export function readCommercial(v: CommercialMGA | number): number {
  return v as number;
}

// -----------------------------------------------------------------
// Convenience constructor for a full triad
// -----------------------------------------------------------------
export function makeMonetaryValue(raw: number): MonetaryValue {
  return {
    raw: makeRaw(raw),
    normalized: toNormalized(raw),
    commercial: toCommercial(raw),
  };
}