import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { initializeTestEnvironment, RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import * as fs from "node:fs";

let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "nday-fako-test",
    firestore: { host: "localhost", port: 8080, rules: fs.readFileSync("fireStore.rules", "utf8") },
  });
});
afterAll(async () => { await env?.cleanup(); });

describe("Phase 2 prereq — operatorTerritoryValidations immutability", () => {
  it("rejects a client write to an existing validation", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "operatorTerritoryValidations/op1_cluster1"), {
        operatorId: "op1", territoryId: "cluster1", fokontanyId: "fk1",
        campaignId: "camp1", stakeId: "s1", tveRunId: "t1", scenarioId: "sc1",
        configVersionId: "v1", validated: true, validatedAt: Date.now(), validatedBy: "u1",
      });
    });
    const asAdmin = env.authenticatedContext("a", { role: "ADMIN", admin: true }).firestore();
    await expect(
      updateDoc(doc(asAdmin, "operatorTerritoryValidations/op1_cluster1"), { validated: false })
    ).rejects.toThrow(/permission[-_ ]?denied/i);
  });
  it("rejects create from a client", async () => {
    const asAdmin = env.authenticatedContext("a", { role: "ADMIN", admin: true }).firestore();
    await expect(
      setDoc(doc(asAdmin, "operatorTerritoryValidations/new_1"), { operatorId: "x", territoryId: "y" })
    ).rejects.toThrow(/permission[-_ ]?denied/i);
  });
});
