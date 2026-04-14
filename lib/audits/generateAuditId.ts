type GenerateAuditIdParams = {
    municipalityId: string;
    arrondissementId?: string;
    fokontanyId: string;
    counter?: number;
      operatorId?: string;
  };
  
  export function generateAuditId({
    municipalityId,
    arrondissementId,
    operatorId,
    fokontanyId,
    counter = 1,
  }: GenerateAuditIdParams): string {
  
    const num = String(counter).slice(-3);
  
    const arr = arrondissementId
      ? `-${arrondissementId}`
      : "";
  
    return `AUD${num}-${fokontanyId}${arr}-${municipalityId}`;
  }