import { Dispatch, SetStateAction } from "react";
export type AuditForm = {

    campaignId: string;
  
    municipalityId: string;
    arrondissementId: string;
    fokontanyId: string;
  
    clusterName: string;
    address: string;
  
    latitude: number | null;
    longitude: number | null;
  
    buildingName: string;
    buildingType: string;
  
    estimatedPeople: number;
  
    ownerName: string;
    phone: string;
  
    planId: string;
  
    salesStatus: string;
    auditStatus: string;

    // NEW FIELDS FOR DISSECTION
    deploymentScore: number;
    isProfitable: boolean;
    operatorId?: string; // Optional field to track assigned operator
    onNext?: () => void; // Optional callback for steps that need to trigger the next step
  
  };
  
  
  export type StepProps = {
    form: AuditForm;
    setForm: Dispatch<SetStateAction<AuditForm>>;
    onNext?: () => void; // Optional: For steps that need to trigger the next step
  };