"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import type { BBox, Feature as GeoJSONFeature, Geometry } from "geojson";

import "maplibre-gl/dist/maplibre-gl.css";

type Feature = {
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

type Props = {
  features: Feature[];
  selectedFokontany: string | null;
  setSelectedFokontany: (id: string | null) => void;
  mapCenter: [number, number];
  userLocation: [number, number] | null;
  fokontanyBoundary?: GeoJSONFeature | null;
  fokontanyBBox?: BBox | null;
  isInsideFokontany?: (geometry: Geometry) => boolean;
  isVisible?: boolean;
  cameraMode: CameraMode;
  isGpsInsideFokontany: boolean;
};

export type CampaignMapUIProps = {
  features: Feature[];
  selectedFokontany: string | null;
  setSelectedFokontany: (id: string | null) => void;
  mapCenter: [number, number];
  userLocation: [number, number] | null;
  fokontanyBoundary?: GeoJSONFeature | null;
  fokontanyBBox?: BBox | null;
  isInsideFokontany?: (geometry: Geometry) => boolean;
  isVisible?: boolean;
  cameraMode: "gps" | "campaign";
  isGpsInsideFokontany: boolean;
};


const MAP_STYLE = "https://demotiles.maplibre.org/style.json";


export default function CampaignMapUI(props: CampaignMapUIProps) {
const {
  features,
  selectedFokontany,
  setSelectedFokontany,
  mapCenter,
  userLocation,
  fokontanyBoundary,
  fokontanyBBox,
  isInsideFokontany,
  isVisible = false,
  cameraMode,
  isGpsInsideFokontany,
}= props; {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (mapRef.current && isVisible) {
      const timer = window.setTimeout(() => {
        mapRef.current?.resize();
      }, 150);
      return () => window.clearTimeout(timer);
    }
  }, [isVisible]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: [mapCenter[1], mapCenter[0]],
      zoom: 13,
    });

    mapRef.current = map;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      styles: [
        {
          id: "gl-draw-lines.cold",
          type: "line",
          filter: ["all", ["==", "$type", "LineString"], ["==", "active", "false"]],
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#3b82f6",
            "line-width": 3,
            "line-dasharray": ["literal", [2, 0]],
          },
        },
        {
          id: "gl-draw-lines.hot",
          type: "line",
          filter: ["all", ["==", "$type", "LineString"], ["==", "active", "true"]],
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#60a5fa",
            "line-width": 3,
            "line-dasharray": ["literal", [2, 0]],
          },
        },
        {
          id: "gl-draw-polygon-fill-inactive",
          type: "fill",
          filter: ["all", ["==", "$type", "Polygon"], ["==", "active", "false"]],
          paint: {
            "fill-color": "#3b82f6",
            "fill-opacity": 0.12,
          },
        },
        {
          id: "gl-draw-polygon-stroke-inactive",
          type: "line",
          filter: ["all", ["==", "$type", "Polygon"], ["==", "active", "false"]],
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#3b82f6",
            "line-width": 2,
          },
        },
        {
          id: "gl-draw-polygon-fill-active",
          type: "fill",
          filter: ["all", ["==", "$type", "Polygon"], ["==", "active", "true"]],
          paint: {
            "fill-color": "#60a5fa",
            "fill-opacity": 0.12,
          },
        },
        {
          id: "gl-draw-polygon-stroke-active",
          type: "line",
          filter: ["all", ["==", "$type", "Polygon"], ["==", "active", "true"]],
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#60a5fa",
            "line-width": 2,
          },
        },
        {
          id: "gl-draw-point-inactive",
          type: "circle",
          filter: ["all", ["==", "$type", "Point"], ["==", "meta", "feature"], ["==", "active", "false"]],
          paint: {
            "circle-radius": 5,
            "circle-color": "#3b82f6",
          },
        },
        {
          id: "gl-draw-point-active",
          type: "circle",
          filter: ["all", ["==", "$type", "Point"], ["==", "meta", "feature"], ["==", "active", "true"]],
          paint: {
            "circle-radius": 6,
            "circle-color": "#60a5fa",
          },
        },
      ],
    });
    

    drawRef.current = draw;
    map.addControl(draw as unknown as maplibregl.IControl, "top-right");
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      if (!map.getSource("fokontany-boundary") && fokontanyBoundary) {
        map.addSource("fokontany-boundary", {
          type: "geojson",
          data: fokontanyBoundary,
        });

        map.addLayer({
          id: "fokontany-fill",
          type: "fill",
          source: "fokontany-boundary",
          paint: {
            "fill-color": isGpsInsideFokontany ? "#22c55e" : "#f59e0b",
            "fill-opacity": 0.18,
          },
        });

        map.addLayer({
          id: "fokontany-outline",
          type: "line",
          source: "fokontany-boundary",
          paint: {
            "line-color": isGpsInsideFokontany ? "#16a34a" : "#d97706",
            "line-width": 3,
          },
        });
      }
    });

    map.on("click", (e) => {
      const geometry: Geometry = {
        type: "Point",
        coordinates: [e.lngLat.lng, e.lngLat.lat],
      };

      if (isInsideFokontany && !isInsideFokontany(geometry)) {
        window.alert("Outside selected Fokontany");
        return;
      }

      console.log("Valid click inside Fokontany", geometry);
    });

    map.on("draw.create", (e: any) => {
      const feature = e.features?.[0];
      if (!feature?.geometry || !drawRef.current) return;

      if (isInsideFokontany && !isInsideFokontany(feature.geometry)) {
        drawRef.current.delete(feature.id);
        window.alert("Drawing must stay inside Fokontany");
      }
    });

    return () => {
      userMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !fokontanyBoundary) return;

    const map = mapRef.current;
    const source = map.getSource("fokontany-boundary") as maplibregl.GeoJSONSource | undefined;

    if (source) {
      source.setData(fokontanyBoundary);
    } else if (map.isStyleLoaded()) {
      map.addSource("fokontany-boundary", {
        type: "geojson",
        data: fokontanyBoundary,
      });

      map.addLayer({
        id: "fokontany-fill",
        type: "fill",
        source: "fokontany-boundary",
        paint: {
          "fill-color": isGpsInsideFokontany ? "#22c55e" : "#f59e0b",
          "fill-opacity": 0.18,
        },
      });

      map.addLayer({
        id: "fokontany-outline",
        type: "line",
        source: "fokontany-boundary",
        paint: {
          "line-color": isGpsInsideFokontany ? "#16a34a" : "#d97706",
          "line-width": 3,
        },
      });
    }

    if (map.getLayer("fokontany-fill")) {
      map.setPaintProperty(
        "fokontany-fill",
        "fill-color",
        isGpsInsideFokontany ? "#22c55e" : "#f59e0b"
      );
    }

    if (map.getLayer("fokontany-outline")) {
      map.setPaintProperty(
        "fokontany-outline",
        "line-color",
        isGpsInsideFokontany ? "#16a34a" : "#d97706"
      );
    }
  }, [fokontanyBoundary, isGpsInsideFokontany]);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    if (cameraMode === "gps" && userLocation) {
      map.flyTo({
        center: [userLocation[1], userLocation[0]],
        zoom: 16,
        essential: true,
      });
      return;
    }

    if (cameraMode === "campaign" && fokontanyBBox && fokontanyBBox.length === 4) {
      map.fitBounds(
        [
          [fokontanyBBox[0], fokontanyBBox[1]],
          [fokontanyBBox[2], fokontanyBBox[3]],
        ],
        { padding: 40, duration: 800 }
      );
      return;
    }

    map.setCenter([mapCenter[1], mapCenter[0]]);
  }, [cameraMode, userLocation, fokontanyBBox, mapCenter]);

  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "h-4 w-4 rounded-full border-2 border-white bg-sky-500 shadow-[0_0_0_6px_rgba(14,165,233,0.25)]";
      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([userLocation[1], userLocation[0]])
        .addTo(mapRef.current);
    } else {
      userMarkerRef.current.setLngLat([userLocation[1], userLocation[0]]);
    }
  }, [userLocation]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
      <div ref={mapContainerRef} className="h-full min-h-64 w-full" />

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-slate-900/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80 backdrop-blur-sm">
        {cameraMode === "gps"
          ? "GPS matches selected Fokontany"
          : "Showing campaign Fokontany"}
        {selectedFokontany ? ` • ${selectedFokontany}` : ""}
        {userLocation ? " • GPS ready" : " • GPS unavailable"}
      </div>
    </div>
  );
}
}
