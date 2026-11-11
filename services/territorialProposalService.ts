/** @deprecated Use stakeService and businessModelService for all proposals. */
export async function getMICSProfile(_communeId: string): Promise<never> {
  throw new Error("The MICS proposal flow is deprecated; use the stake and business model workflow.");
}

/** @deprecated Use stakeService and businessModelService for all proposals. */
export async function generateProposalsForCommune(_communeId: string): Promise<never> {
  throw new Error("The MICS proposal flow is deprecated; use the stake and business model workflow.");
}
