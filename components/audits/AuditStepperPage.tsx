"use client";

import { useState } from "react";

import StepCampaign from "./steps/StepCampaign";
import StepLocation from "./steps/StepLocation";
import StepBuilding from "./steps/StepBuilding";
import StepEvaluation from "./steps/StepEvlauation";
import StepRecommendation from "./steps/StepRecommendation";
import StepConfirm from "./steps/StepConfirm";

import { AuditForm } from "@/lib/domain/audits/auditTypes";
import { saveAudit } from "@/lib/domain/audits/auditHelpers";


export default function AuditStepperPage() {

  const [step, setStep] = useState(0);

  

  // Inside AuditStepperPage.tsx

// 1. Add a state for the profitability analysis
const [viability, setViability] = useState({
  score: 0,
  isWorthIt: false,
  estimatedMargin: 0
});

// 2. Logic to run BEFORE showing the Recommendation step
const dissectAndAnalyze = () => {
  const people = form.estimatedPeople;
  const type = form.buildingType;
  
  // Basic Logic: Estimate daily kg (0.5kg per person)
  const estDailyKg = people * 0.5;
  
  // Profitability check: Commercial/Large Residential in dense clusters (Ankadimbahoaka)
  // are high value. Remote villas are lower margin.
  let score = 0;
  if (type === 'commercial' || type === 'market') score += 50;
  if (people > 10) score += 30;
  if (form.clusterName.toLowerCase().includes('ankadimbahoaka')) score += 20;

  setViability({
    score: score,
    isWorthIt: score > 40,
    estimatedMargin: score // Simplified for the UI
  });
  
  setStep(4); // Move to Recommendation
};

  const [form, setForm] = useState<AuditForm>({

    campaignId: "",
  
    municipalityId: "",
    arrondissementId: "",
    fokontanyId: "",
  
    clusterName: "",
    address: "",
  
    latitude: null,
    longitude: null,
  
    buildingName: "",
    buildingType: "",
  
    estimatedPeople: 0,
  
    ownerName: "",
    phone: "",
  
    planId: "",
  
    salesStatus: "audited",
    auditStatus: "draft",

    // NEW FIELDS FOR DISSECTION
    deploymentScore: 0,
    isProfitable: false,

    onNext: dissectAndAnalyze, // Pass the analysis function to the evaluation step
  
  });

  // The "Dissection" Logic
  const runProfitabilityAnalysis = () => {
    let score = 0;
    const people = form.estimatedPeople;
    
    // Weight 1: Volume (Capacity)
    if (people > 20) score += 40;
    else if (people > 5) score += 20;

    // Weight 2: Building Type (Commercial margin is higher)
    if (form.buildingType === "commercial" || form.buildingType === "market") score += 30;
    if (form.buildingType === "villa") score += 10;

    // Weight 3: Commitment (Sales intent)
    if (form.salesStatus === "accepted") score += 30;

    setForm(prev => ({
      ...prev,
      deploymentScore: score,
      isProfitable: score >= 50
    }));

    setStep(4); // Advance to Recommendation
  };

  async function saveDraft() {
    await saveAudit(form, "draft");
  }

  async function saveCompleted() {
    await saveAudit(form, "completed");
  }


  return (
    <div>

      {step === 0 && (
        <StepCampaign form={form} setForm={setForm} />
      )}

      {step === 1 && (
        <StepLocation form={form} setForm={setForm} />
      )}

      {step === 2 && (
        <StepBuilding form={form} setForm={setForm} />
      )}

      {step === 3 && (
        <StepEvaluation form={form} setForm={setForm}
        onNext={runProfitabilityAnalysis} />
      )}

      {step === 4 && (
        <StepRecommendation form={form} setForm={setForm} />
      )}

      {step === 5 && (
        <StepConfirm
          saveDraft={saveDraft}
          saveCompleted={saveCompleted}
        />
      )}

      <button onClick={() => setStep(step - 1)}>
        Back
      </button>

      <button onClick={() => setStep(step + 1)}>
        Next
      </button>

    </div>
  );
}