// normalizeRole.ts

import { ROLES, type Role } from "@/lib/api/roles";

/**
 * STRICT normalization:
 * - Only accepts known values
 * - Throws if invalid (dev safety)
 * - Prevents miscoding and silent bugs
 */
export function normalizeRole(role?: string | null): Role {
  if (!role) {
    return "CITIZEN"; // or "anonymous"
  }

  const clean = role.trim().toLowerCase().replace(/[\s-]+/g, "_");

  const map: Record<string, Role> = {
    super_admin: ROLES.SUPER_ADMIN,
    operator_admin: ROLES.OPERATOR_ADMIN,
    municipality: ROLES.MUNICIPALITY_ADMIN,
    collector: ROLES.COLLECTOR,
    fokontany: ROLES.FOKONTANY,
    citizen: ROLES.CITIZEN,
  };

  const normalized = map[clean];

  if (!normalized) {
    throw new Error(
      `normalizeRole: invalid role "${role}". Allowed roles: ${Object.keys(map).join(", ")}`
    );
  }

  return normalized;
}