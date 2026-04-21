"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// 🔥 Dynamic imports (SSR SAFE)
const MapContainer = dynamic(
  () =>
    import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Polygon = dynamic(
  () => import("react-leaflet").then((m) => m.Polygon),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((m) => m.Circle),
  { ssr: false }
);

// ✅ Firestore imports
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

// 🔷 TYPES (unchanged)
type Feature = {
  type: "Feature";
  properties: {
    id: string;
    name: string;
    type: "URBAN" | "RURAL";
    geometryType: "POLYGON" | "CENTER_RADIUS";
    center?: [number, number];
    radius?: number;
  };
  geometry:
    | {
        type: "Polygon";
        coordinates: number[][][];
      }
    | null;
};

type Props = {
  fokontanyFeatures?: Feature[];
  selectedFokontany: string | null;
  setSelectedFokontany?: (id: string) => void;
};

export default function CampaignMap({
  fokontanyFeatures = [],
  selectedFokontany,
  setSelectedFokontany,
}: Props) {
  const [isClient, setIsClient] = useState(false);
  const [features, setFeatures] = useState<Feature[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // ✅ Fetch from Firestore if no prop data
  useEffect(() => {
    const fetchCampaignData = async () => {
      if (fokontanyFeatures.length > 0) {
        setFeatures(fokontanyFeatures);
        return; // Use prop data first
      }

      try {
        const snapshot = await getDocs(collection(db, "campaigns"));
        const firestoreFeatures: Feature[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            type: "Feature",
            properties: {
              id: doc.id,
              name: data.name || doc.id,
              type: data.type || "URBAN",
              geometryType: data.geometryType || "CENTER_RADIUS",
              center: data.center,
              radius: data.radius,
            },
            geometry: data.geometry,
          };
        });
        setFeatures(firestoreFeatures);
      } catch (error) {
        console.error("Firestore fetch error:", error);
        setFeatures([]); // Graceful fallback
      }
    };

    fetchCampaignData();
  }, [fokontanyFeatures.length]);

  if (!isClient) return null;

  // ✅ Hybrid data source (prop OR firestore) - Format EVERYTHING consistently
  const rawFeatures = fokontanyFeatures.length > 0
    ? fokontanyFeatures
    : features;

  const safeFeatures: Feature[] = rawFeatures.map((f: any) => {
    // Check standard GeoJSON geometry type first, fallback to properties if it's already formatted
    const isPolygon =
      f.geometry?.type === "Polygon" || f.properties?.geometryType === "POLYGON";

    return {
      type: "Feature",
      properties: {
        id: f.properties?.id,
        name: f.properties?.name,
        type: f.properties?.type,
        // Force the custom geometryType to exist so the render loop works
        geometryType: isPolygon ? "POLYGON" : "CENTER_RADIUS",
        center: f.properties?.center,
        radius: f.properties?.radius,
      },
      geometry: f.geometry || null,
    };
  });

  // ⛔ Prevent empty rendering
  if (!safeFeatures.length) {
    return (
      <div className="h-[500px] flex items-center justify-center bg-gray-100 rounded-2xl">
        No map data available
      </div>
    );
  }

  // Default center
  const defaultCenter: [number, number] = [-18.91, 47.51];
  let mapCenter: [number, number] = defaultCenter;

  // Compute dynamic center (FIX: Check BOTH id and name, since MyClientComponent passes the name)
  const selectedFeature = safeFeatures.find(
    (f: Feature) =>
      f?.properties?.id === selectedFokontany ||
      f?.properties?.name === selectedFokontany
  );

  if (selectedFeature) {
    if (selectedFeature.properties.geometryType === "POLYGON") {
      if (selectedFeature.geometry) {
        const coords = selectedFeature.geometry.coordinates[0];
        const avgLat =
          coords.reduce((sum: number, [lat]: number[]) => sum + lat, 0) /
          coords.length;
        const avgLng =
          coords.reduce((sum: number, [, lng]: number[]) => sum + lng, 0) /
          coords.length;
        mapCenter = [avgLat, avgLng];
      }
    } else if (selectedFeature.properties.geometryType === "CENTER_RADIUS") {
      const [lng, lat] = selectedFeature.properties.center || defaultCenter;
      mapCenter = [lat, lng];
    }
  }

  return (
    <div className="h-[500px] w-full rounded-2xl overflow-hidden shadow-lg">
      <MapContainer center={mapCenter} zoom={15} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Render features */}
        {safeFeatures.map((feature: Feature, index: number) => {
          if (!feature?.properties) return null;

          const { properties, geometry } = feature;

          // FIX: Check selection against both ID and Name
          const isSelected =
            selectedFokontany === properties.id ||
            selectedFokontany === properties.name;

          // Use index as fallback key if ID is missing
          const uniqueKey = properties.id || `feature-${index}`;

          if (properties.geometryType === "POLYGON") {
            if (geometry?.coordinates) {
              const positions: [number, number][] = (geometry.coordinates[0] as [number, number][]).map(
                ([lng, lat]): [number, number] => [lat, lng]
              );
              return (
                <Polygon
                  key={uniqueKey}
                  positions={positions}
                  pathOptions={{
                    color: isSelected ? "#22c55e" : "#3b82f6",
                    weight: isSelected ? 4 : 2,
                    fillOpacity: isSelected ? 0.6 : 0.4,
                  }}
                  eventHandlers={{
                    click: () =>
                      setSelectedFokontany?.(properties.name || properties.id),
                  }}
                />
              );
            }
          }

          if (properties.geometryType === "CENTER_RADIUS") {
            const [lng, lat] = properties.center || defaultCenter;
            return (
              <Circle
                key={uniqueKey}
                center={[lat, lng]}
                radius={properties.radius || 500}
                pathOptions={{
                  color: isSelected ? "#22c55e" : "#f59e0b",
                  weight: isSelected ? 4 : 2,
                  fillOpacity: isSelected ? 0.5 : 0.3,
                }}
                eventHandlers={{
                  click: () =>
                    setSelectedFokontany?.(properties.name || properties.id),
                }}
              />
            );
          }

          return null;
        })}
      </MapContainer>
    </div>
  );
}
