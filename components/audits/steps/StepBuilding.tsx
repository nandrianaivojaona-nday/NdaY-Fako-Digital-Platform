"use client";

import { StepProps } from "@/lib/audits/auditTypes";

export default function StepBuilding({
  form,
  setForm,
}: StepProps) {

  return (
    <div>

      <h2>Building</h2>

      <input
        placeholder="Building name"
        value={form.buildingName}
        onChange={(e) =>
          setForm({
            ...form,
            buildingName: e.target.value,
          })
        }
      />

      <select
        value={form.buildingType}
        onChange={(e) =>
          setForm({
            ...form,
            buildingType: e.target.value,
          })
        }
      >
        <option value="">
          Type
        </option>

        <option value="villa">
          Villa
        </option>

        <option value="apartment">
          Apartment
        </option>

        <option value="commercial">
          Commercial
        </option>

        <option value="school">
          School
        </option>

        <option value="office">
          Office
        </option>

        <option value="market">
          Market
        </option>

      </select>


      <input
        type="number"
        placeholder="People"
        value={form.estimatedPeople}
        onChange={(e) =>
          setForm({
            ...form,
            estimatedPeople:
              Number(e.target.value),
          })
        }
      />


      <h3>Contact</h3>

      <input
        placeholder="Owner name"
        value={form.ownerName}
        onChange={(e) =>
          setForm({
            ...form,
            ownerName: e.target.value,
          })
        }
      />

      <input
        placeholder="Phone"
        value={form.phone}
        onChange={(e) =>
          setForm({
            ...form,
            phone: e.target.value,
          })
        }
      />

    </div>
  );
}