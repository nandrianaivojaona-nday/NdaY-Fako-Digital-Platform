// Territory-scoped operator validation. Created by stake promotion.
// Operator is valid ONLY in the territory where they staked in.
export interface OperatorTerritoryValidation {
  id: string;                     // {operatorId}_{territoryId}
  operatorId: string;
  territoryId: string;            // = scenario.clusterId
  fokontanyId: string;            // bridge to citizen/campaign fokontany
  campaignId: string;             // the campaign that produced the lock
  stakeId: string;
  tveRunId: string;
  scenarioId: string;
  configVersionId: string;        // LOCKED version of the campaign's config
  validated: true;
  validatedAt: number;
  validatedBy: string;
}
export function validationId(operatorId: string, territoryId: string): string {
  return `${operatorId}_${territoryId}`;
}
