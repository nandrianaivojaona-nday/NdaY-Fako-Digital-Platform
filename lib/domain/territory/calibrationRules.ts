// lib/domain/territory/calibrationRules.ts
import type { Cluster, TerritorialViability } from "./types";
import { getReferencePlan } from "../subscription/planTypes";

export interface CalibratedPrice {
  planTypeId: string;
  monthlyPriceMGA?: number;
  contractPriceMGA?: number;
  perPickupPriceMGA?: number;
  rationale: string;
  withinWindow: boolean;
}

export function calibratePlanPrice(
  cluster: Cluster,
  viability: TerritorialViability,
  planTypeId: string
): CalibratedPrice {
  const plan = getReferencePlan(planTypeId);
  const { floorMGA, ceilingMGA, recommendedMGA } = viability.priceWindow;
  const warnings: string[] = [];
  let price: number = Number(recommendedMGA);
  let rationale = "";

  switch (plan.audience) {
    case "HOUSEHOLD":
      price = recommendedMGA;
      rationale = `Household price from LAA/OCD window [${floorMGA.toLocaleString()}–${ceilingMGA.toLocaleString()}].`;
      break;
    case "BUSINESS":
      price = Math.min(
        Math.round((recommendedMGA * 3.2) / 500) * 500,
        Math.round((Number(viability.laa.rawLaaMGA) * 5) / 500) * 500
      );
      rationale = `B2B = 3.2× household, capped at 5× LAA.`;
      break;
    case "INSTITUTION":
      if (cluster.pcd.communeAnnualWasteBudgetMGA && cluster.totalHouseholds > 0) {
        const annual = cluster.pcd.communeAnnualWasteBudgetMGA * 0.22;
        price = Math.round((annual / cluster.totalHouseholds / 12) / 500) * 500;
        rationale = `B2G = 22% of commune waste budget ÷ HH ÷ 12.`;
      } else {
        price = Math.round((recommendedMGA * 5) / 500) * 500;
        rationale = `B2G = 5× household (no budget on file).`;
        warnings.push("No commune waste budget — B2G price is an estimate.");
      }
      break;
  }

  let withinWindow = true;
  if (plan.audience === "HOUSEHOLD") {
    if (price < floorMGA) { price = Math.ceil(Number(floorMGA) / 500) * 500; withinWindow = false; }
    if (price > ceilingMGA) { price = Number(ceilingMGA); withinWindow = false; }
  }

  return {
    planTypeId,
    monthlyPriceMGA: plan.defaultBilling === "monthly" ? price : undefined,
    contractPriceMGA: plan.defaultBilling !== "monthly" && plan.defaultBilling !== "per_pickup" ? price : undefined,
    perPickupPriceMGA: plan.defaultBilling === "per_pickup" ? Math.round(price / 4 / 100) * 100 : undefined,
    rationale: rationale + (warnings.length ? ` ⚠ ${warnings.join(" ")}` : ""),
    withinWindow,
  };
}
