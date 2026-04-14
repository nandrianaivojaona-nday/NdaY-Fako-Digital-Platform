// types/operator.ts



// ==============================
// Operator status
// ==============================

export type OperatorStatus =
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED";



// ==============================
// Operator type
// ==============================

export type OperatorType =
  | "private"
  | "municipal"
  | "ngo";



// ==============================
// Operator
// ==============================

export interface Operator {

  id: string;

  name: string;

  city?: string;

  municipalityId?: string;

  type?: OperatorType;

  status?: OperatorStatus;

  isPublic?: boolean;

  logoUrl?: string;

  phone?: string;

  email?: string;

}