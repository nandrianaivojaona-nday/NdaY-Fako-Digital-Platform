/// roles.ts

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MUNICIPALITY_ADMIN: "MUNICIPALITY_ADMIN",
  OPERATOR_ADMIN: "OPERATOR_ADMIN",
  OPERATOR: "OPERATOR",
  COLLECTOR: "COLLECTOR",
  FOKONTANY: "FOKONTANY",
  CITIZEN: "CITIZEN"
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];


// --------------------
// 🔹 ROLE NORMALIZATION
// --------------------

export function normalizeRole(role?: string): Role | null {
  if (!role) return null;

  const clean = role
    .trim()
    .toLowerCase()
    .replace(/[\s-]/g, "_");

  const map: Record<string, Role> = {
    admin: ROLES.OPERATOR_ADMIN,
    operator_admin: ROLES.OPERATOR_ADMIN,
    operatoradmin: ROLES.OPERATOR_ADMIN,

    super_admin: ROLES.SUPER_ADMIN,
    superadmin: ROLES.SUPER_ADMIN,

    municipality_admin: ROLES.MUNICIPALITY_ADMIN,
    municipalityadmin: ROLES.MUNICIPALITY_ADMIN,

    collector: ROLES.COLLECTOR,
  };

  return map[clean] ?? null;
}

// --------------------
// 🔹 ROLE HIERARCHY
// --------------------

export const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 3,
  OPERATOR: 2,
  COLLECTOR: 1,
  MUNICIPALITY_ADMIN: 0,
  OPERATOR_ADMIN: 0,
  CITIZEN: 0,
  ADMIN: 0,
  FOKONTANY: 0,
};

// --------------------
// 🔹 GENERIC ACCESS CHECK
// --------------------

export function hasRoleLevel(
  userRole: Role | undefined,
  requiredRole: Role
): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// --------------------
// 🔹 EXTENDED USER TYPE
// --------------------

export type AuthUser = {
  role?: Role;
  operatorId?: string;
  municipalityId?: string;
  isOperatorAdmin?: boolean;
  isMunicipalityAdmin?: boolean;
};

// --------------------
// 🔹 HIGH-LEVEL ACCESS HELPERS
// --------------------

// ✅ Platform admin
export function isPlatformAdmin(user?: AuthUser | null) {
  return user?.role === "SUPER_ADMIN";
}

// ✅ Operator member
export function isOperator(user?: AuthUser | null) {
  return user?.role === "OPERATOR";
}

// ✅ Operator admin (VERY IMPORTANT)
export function isOperatorAdmin(user?: AuthUser | null) {
  return user?.role === "OPERATOR" && user?.isOperatorAdmin === true;
}

// ✅ Municipality admin
export function isMunicipalityAdmin(user?: AuthUser | null) {
  return user?.isMunicipalityAdmin === true;
}

// ✅ Collector
export function isCollector(user?: AuthUser | null) {
  return user?.role === "COLLECTOR";
}

// --------------------
// 🔹 CONTEXT CHECKS (multi-tenant safety)
// --------------------

// Ensure user belongs to the same operator
export function belongsToOperator(
  user: AuthUser | null | undefined,
  operatorId: string | undefined
) {
  if (!user || !operatorId) return false;
  return user.operatorId === operatorId;
}

// Ensure user belongs to municipality
export function belongsToMunicipality(
  user: AuthUser | null | undefined,
  municipalityId: string | undefined
) {
  if (!user || !municipalityId) return false;
  return user.municipalityId === municipalityId;
}

// --------------------
// 🔹 SAFE ACCESS COMBINATIONS
// --------------------

// Operator dashboard access
export function canAccessOperatorDashboard(user?: AuthUser | null) {
  return isPlatformAdmin(user) || isOperator(user);
}

// Operator management (strong permission)
export function canManageOperator(user?: AuthUser | null) {
  return isPlatformAdmin(user) || isOperatorAdmin(user);
}

// Municipality management
export function canManageMunicipality(user?: AuthUser | null) {
  return isPlatformAdmin(user) || isMunicipalityAdmin(user);
}

// Campaign execution
export function canExecuteCollection(user?: AuthUser | null) {
  return isCollector(user);
}
