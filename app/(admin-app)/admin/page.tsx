"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { getAuthClient, getDb } from "@/lib/firebase/firebaseApp";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [operators, setOperators] = useState<any[]>([]);

  useEffect(() => {
    // ✅ Initialize auth and db inside the effect (client‑only)
    const auth = getAuthClient();
    const db = getDb();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (!currentUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        setUser(currentUser);

        const snapshot = await getDocs(collection(db, "operators"));
        setOperators(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      } catch (err: any) {
        setError(err.message || "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div>Loading admin...</div>;
  if (!user) return <div>Please sign in to access admin.</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <h1>Admin</h1>
      <p>{operators.length} operators loaded</p>
    </div>
  );
}