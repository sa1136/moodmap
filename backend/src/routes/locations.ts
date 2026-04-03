import { Router } from "express";
import axios from "axios";
import {
  photonFeaturesToLegacyNominatim,
  photonSearch,
} from "../services/geocoding";

const router = Router();

/** Try Nominatim; on empty/429/5xx fall back to Photon (avoids broken autocomplete when OSM rate-limits). */
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== "string" || q.length < 2) {
      return res.status(400).json({
        error: 'Query parameter "q" is required and must be at least 2 characters',
      });
    }

    let data: unknown[] = [];

    try {
      const response = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: {
          q,
          format: "json",
          limit: 8,
          addressdetails: 1,
          extratags: 1,
          "accept-language": "en",
        },
        headers: {
          "User-Agent": "MoodMap/1.0 (contact: dev@localhost)",
        },
        timeout: 20000,
        validateStatus: (s) => s < 500,
      });

      if (response.status === 429) {
        console.warn("[locations/search] Nominatim rate-limited (429), using Photon");
      } else if (Array.isArray(response.data) && response.data.length > 0) {
        data = response.data;
      }
    } catch (e: unknown) {
      const status = axios.isAxiosError(e) ? e.response?.status : undefined;
      if (status === 429) {
        console.warn("[locations/search] Nominatim 429, using Photon");
      } else {
        console.warn("[locations/search] Nominatim error, using Photon:", (e as Error)?.message);
      }
    }

    if (data.length === 0) {
      const features = await photonSearch(q, 8);
      data = photonFeaturesToLegacyNominatim(features) as unknown[];
    }

    res.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error searching locations:", message);
    res.status(500).json({
      error: "Failed to search locations",
      message,
    });
  }
});

export default router;
