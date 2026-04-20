"use client";

import { MapContainer, TileLayer, Polygon, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import fokontanyData from "@/seed/pilot/nday_fako_pilots.json";
import { Campaign } from "@/lib/types";

type Props = {
    campaigns: Campaign[];
    selectedFokontany?: string | null;
  };
  // ================================
  // Helper to get color based on campaign status
  // ===============================

function getColor(status: string) {
  if (status === "CRITICAL") return "#ef4444"; // red
  if (status === "ONGOING") return "#22c55e"; // green
  if (status === "VALIDATED") return "#eab308"; // yellow
  return "#94a3b8"; // gray
}

// ================================
//  MAP FOCUS HELPER
// ================================

function MapFocus({ coords }: { coords: [number, number][] | null }) {
    const map = useMap();
  
    useEffect(() => {
      if (coords && coords.length > 0) {
        map.fitBounds(coords);
      }
    }, [coords, map]);
  
    return null;
  }

  //=============================
  // MAIN COMPONENT
  //=============================

export default function CampaignMap({ 
    campaigns,
    selectedFokontany, }: Props) {

        const popupRefs = useRef<Record<string, any>>({});

        // Find selected polygon coordinates
        const selectedFeature = fokontanyData.features.find(
          (f: any) => f.properties.name === selectedFokontany
        );
      
        const selectedCoords = selectedFeature
          ? selectedFeature.geometry.coordinates[0].map(
              ([lng, lat]: number[]) => [lat, lng]
            )
          : null;
      
        useEffect(() => {
          if (selectedFokontany && popupRefs.current[selectedFokontany]) {
            popupRefs.current[selectedFokontany].openPopup();
          }
        }, [selectedFokontany]);

  return (
 
    <MapContainer
      center={[-18.91, 47.51]}
      zoom={13}
      style={{ height: "500px", borderRadius: "16px" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* Focus map when ticker clicked */}
      <MapFocus coords={selectedCoords as any} />

      {fokontanyData.features.map((feature: any) => {

        const { id, name } = feature.properties;

        const campaign = campaigns.find(
          (c) => c.fokontany === name
        );

        const coords = feature.geometry.coordinates[0].map(
          ([lng, lat]: number[]) => [lat, lng]
        );

        const isSelected = name === selectedFokontany;

        return (
          <Polygon
            key={id}
            positions={coords}
            pathOptions={{
              color: isSelected
                ? "#22c55e"
                : getColor(campaign?.status || "VALIDATED"),
              weight: isSelected ? 4 : 2,
              fillOpacity: isSelected ? 0.7 : 0.4,
            }}
            eventHandlers={{
              click: () => {
                if (popupRefs.current[name]) {
                  popupRefs.current[name].openPopup();
                }
              },
            }}
          >
            <Popup
              ref={(ref) => {
                if (ref) popupRefs.current[name] = ref;
              }}
            >
              <strong>{name}</strong>

              {campaign ? (
                <>
                  <p>Status: {campaign.status}</p>
                  <p>💰 {campaign.reward} Ar</p>
                  <p>
                    👥 {campaign.operatorsJoined}/
                    {campaign.operatorSlots}
                  </p>

                  <button className="button">
                    Join Campaign
                  </button>
                </>
              ) : (
                <p>No active campaign</p>
              )}
            </Popup>
          </Polygon>
        );
      })}
    </MapContainer>

  );
}