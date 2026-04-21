// types/user.ts



// ==============================
// Roles
// ==============================

export type Role =
  | "SUPER_ADMIN" 
  | "MUNICIPALITY_ADMIN"
  | "OPERATOR_ADMIN"
  | "COLLECTOR"
  | "CITIZEN"
  | "super_admin" 
  | "municipality_admin"
  | "operator_admin"
  | "collector"
  | "citizen";



// ==============================
// Firestore user doc
// ==============================

export interface UserDoc {

  role: Role;

  operatorId?: string;

  municipalityId?: string;

  collectorId?: string;

}



// ==============================
// AppUser (used in frontend)
// ==============================

export interface AppUser {

  uid: string;

  email: string;

  role: Role;

  operatorId?: string;

  municipalityId?: string;

  collectorId?: string;

}



// ==============================
// Custom claims (future)
// ==============================

export interface UserClaims {

  role: Role;

  operatorId?: string;

  municipalityId?: string;

}