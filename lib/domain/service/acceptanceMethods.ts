// lib/domain/service/acceptanceMethods.ts
export type AcceptanceMethod =
  | "CITIZEN_APP" | "CITIZEN_USSD" | "CITIZEN_SMS_OTP"
  | "AUTHORIZED_REPRESENTATIVE_SIGNATURE" | "INSTITUTIONAL_VALIDATION"
  | "SUPERVISOR_ACCEPTANCE" | "AUTO_ACCEPT_CONTRACTUAL";

export type AcceptanceStatus =
  | "PENDING" | "ACCEPTED" | "AUTO_ACCEPTED"
  | "DISPUTED" | "REJECTED" | "WAIVED";

export interface AcceptancePolicy {
  methods: AcceptanceMethod[];
  windowHours: number;
  allowAutoAccept: boolean;
  supervisorEscalationHours: number;
  institutionalValidationRequired?: boolean;
}