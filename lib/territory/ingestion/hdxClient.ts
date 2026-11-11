// lib/territory/ingestion/hdxClient.ts
//
// Thin client for the HDX (Humanitarian Data Exchange) metadata API.
// No token required for read access.
//
// Reference: https://docs.humdata.org/build/hdx-apis/metadata-endpoints/package_show
//
// We use the HDX API only to discover the download URLs of the datasets.
// The data files themselves are hosted at various CDNs; we fetch them
// directly by URL.

const HDX_BASE = "https://data.humdata.org/api/action";

export interface HDXResource {
  id: string;
  name: string;
  format: string;
  download_url: string;
  size?: number;
  last_modified?: string;
}

export interface HDXDataset {
  id: string;
  name: string;
  title: string;
  notes: string;
  dataset_date?: string;
  data_update_frequency?: string;
  resources: HDXResource[];
}

// ================================================================
// Fetch a dataset's metadata
// ================================================================
export async function fetchDataset(id: string): Promise<HDXDataset | null> {
  const url = `${HDX_BASE}/package_show?id=${encodeURIComponent(id)}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // Let the caller cache; no explicit cache policy here
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`HDX package_show ${id} failed: ${res.status}`);
  }

  const data = await res.json();
  if (!data?.success) return null;

  const result = data.result;
  return {
    id: result.id,
    name: result.name,
    title: result.title,
    notes: result.notes ?? "",
    dataset_date: result.dataset_date,
    data_update_frequency: result.data_update_frequency,
    resources: (result.resources ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      format: r.format,
      download_url: r.download_url ?? r.url,
      size: r.size,
      last_modified: r.last_modified,
    })),
  };
}

// ================================================================
// Find a specific resource within a dataset
// ================================================================
export function findResource(
  dataset: HDXDataset,
  predicate: (r: HDXResource) => boolean
): HDXResource | null {
  return dataset.resources.find(predicate) ?? null;
}

// ================================================================
// Convenience: find by name fragment and format
// ================================================================
export function findResourceByNameAndFormat(
  dataset: HDXDataset,
  nameFragment: string,
  format: string
): HDXResource | null {
  return findResource(
    dataset,
    (r) =>
      r.name.toLowerCase().includes(nameFragment.toLowerCase()) &&
      r.format.toLowerCase() === format.toLowerCase()
  );
}