import axios from "axios";

/** Photon (Komoot) — forward geocoder; avoids Nominatim public rate limits for dev/autocomplete. */
const PHOTON_BASE = "https://photon.komoot.io/api/";

type PhotonFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Record<string, unknown> & {
    name?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    type?: string;
    osm_key?: string;
    osm_value?: string;
  };
};

export async function photonGeocode(query: string): Promise<{ lat: number; lon: number } | null> {
  const q = query?.trim();
  if (!q) return null;
  try {
    const { data } = await axios.get<{ features?: PhotonFeature[] }>(PHOTON_BASE, {
      params: { q, limit: 1, lang: "en" },
      timeout: 20000,
      headers: { Accept: "application/json" },
    });
    const f = data?.features?.[0];
    const coords = f?.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;
    const [lon, lat] = coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch (e) {
    console.warn("[Photon] geocode failed:", (e as Error)?.message);
    return null;
  }
}

export async function photonSearch(query: string, limit = 8): Promise<PhotonFeature[]> {
  const q = query?.trim();
  if (!q || q.length < 2) return [];
  try {
    const { data } = await axios.get<{ features?: PhotonFeature[] }>(PHOTON_BASE, {
      params: { q, limit, lang: "en" },
      timeout: 20000,
      headers: { Accept: "application/json" },
    });
    return Array.isArray(data?.features) ? data.features : [];
  } catch (e) {
    console.warn("[Photon] search failed:", (e as Error)?.message);
    return [];
  }
}

/**
 * Shape compatible with onboarding autocomplete (Nominatim-like: display_name, lat, lon, address).
 */
export function photonFeaturesToLegacyNominatim(features: PhotonFeature[]): Record<string, unknown>[] {
  return features.map((f) => {
    const p = f.properties || {};
    const coords = f.geometry?.coordinates;
    const lon = coords?.[0];
    const lat = coords?.[1];
    const locality =
      (typeof p.city === "string" && p.city) ||
      (typeof p.town === "string" && p.town) ||
      (typeof p.village === "string" && p.village) ||
      (typeof p.name === "string" && p.name) ||
      "";
    const displayParts = [
      locality,
      typeof p.state === "string" ? p.state : "",
      typeof p.country === "string" ? p.country : "",
    ].filter(Boolean);

    const cityForAutocomplete =
      (typeof p.city === "string" && p.city) ||
      (typeof p.town === "string" && p.town) ||
      (typeof p.village === "string" && p.village) ||
      (typeof p.name === "string" &&
      (p.type === "city" || p.osm_value === "city" || p.osm_key === "place")
        ? p.name
        : "") ||
      (typeof p.name === "string" ? p.name : "");

    return {
      display_name: displayParts.length ? displayParts.join(", ") : String(p.name ?? ""),
      lat: lat != null ? String(lat) : "",
      lon: lon != null ? String(lon) : "",
      address: {
        city: cityForAutocomplete,
        town: typeof p.town === "string" ? p.town : undefined,
        village: typeof p.village === "string" ? p.village : undefined,
        state: typeof p.state === "string" ? p.state : undefined,
        country: typeof p.country === "string" ? p.country : undefined,
      },
      importance: 0,
      type: p.type,
      class: p.osm_key,
    };
  });
}
