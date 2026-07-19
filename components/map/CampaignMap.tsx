"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { collection, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firebaseApp";
import { useAuth } from "@/hooks/useAuth";
import * as turf from "@turf/turf";
import type { BBox, Feature as GeoJSONFeature, Geometry, Point } from "geojson";

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
  geometry: Geometry | null;
};

type CameraMode = "gps" | "campaign";

import type { CampaignMapUIProps } from "./CampaignMapUI";

const CampaignMapUI = dynamic<CampaignMapUIProps>(
  () => import("./CampaignMapUI"),
  { ssr: false }
);


export default function CampaignMap({
  fokontanyFeatures = [],
  isVisible = false,
  campaignId,
}: {
  fokontanyFeatures?: Feature[];
  isVisible?: boolean;
  campaignId?: string;
}) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [selectedFokontany, setSelectedFokontany] = useState<string | null>(campaignId ?? null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const { user } = useAuth();
  const appUser = user;

  useEffect(() => {
    setSelectedFokontany(campaignId ?? null);
  }, [campaignId]);

  const campaignFeatures = useMemo(() => {
    if (fokontanyFeatures.length > 0) return fokontanyFeatures;
    return features;
  }, [fokontanyFeatures, features]);

  const fokontanyGeoJSON = useMemo<GeoJSONFeature | null>(() => {
    const polygons = campaignFeatures
      .filter(
        (f) =>
          f.geometry &&
          f.properties.geometryType === "POLYGON" &&
          (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
      )
      .map((f) => ({
        type: "Feature" as const,
        geometry: f.geometry as Geometry,
        properties: {
          id: f.properties.id,
          name: f.properties.name,
        },
      }));

    if (polygons.length === 0) return null;
    if (polygons.length === 1) return polygons[0] as GeoJSONFeature;

    return polygons.reduce<GeoJSONFeature | null>((acc, feature) => {
      if (!acc) return feature as GeoJSONFeature;
      try {
        const merged = turf.union(turf.featureCollection([acc as any, feature as any]));
        return (merged as GeoJSONFeature) ?? acc;
      } catch {
        return acc;
      }
    }, null);
  }, [campaignFeatures]);

  const fokontanyBBox = useMemo<BBox | null>(() => {
    if (!fokontanyGeoJSON) return null;
    return turf.bbox(fokontanyGeoJSON) as BBox;
  }, [fokontanyGeoJSON]);

  const gpsPoint = useMemo(() => {
    if (!userLocation) return null;
    return turf.point([userLocation[1], userLocation[0]]) as GeoJSONFeature<Point>;
  }, [userLocation]);

  const isGpsInsideFokontany = useMemo(() => {
    if (!gpsPoint || !fokontanyGeoJSON) return false;
    try {
      return turf.booleanPointInPolygon(gpsPoint, fokontanyGeoJSON as any);
    } catch {
      return false;
    }
  }, [gpsPoint, fokontanyGeoJSON]);

  const isInsideFokontany = (geometry: Geometry) => {
    if (!fokontanyGeoJSON) return true;
    try {
      if (geometry.type === "Point") {
        return turf.booleanPointInPolygon(turf.feature(geometry as Point), fokontanyGeoJSON as any);
      }
      return turf.booleanWithin(turf.feature(geometry), fokontanyGeoJSON as any);
    } catch {
      return false;
    }
  };

  const campaignFallbackCenter: [number, number] = useMemo(() => {
    if (fokontanyBBox) {
      return [
        (fokontanyBBox[1] + fokontanyBBox[3]) / 2,
        (fokontanyBBox[0] + fokontanyBBox[2]) / 2,
      ];
    }

    const centerFeature = campaignFeatures.find((f) => f.properties.center);
    if (centerFeature?.properties.center) {
      return [
        centerFeature.properties.center[1],
        centerFeature.properties.center[0],
      ];
    }

    return [-18.8792, 47.5079];
  }, [campaignFeatures, fokontanyBBox]);

  const cameraMode: CameraMode = isGpsInsideFokontany ? "gps" : "campaign";

  const mapCenter: [number, number] =
    cameraMode === "gps" && userLocation ? userLocation : campaignFallbackCenter;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
      },
      (error) => {
        console.warn("Geolocation error:", error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

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
              type: "Feature" as const,
              properties: {
                id: docSnap.id,
                name: data.name ?? docSnap.id,
                type: data.type ?? "URBAN",
                geometryType: data.geometryType ?? "CENTER_RADIUS",
                center: data.center ?? null,
                radius: data.radius ?? null,
                operatorId: data.operatorId ?? null,
              },
              geometry: (data.geometry ?? null) as Geometry | null,
            };
          })
          .filter((feature) => {
            if (!appUser) return true;
            if (appUser.role === "OPERATOR") {
              return feature.properties.operatorId === appUser.id;
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

  return (
    <CampaignMapUI
      key={campaignId ?? selectedFokontany ?? "campaign-map"}
      features={campaignFeatures}
      selectedFokontany={selectedFokontany}
      setSelectedFokontany={setSelectedFokontany}
      mapCenter={mapCenter}
      userLocation={userLocation}
      fokontanyBoundary={fokontanyGeoJSON}
      fokontanyBBox={fokontanyBBox}
      isInsideFokontany={isInsideFokontany}
      isVisible={isVisible}
      cameraMode={cameraMode}
      isGpsInsideFokontany={isGpsInsideFokontany}
    />
  );
}
