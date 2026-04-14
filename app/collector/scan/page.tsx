"use client"

import { useState } from "react"
import QRScanner from "@/components/QRScanner"
import { createPickup } from "@/services/pickups"

export default function Page() {

  const [binId, setBinId] = useState<string>("")
  const [weight, setWeight] = useState<number>(0)

  const handleScan = (data: string) => {
    if (data) {
      setBinId(data)
    }
  }

  const submitPickup = async () => {

    if (!binId) return

    const pickup = {
      operator_id: "SAMVA",
      collector_id: "COL001",
      vehicle_id: "VEH001",
      bin_id: binId,
      waste_type: "organic",
      weight_kg: weight,
      timestamp: Date.now(),
      lat: -18.879,
      lng: 47.507
    }

    await createPickup(pickup)

    alert("Pickup recorded")
  }

  return (
    <div className="p-6">

      <h1 className="text-2xl font-bold mb-6">
        Scan Waste Bin
      </h1>

      <QRScanner onScan={handleScan} />

      {binId && (
        <div className="mt-6">

          <p className="mb-2">
            Bin ID: {binId}
          </p>

          <input
            type="number"
            placeholder="Weight (kg)"
            className="border p-2"
            onChange={(e) => setWeight(Number(e.target.value))}
          />

          <button
            className="bg-green-600 text-white p-2 ml-3"
            onClick={submitPickup}
          >
            Confirm Pickup
          </button>

        </div>
      )}

    </div>
  )
}