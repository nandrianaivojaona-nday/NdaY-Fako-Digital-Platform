import { db } from "./firebase"
import { collection, addDoc } from "firebase/firestore"
import { Pickup } from "../types/models"

export const createPickup = async (pickup: Pickup) => {
  try {
    const docRef = await addDoc(collection(db, "pickups"), pickup)
    return docRef.id
  } catch (error) {
    console.error("Error adding pickup:", error)
  }
}