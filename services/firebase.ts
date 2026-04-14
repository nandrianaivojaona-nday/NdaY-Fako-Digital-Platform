import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "XXXX",
  authDomain: "nday-fako.firebaseapp.com",
  projectId: "nday-fako",
  storageBucket: "nday-fako.appspot.com",
  messagingSenderId: "XXXX",
  appId: "XXXX"
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const auth = getAuth(app)