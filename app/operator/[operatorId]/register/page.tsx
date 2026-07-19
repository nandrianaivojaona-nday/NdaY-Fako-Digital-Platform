"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getDb } from "@/lib/firebase/firebaseApp"
import { collection, addDoc } from "firebase/firestore"

export default function RegisterOperator() {
  const db = getDb
  const router = useRouter()

  const [name, setName] = useState("")
  const [city, setCity] = useState("")
  const [phone, setPhone] = useState("")
  const [type, setType] = useState("private")

  const registerOperator = async () => {

    const docRef = await addDoc(collection(db(), "operators"), {
      name,
      city,
      phone,
      type,
      created_at: Date.now()
    })

    alert("Operator registered")

    router.push(`/operator/wms?operator=${docRef.id}`)
  }

  return (
    <div className="p-10">

      <h1 className="text-2xl font-bold mb-6">
        Register Waste Operator
      </h1>

      <input
        placeholder="Company Name"
        className="border p-2 mb-3 block"
        onChange={(e)=>setName(e.target.value)}
      />

      <input
        placeholder="City"
        className="border p-2 mb-3 block"
        onChange={(e)=>setCity(e.target.value)}
      />

      <input
        placeholder="Phone"
        className="border p-2 mb-3 block"
        onChange={(e)=>setPhone(e.target.value)}
      />

      <select
        className="border p-2 mb-3"
        onChange={(e)=>setType(e.target.value)}
      >
        <option value="private">Private Operator</option>
        <option value="municipal">Municipal Service</option>
        <option value="cooperative">Community Cooperative</option>
      </select>

      <button
        className="bg-green-600 text-white px-4 py-2"
        onClick={registerOperator}
      >
        Register Operator
      </button>

    </div>
  )
}