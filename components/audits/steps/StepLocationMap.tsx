"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from "react-leaflet";

import { StepProps } from "@/lib/domain/audits/auditTypes";


function ClickHandler({
  form,
  setForm,
}: StepProps) {

  useMapEvents({
    click(e) {

      setForm({
        ...form,
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      });

    },
  });

  return null;
}


export default function StepLocationMap({
  form,
  setForm,
}: StepProps) {

  const lat = form.latitude ?? -18.9;
  const lng = form.longitude ?? 47.5;


  return (

    <MapContainer
      center={[lat, lng]}
      zoom={13}
      style={{
        height: 300,
        width: "100%",
      }}
    >

      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ClickHandler
        form={form}
        setForm={setForm}
      />

      {form.latitude !== null && form.longitude !== null && (
        <Marker
          position={[
            form.latitude,
            form.longitude,
          ]}
        />
      )}

    </MapContainer>

  );
}