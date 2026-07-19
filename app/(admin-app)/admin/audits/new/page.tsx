"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

/* -------------------- TYPES -------------------- */

type AuditForm = {
  campaignId: string;

  municipalityId: string;
  arrondissementId: string;
  fokontanyId: string;

  clusterName: string;
  address: string;

  buildingName: string;
  buildingType: string;

  estimatedPeople: number;

  ownerName: string;
  phone: string;

  salesStatus: string;
  auditStatus: string;
};

type StepProps = {
  form: AuditForm;
  setForm: React.Dispatch<React.SetStateAction<AuditForm>>;
};



/* -------------------- STEP: LOCATION -------------------- */

function StepLocation({ form, setForm }: StepProps) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [arrondissements, setArrondissements] = useState<any[]>([]);
  const [fokontany, setFokontany] = useState<any[]>([]);
  const [db, setDb] = useState<any>(null);

  useEffect(() => {
    const firestore = getDb();
    setDb(firestore);
  }, []);
  useEffect(() => {
    loadCampaigns();
    loadMunicipalities();
  }, []);

  async function loadCampaigns() {
    const snap = await getDocs(collection(db, "audit_campaigns"));
    setCampaigns(snap.docs.map((d) => d.data()));
  }

  async function loadMunicipalities() {
    const snap = await getDocs(collection(db, "municipalities"));
    setMunicipalities(snap.docs.map((d) => d.data()));
  }

  async function loadArrondissements(municipalityId: string) {
    const snap = await getDocs(collection(db, "arrondissements"));

    const list = snap.docs
      .map((d) => d.data())
      .filter((a: any) => a.municipalityId === municipalityId);

    setArrondissements(list);
  }

  async function loadFokontany(parentId: string) {
    const snap = await getDocs(collection(db, "fokontany"));

    const list = snap.docs
      .map((d) => d.data())
      .filter(
        (f: any) =>
          f.arrondissementId === parentId ||
          f.municipalityId === parentId
      );

    setFokontany(list);
  }

  return (
    <div>
      <h2>Location</h2>

      {/* Campaign */}
      <select
        value={form.campaignId}
        onChange={(e) =>
          setForm({ ...form, campaignId: e.target.value })
        }
      >
        <option value="">Select campaign</option>

        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Municipality */}
      <select
        value={form.municipalityId}
        onChange={(e) => {
          const id = e.target.value;

          setForm({
            ...form,
            municipalityId: id,
            arrondissementId: "",
            fokontanyId: "",
          });

          loadArrondissements(id);
          loadFokontany(id);
        }}
      >
        <option>Municipality</option>

        {municipalities.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>

      {/* Arrondissement */}
      <select
        value={form.arrondissementId}
        onChange={(e) => {
          const id = e.target.value;

          setForm({
            ...form,
            arrondissementId: id,
            fokontanyId: "",
          });

          loadFokontany(id);
        }}
      >
        <option>Arrondissement (optional)</option>

        {arrondissements.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>

      {/* Fokontany */}
      <select
        value={form.fokontanyId}
        onChange={(e) =>
          setForm({
            ...form,
            fokontanyId: e.target.value,
          })
        }
      >
        <option>Fokontany</option>

        {fokontany.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>

      {/* Cluster */}
      <input
        placeholder="Cluster"
        value={form.clusterName}
        onChange={(e) =>
          setForm({
            ...form,
            clusterName: e.target.value,
          })
        }
      />
    </div>
  );
}

/* -------------------- STEP: BUILDING -------------------- */

function StepBuilding({ form, setForm }: StepProps) {
  return (
    <div>
      <h2>Building</h2>

      <input
        placeholder="Building name"
        value={form.buildingName}
        onChange={(e) =>
          setForm({ ...form, buildingName: e.target.value })
        }
      />

      <select
        value={form.buildingType}
        onChange={(e) =>
          setForm({ ...form, buildingType: e.target.value })
        }
      >
        <option value="">Type</option>
        <option value="villa">Villa</option>
        <option value="apartment">Apartment</option>
        <option value="commercial">Commercial</option>
      </select>

      <input
        placeholder="People"
        onChange={(e) =>
          setForm({
            ...form,
            estimatedPeople: Number(e.target.value),
          })
        }
      />
    </div>
  );
}

/* -------------------- STEP: CONTACTS -------------------- */

function StepContacts({ form, setForm }: StepProps) {
  return (
    <div>
      <h2>Contacts</h2>

      <input
        placeholder="Owner"
        onChange={(e) =>
          setForm({ ...form, ownerName: e.target.value })
        }
      />

      <input
        placeholder="Phone"
        onChange={(e) =>
          setForm({ ...form, phone: e.target.value })
        }
      />
    </div>
  );
}

/* -------------------- STEP: SALES -------------------- */

function StepSales({ form, setForm }: StepProps) {
  return (
    <div>
      <h2>Sales</h2>

      <select
        value={form.salesStatus}
        onChange={(e) =>
          setForm({
            ...form,
            salesStatus: e.target.value,
          })
        }
      >
        <option value="audited">Audited</option>
        <option value="interested">Interested</option>
        <option value="proposal_sent">Proposal Sent</option>
        <option value="accepted">Accepted</option>
        <option value="rejected">Rejected</option>
      </select>
    </div>
  );
}

/* -------------------- STEP: VALIDATE -------------------- */

function StepValidate({
  saveDraft,
  saveCompleted,
}: {
  saveDraft: () => void;
  saveCompleted: () => void;
}) {
  return (
    <div>
      <h2>Validate</h2>

      <button onClick={saveDraft}>Save Draft</button>
      <button onClick={saveCompleted}>Save Completed</button>
    </div>
  );
}

/* -------------------- PAGE -------------------- */

export default function Page() {
  const [step, setStep] = useState(0);

  const [form, setForm] = useState<AuditForm>({
    campaignId: "",

    municipalityId: "",
    arrondissementId: "",
    fokontanyId: "",

    clusterName: "",
    address: "",

    buildingName: "",
    buildingType: "",

    estimatedPeople: 0,

    ownerName: "",
    phone: "",

    salesStatus: "audited",
    auditStatus: "draft",
  });

  function saveDraft() {
    const audit = {
      ...form,
      auditStatus: "draft",
      createdAt: Date.now(),
    };

    console.log("SAVE DRAFT", audit);
  }

  function saveCompleted() {
    const audit = {
      ...form,
      auditStatus: "completed",
      createdAt: Date.now(),
    };

    console.log("SAVE COMPLETED", audit);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">New Audit</h1>

      {step === 0 && <StepLocation form={form} setForm={setForm} />}
      {step === 1 && <StepBuilding form={form} setForm={setForm} />}
      {step === 2 && <StepContacts form={form} setForm={setForm} />}
      {step === 3 && <StepSales form={form} setForm={setForm} />}
      {step === 4 && (
        <StepValidate
          saveDraft={saveDraft}
          saveCompleted={saveCompleted}
        />
      )}

      <div className="flex gap-2 mt-6">
        <button
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
        >
          Back
        </button>

        <button
          disabled={step === 4}
          onClick={() => setStep(step + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}