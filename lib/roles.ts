// lib/roles.ts

import { Role, AppUser } from "@/types/user";



// ==============================
// Role constants (values)
// ==============================

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN" as Role,
  MUNICIPALITY_ADMIN: "MUNICIPALITY_ADMIN" as Role,
  OPERATOR_ADMIN: "OPERATOR_ADMIN" as Role,
  COLLECTOR: "COLLECTOR" as Role,
  CITIZEN: "CITIZEN" as Role,
};



// ==============================
// Helpers
// ==============================

export function isSuperAdmin(user?: AppUser | null) {
  return user?.role === ROLES.SUPER_ADMIN;
}

export function isMunicipalityAdmin(user?: AppUser | null) {
  return user?.role === ROLES.MUNICIPALITY_ADMIN;
}

export function isOperatorAdmin(user?: AppUser | null) {
  return user?.role === ROLES.OPERATOR_ADMIN;
}

export function isCollector(user?: AppUser | null) {
  return user?.role === ROLES.COLLECTOR;
}

export function isCitizen(user?: AppUser | null) {
  return user?.role === ROLES.CITIZEN;
}



// ==============================
// Access checks
// ==============================

export function canAccessOperator(
  user?: AppUser | null,
  operatorId?: string
) {
  if (!user) return false;

  if (user.role === ROLES.SUPER_ADMIN) return true;

  if (
    user.role === ROLES.OPERATOR_ADMIN &&
    user.operatorId === operatorId
  ) {
    return true;
  }

  return false;
}



export function canAccessMunicipality(
  user?: AppUser | null,
  municipalityId?: string
) {
  if (!user) return false;

  if (user.role === ROLES.SUPER_ADMIN) return true;

  if (
    user.role === ROLES.MUNICIPALITY_ADMIN &&
    user.municipalityId === municipalityId
  ) {
    return true;
  }

  return false;
}



export function canAccessCollector(
  user?: AppUser | null,
  collectorId?: string
) {
  if (!user) return false;

  if (user.role === ROLES.SUPER_ADMIN) return true;

  if (
    user.role === ROLES.COLLECTOR &&
    user.collectorId === collectorId
  ) {
    return true;
  }

  return false;
}