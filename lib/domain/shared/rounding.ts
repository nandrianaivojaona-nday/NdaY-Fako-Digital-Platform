// lib/domain/shared/rounding.ts
//
// Domain-specific rounding utilities. Every monetary value in the
// subscription engine is produced or consumed here.
//
// Invariants enforced by this module:
//   1. sum(distributeEntitlements(fee, n)) === fee
//   2. split.operator + split.ndayFee + split.paymentCost === entitlement
//   3. The commercial fee is always a multiple of 500
//   4. The entitlement is always a multiple of 100

import {
    OPERATIONAL_STEP,
    COMMERCIAL_STEP,
    NormalizedMGA,
    CommercialMGA,
    RawMGA,
    makeRaw,
    toNormalized,
    toCommercial,
    toReporting,
  } from "./moneyTypes";
  
  export { toReporting as roundForReporting };
  
  // -----------------------------------------------------------------
  // Analytical tier — no rounding
  // -----------------------------------------------------------------
  export function keepRaw(value: number): RawMGA {
    return makeRaw(value);
  }
  
  // -----------------------------------------------------------------
  // Commercial price language — 500 MGA
  // -----------------------------------------------------------------
  export function commercializePrice(raw: number): CommercialMGA {
    return toCommercial(raw);
  }
  
  // -----------------------------------------------------------------
  // Operational financial precision — 100 MGA
  // -----------------------------------------------------------------
  export function normalize(value: number): NormalizedMGA {
    return toNormalized(value);
  }
  
  // -----------------------------------------------------------------
  // Entitlement distribution — exact-sum invariant
  // -----------------------------------------------------------------
  //
  // Given a fee (any amount) and N cycles, returns N NormalizedMGA values
  // that sum EXACTLY to the fee. The remainder lands on the last cycle.
  //
  // Example: 4,500 with 4 cycles → [1,100, 1,100, 1,100, 1,200]
  //
  export function distributeEntitlements(
    feeMGA: number,
    cycleCount: number
  ): NormalizedMGA[] {
    if (cycleCount <= 0) throw new Error("Cycle count must be positive");
    if (feeMGA < 0) throw new Error("Fee must be non-negative");
  
    const step = OPERATIONAL_STEP;
    const base = Math.floor(feeMGA / cycleCount / step) * step;
    const remainder = feeMGA - base * cycleCount;
  
    const entitlements = Array<number>(cycleCount).fill(base);
    entitlements[cycleCount - 1] += remainder;
  
    return entitlements.map((v) => v as NormalizedMGA);
  }
  
  // -----------------------------------------------------------------
  // Split — operator is the remainder, invariant enforced
  // -----------------------------------------------------------------
  export interface SplitResult {
    operatorMGA: NormalizedMGA;
    ndayFeeMGA: NormalizedMGA;
    paymentCostMGA: NormalizedMGA;
  }
  
  export function splitEntitlement(
    entitlementMGA: number,
    platformFeePercent: number,
    paymentCostPercent: number
  ): SplitResult {
    const step = OPERATIONAL_STEP;
  
    const ndayFeeMGA =
      Math.round((entitlementMGA * platformFeePercent) / 100 / step) * step;
    const paymentCostMGA =
      Math.round((entitlementMGA * paymentCostPercent) / 100 / step) * step;
    const operatorMGA = entitlementMGA - ndayFeeMGA - paymentCostMGA;
  
    if (operatorMGA < 0) {
      throw new Error(
        `Negative operator share: entitlement=${entitlementMGA}, ` +
          `fee=${ndayFeeMGA}, payment=${paymentCostMGA}`
      );
    }
  
    return {
      operatorMGA: operatorMGA as NormalizedMGA,
      ndayFeeMGA: ndayFeeMGA as NormalizedMGA,
      paymentCostMGA: paymentCostMGA as NormalizedMGA,
    };
  }