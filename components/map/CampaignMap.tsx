"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { collection, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/components/auth//AuthProvider";

/* =========================
   TYPES
========================= */

export type Feature = {
  type: "Feature";
  properties: {
    id: string;
    name: string;
    type: string;
    geometryType: "POLYGON" | "CENTER_RADIUS";
    center?: [number, number] | null;
    radius?: number | null;
    operatorId?: string | null;
  };
  geometry: {
    coordinates?: any;
  } | null;
};

/* =========================
   DYNAMIC UI (SSR SAFE)
========================= */

const CampaignMapUI = dynamic(() => import("./CampaignMapUI"), {
  ssr: false,
});

/* =========================
   COMPONENT
========================= */

export default function CampaignMap({
  fokontanyFeatures = [],
}: {
  fokontanyFeatures?: Feature[];
}) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [selectedFokontany, setSelectedFokontany] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const { appUser } = useAuth();

  /* =========================
     GEOLOCATION (GPS)
  ========================= */

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!navigator.geolocation) {
      console.warn("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
      },
      (error) => {
        console.warn("Geolocation error:", error.message);
      }
    );
  }, []);

  /* =========================
     FIRESTORE REALTIME
  ========================= */

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (fokontanyFeatures.length > 0) {
      setFeatures(fokontanyFeatures);
      return;
    }

    const db = getDb();

    const unsubscribe = onSnapshot(
      collection(db, "campaigns"),
      (snapshot) => {
        const firestoreFeatures: Feature[] = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data() || {};

            return {
              type: "Feature" as const, // ✅ strict literal fix
              properties: {
                id: docSnap.id,
                name: data.name ?? docSnap.id,
                type: data.type ?? "URBAN",
                geometryType: data.geometryType ?? "CENTER_RADIUS",
                center: data.center ?? null,
                radius: data.radius ?? null,
                operatorId: data.operatorId ?? null,
              },
              geometry: data.geometry ?? null,
            };
          })
          .filter((feature) => {
            if (!appUser) return true;

            if (appUser.role === "OPERATOR") {
              return feature.properties.operatorId === appUser.uid;
            }

            return true;
          });

        setFeatures(firestoreFeatures);
      },
      (error) => {
        console.error("Campaign realtime error:", error);
        setFeatures([]);
      }
    );

    return () => unsubscribe();
  }, [fokontanyFeatures, appUser]);

  /* =========================
     MAP CENTER LOGIC
  ========================= */

  const fallbackCenter: [number, number] = [-18.8792, 47.5079];

  const mapCenter: [number, number] =
    userLocation ||
    (features.length > 0 && features[0].properties.center
      ? [
          features[0].properties.center[1],
          features[0].properties.center[0],
        ]
      : fallbackCenter);

  /* =========================
     RENDER
  ========================= */

  return (
    <CampaignMapUI
      features={features}
      selectedFokontany={selectedFokontany}
      setSelectedFokontany={setSelectedFokontany}
      mapCenter={mapCenter}
      userLocation={userLocation} // optional (for marker later)
    />
  );
}