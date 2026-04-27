"use client";

import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { getDb } from "@/lib/firebase";

import { StepProps } from "@/lib/audits/auditTypes";

import dynamic from "next/dynamic";

const Map = dynamic(
  () => import("./StepLocationMap"),
  { ssr: false }
);

const [db, setDb] = useState<any>(null);

useEffect(() => {
  const firestore = getDb();
  setDb(firestore);
}, []);

export default function StepLocation({
  form,
  setForm,
}: StepProps) {

  const [municipalities, setMunicipalities] =
    useState<any[]>([]);

  const [arrondissements, setArrondissements] =
    useState<any[]>([]);

  const [fokontany, setFokontany] =
    useState<any[]>([]);


  useEffect(() => {
    loadMunicipalities();
  }, []);


  async function loadMunicipalities() {

    const snap = await getDocs(
      collection(db, "municipalities")
    );

    setMunicipalities(
      snap.docs.map((d) => d.data())
    );
  }


  async function loadArrondissements(
    municipalityId: string
  ) {

    const snap = await getDocs(
      collection(db, "arrondissements")
    );

    const list = snap.docs
      .map((d) => d.data())
      .filter(
        (a: any) =>
          a.municipalityId === municipalityId
      );

    setArrondissements(list);
  }


  async function loadFokontany(
    parentId: string
  ) {

    const snap = await getDocs(
      collection(db, "fokontany")
    );

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

        <option>
          Municipality
        </option>

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

        <option>
          Arrondissement
        </option>

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

        <option>
          Fokontany
        </option>

        {fokontany.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}

      </select>


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