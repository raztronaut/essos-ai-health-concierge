/**
 * Local places lookup used by the Eve `search_local_places` tool.
 *
 * Uses the Google Places API (Text Search v1) when GOOGLE_PLACES_API_KEY is
 * set; otherwise returns curated notional results keyed loosely by destination
 * city so the demo always works offline.
 */

export interface Place {
  name: string;
  category: string;
  address: string | null;
  rating: number | null;
  note: string | null;
}

export type PlacesSource = "google_places" | "curated_notional";

export interface PlacesResult {
  results: Place[];
  source: PlacesSource;
}

const FALLBACK: Record<string, Place[]> = {
  istanbul: [
    { name: "Çiya Sofrası", category: "restaurant", address: "Kadıköy, Istanbul", rating: 4.6, note: "Renowned Anatolian home cooking; many vegetable mezes." },
    { name: "Karaköy Lokantası", category: "restaurant", address: "Karaköy, Istanbul", rating: 4.5, note: "Classic Istanbul meyhane; soft, easy-to-eat dishes." },
    { name: "Eczane (24h Pharmacy) Taksim", category: "pharmacy", address: "Taksim, Istanbul", rating: 4.3, note: "Late-night pharmacy near Taksim Square." },
    { name: "Garanti BBVA ATM", category: "atm", address: "İstiklal Caddesi, Istanbul", rating: null, note: "Reliable ATM on the main pedestrian street." },
    { name: "Kronotrop Coffee", category: "coffee", address: "Cihangir, Istanbul", rating: 4.5, note: "Quiet specialty coffee a short walk from Taksim." },
  ],
  tijuana: [
    { name: "Caesar's Restaurant", category: "restaurant", address: "Av. Revolución, Tijuana", rating: 4.4, note: "Birthplace of the Caesar salad; calm sit-down spot." },
    { name: "Telefónica Gastro Park", category: "restaurant", address: "Zona Río, Tijuana", rating: 4.5, note: "Food-hall variety, easy if you want something light." },
    { name: "Farmacias Guadalajara (24h)", category: "pharmacy", address: "Zona Río, Tijuana", rating: 4.2, note: "24-hour pharmacy chain near the hotel district." },
    { name: "BBVA ATM Zona Río", category: "atm", address: "Zona Río, Tijuana", rating: null, note: "Bank ATM; withdraw pesos rather than relying on USD." },
    { name: "Café Praga", category: "coffee", address: "Zona Río, Tijuana", rating: 4.4, note: "Relaxed café for downtime before/after the clinic." },
  ],
};

function curated(city: string): Place[] {
  const needle = city.toLowerCase();
  const key = Object.keys(FALLBACK).find((k) => needle.includes(k));
  return key ? FALLBACK[key]! : [];
}

async function googlePlaces(
  query: string,
  city: string,
  apiKey: string,
): Promise<Place[]> {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.displayName,places.formattedAddress,places.rating,places.primaryType",
    },
    body: JSON.stringify({ textQuery: `${query} near ${city}`, maxResultCount: 6 }),
  });
  if (!response.ok) {
    throw new Error(`Places API ${response.status}`);
  }
  const data = (await response.json()) as {
    places?: Array<{
      displayName?: { text?: string };
      formattedAddress?: string;
      rating?: number;
      primaryType?: string;
    }>;
  };
  return (data.places ?? []).map((place) => ({
    name: place.displayName?.text ?? "Unknown",
    category: place.primaryType ?? "place",
    address: place.formattedAddress ?? null,
    rating: place.rating ?? null,
    note: null,
  }));
}

export async function searchLocalPlaces(args: {
  query: string;
  city: string;
}): Promise<PlacesResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (apiKey && apiKey.trim().length > 0 && args.city.trim().length > 0) {
    try {
      const results = await googlePlaces(args.query, args.city, apiKey);
      if (results.length > 0) {
        return { results, source: "google_places" };
      }
    } catch {
      // Fall through to curated results on any API failure.
    }
  }
  return { results: curated(args.city), source: "curated_notional" };
}
