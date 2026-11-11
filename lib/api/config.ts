export interface ConfigPayload {
  pricingFramework: Record<string, unknown>;
  financialRules: Record<string, unknown>;
  operatorRequirements: Record<string, unknown>;
}

export async function createConfigDraft(
  campaignId: string, payload: ConfigPayload, idToken: string,
): Promise<{ ok: true; versionId: string; versionNumber: number }> {
  const res = await fetch(`/api/config/campaigns/${campaignId}/versions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`createConfigDraft failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function approveConfigVersion(
  versionId: string, decision: "APPROVED" | "REJECTED", rationale: string, idToken: string,
) {
  const res = await fetch(`/api/config/versions/${versionId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ decision, rationale }),
  });
  if (!res.ok) throw new Error(`approveConfigVersion failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function lockConfigVersion(versionId: string, idToken: string) {
  const res = await fetch(`/api/config/versions/${versionId}/lock`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(`lockConfigVersion failed: ${res.status} ${await res.text()}`);
  return res.json();
}
