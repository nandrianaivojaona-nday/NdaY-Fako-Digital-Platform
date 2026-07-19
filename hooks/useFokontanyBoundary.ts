import * as turf from "@turf/turf";
import { useMemo } from "react";

export function useFokontanyBoundary(geojson: GeoJSON.FeatureCollection) {
  
  const unionPolygon = useMemo(() => {
    if (!geojson || geojson.features.length === 0) return null;

    return geojson.features.reduce((acc, feature) => {
      if (!acc) return feature;
      return turf.union(acc, feature);
    }, null as any);
  }, [geojson]);

  const isInside = (geometry: GeoJSON.Geometry) => {
    if (!unionPolygon) return false;

    return turf.booleanWithin(
      turf.feature(geometry),
      unionPolygon
    );
  };

  const getBounds = () => {
    if (!unionPolygon) return null;
    return turf.bbox(unionPolygon);
  };

  return {
    unionPolygon,
    isInside,
    getBounds,
  };
}