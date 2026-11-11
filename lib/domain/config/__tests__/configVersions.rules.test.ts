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

describe("Phase 1 — config version immutability", () => {
  it("rejects a client write to a LOCKED version", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "campaignConfigVersions/locked_1"), {
        campaignId: "camp1", versionNumber: 1, status: "LOCKED",
        pricingFramework: {}, financialRules: {}, operatorRequirements: {},
        contentHash: "deadbeef", createdBy: "t", createdAt: Date.now(),
      });
    });
    const asAdmin = env.authenticatedContext("a", { role: "ADMIN", admin: true }).firestore();
    await expect(
      updateDoc(doc(asAdmin, "campaignConfigVersions/locked_1"), { status: "DRAFT" })
    ).rejects.toThrow(/permission[-_ ]?denied/i);
  });

  it("rejects create from a client (any role)", async () => {
    const asAdmin = env.authenticatedContext("a", { role: "ADMIN", admin: true }).firestore();
    await expect(
      setDoc(doc(asAdmin, "campaignConfigVersions/new_1"), { campaignId: "c", status: "DRAFT" })
    ).rejects.toThrow(/permission[-_ ]?denied/i);
  });
});
