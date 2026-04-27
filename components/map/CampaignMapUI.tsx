"use client";

import {
  MapContainer,
  TileLayer,
  Polygon,
  Circle,
  Marker,
  Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Feature } from "./CampaignMap";
import { Dispatch, SetStateAction } from "react";

/* =========================
   TYPES
========================= */

type Props = {
  features: Feature[];
  selectedFokontany: string | null;
  setSelectedFokontany: Dispatch<SetStateAction<string | null>>;
  mapCenter: [number, number];
  userLocation?: [number, number] | null; // ✅ FIXED
};

/* =========================
   COMPONENT
========================= */

export default function CampaignMapUI({
  features,
  selectedFokontany,
  setSelectedFokontany,
  mapCenter,
  userLocation,
}: Props) {
  const safeFeatures = Array.isArray(features) ? features : [];

  const fallbackCenter: [number, number] = [-18.8792, 47.5079];

  return (
    <div className="h-125 w-full rounded-2xl overflow-hidden shadow-lg">
      <MapContainer
        center={mapCenter || fallbackCenter}
        zoom={15}
        className="h-full w-full"
      >
        {/* =========================
           BASE MAP
        ========================= */}
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* =========================
           USER LOCATION MARKER
        ========================= */}
        {userLocation && (
          <Marker position={userLocation}>
            <Popup>📍 You are here</Popup>
          </Marker>
        )}

        {/* =========================
           CAMPAIGNS RENDERING
        ========================= */}
        {safeFeatures.map((feature: Feature, index: number) => {
          if (!feature?.properties) return null;

          const { properties, geometry } = feature;

          const isSelected =
            selectedFokontany === properties.id ||
            selectedFokontany === properties.name;

          const uniqueKey =
            properties.id ?? `${properties.name}-${index}`;

          /* =========================
             POLYGON
          ========================= */
          if (properties.geometryType === "POLYGON") {
            if (geometry?.coordinates) {
              const positions: [number, number][] =
                (geometry.coordinates[0] as [number, number][]).map(
                  ([lng, lat]) => [lat, lng]
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
                      setSelectedFokontany(
                        properties.name || properties.id
                      ),
                  }}
                />
              );
            }
          }

          /* =========================
             CENTER + RADIUS
          ========================= */
          if (properties.geometryType === "CENTER_RADIUS") {
            const [lng, lat] =
              properties.center || fallbackCenter;

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
                    setSelectedFokontany(
                      properties.name || properties.id
                    ),
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