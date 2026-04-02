import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ============================================================
// CONFIGURAZIONE
// ============================================================

const RETRY_CONFIG = { maxRetries: 3, baseDelay: 1000 };
const RATE_LIMIT_DELAY = 500; // ms tra richieste API esterne

// ============================================================
// LOGGING STRUTTURATO
// ============================================================

function log(level: "info" | "error" | "warn", message: string, meta?: Record<string, unknown>) {
  console.log(JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    function: "ingest-events",
    ...meta
  }));
}

// ============================================================
// UTILITIES
// ============================================================

function norm(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function makeSlug(title: string, _date: string): Promise<string> {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// FETCH CON RETRY E RATE LIMITING
// ============================================================

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = RETRY_CONFIG.maxRetries
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      // Rate limiting
      await sleep(RATE_LIMIT_DELAY);

      const res = await fetch(url, options);

      if (res.ok) return res;

      // 429 Too Many Requests - retry con backoff
      if (res.status === 429) {
        const delay = RETRY_CONFIG.baseDelay * Math.pow(2, i);
        log("warn", `Rate limited, retrying in ${delay}ms`, { attempt: i + 1, url });
        await sleep(delay);
        continue;
      }

      // 5xx errors - retry
      if (res.status >= 500) {
        const delay = RETRY_CONFIG.baseDelay * (i + 1);
        log("warn", `Server error ${res.status}, retrying in ${delay}ms`, { attempt: i + 1 });
        await sleep(delay);
        continue;
      }

      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(RETRY_CONFIG.baseDelay * (i + 1));
    }
  }
  throw new Error("Max retries exceeded");
}

// ============================================================
// GEOCODING FALLBACK
// ============================================================

async function geocodeAddress(
  address: string | null,
  city: string
): Promise<{ lat: number; lng: number } | null> {
  if (!address) return null;

  try {
    const query = encodeURIComponent(`${address}, ${city}, Italy`);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;

    const res = await fetchWithRetry(url, {
      headers: { "User-Agent": "Vibe-Loop/1.0" }
    }, 2);

    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
  } catch (e) {
    log("warn", "Geocoding failed", { address, city, error: String(e) });
  }
  return null;
}

// ============================================================
// GEOCODING CITTÀ (lookup statico + fallback Nominatim)
// ============================================================

const CITY_COORDS: Record<string, { lat: string; lon: string }> = {
  "Milano":  { lat: "45.4642", lon: "9.1900" },
  "Roma":    { lat: "41.9028", lon: "12.4964" },
  "Torino":  { lat: "45.0703", lon: "7.6869" },
  "Firenze": { lat: "43.7696", lon: "11.2558" },
  "Napoli":  { lat: "40.8518", lon: "14.2681" },
  "Bologna": { lat: "44.4949", lon: "11.3426" },
  "Venezia": { lat: "45.4408", lon: "12.3155" },
  "Palermo": { lat: "38.1157", lon: "13.3615" },
  "Genova":  { lat: "44.4056", lon: "8.9463" },
  "Bari":    { lat: "41.1171", lon: "16.8719" },
};

async function geocodeCity(city: string): Promise<{ lat: string; lon: string }> {
  const normalized = city.trim();
  if (CITY_COORDS[normalized]) return CITY_COORDS[normalized];

  try {
    const query = encodeURIComponent(`${city}, Italy`);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;
    const res = await fetchWithRetry(url, { headers: { "User-Agent": "Vibe-Loop/1.0" } }, 2);
    const data = await res.json();
    if (data?.length > 0) {
      return { lat: String(data[0].lat), lon: String(data[0].lon) };
    }
  } catch (e) {
    log("warn", "City geocoding failed", { city, error: String(e) });
  }

  return { lat: "45.4642", lon: "9.1900" }; // fallback Milano
}

// ============================================================
// INTERFACCE
// ============================================================

interface NormalizedEvent {
  external_id: string;
  source_name: string;
  source_url: string | null;
  title: string;
  description: string | null;
  category: string;
  starts_at: string;
  ends_at: string | null;
  venue_name: string | null;
  address_line: string | null;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  cover_image_url: string | null;
  price_label: string | null;
  normalized_hash: string;
  slug: string;
}

// ============================================================
// MAPPE CATEGORIE
// ============================================================

const EVENTBRITE_CAT: Record<string, string> = {
  "103": "music",
  "110": "food",
  "113": "tech",
  "105": "art",
  "109": "sport",
  "107": "cinema",
  "108": "teatro",
  "119": "wellness",
  "111": "social",
  "102": "tech",
  "104": "art",
  "106": "music",
  "116": "festival",
  "117": "nightlife",
  "101": "conference",
  "115": "comedy",
  "112": "conference",
  "114": "conference",
};

const TM_SEGMENT: Record<string, string> = {
  KZFzniwnSyZfZ7v7nJ: "music",
  KZFzniwnSyZfZ7v7nE: "sport",
  KZFzniwnSyZfZ7v7na: "art",
  KZFzniwnSyZfZ7v7nn: "cinema",
  KZFzniwnSyZfZ7v7n1: "other",
  KZFzniwnSyZfZ7v7nd: "conference",
  KZFzniwnSyZfZ7v7ni: "festival",
  KZFzniwnSyZfZ7v7nk: "nightlife",
};

const SONGKICK_CATEGORY: Record<string, string> = {
  "Concert": "music",
  "Festival": "festival",
  "Gig": "music",
};

// ============================================================
// EVENTBRITE ADAPTER
// ============================================================

async function fetchEventbrite(
  token: string,
  city: string,
  countryCode: string
): Promise<NormalizedEvent[]> {
  log("info", "Fetching Eventbrite events", { city, country: countryCode });

  const url = new URL("https://www.eventbriteapi.com/v3/events/search/");
  url.searchParams.set("location.address", `${city}, ${countryCode}`);
  url.searchParams.set("location.within", "30km");
  url.searchParams.set("expand", "venue,ticket_classes");
  url.searchParams.set("page_size", "50");
  url.searchParams.set(
    "start_date.range_start",
    new Date().toISOString().slice(0, 10) + "T00:00:00"
  );
  url.searchParams.set("sort_by", "date");

  const res = await fetchWithRetry(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  const results: NormalizedEvent[] = [];

  for (const ev of data.events ?? []) {
    const startsAt = ev.start?.utc;
    if (!startsAt) continue;

    const hashKey = `${norm(ev.name?.text ?? "")}|${startsAt.slice(0, 10)}|${norm(city)}`;
    const hash = await sha256(hashKey);

    const venue = ev.venue;
    const isFree = ev.is_free;
    const minPrice = ev.ticket_classes?.[0]?.cost?.major_value;
    const priceLabel = isFree ? "Gratuito" : minPrice ? `Da €${minPrice}` : null;

    // Geocodifica fallback se lat/lng mancanti
    let lat = venue?.latitude ? parseFloat(venue.latitude) : null;
    let lng = venue?.longitude ? parseFloat(venue.longitude) : null;

    if ((!lat || !lng) && venue?.address?.address_1) {
      const coords = await geocodeAddress(venue.address.address_1, city);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }

    results.push({
      external_id: `eb_${ev.id}`,
      source_name: "Eventbrite",
      source_url: ev.url ?? null,
      title: ev.name?.text ?? "Evento",
      description: ev.description?.text?.slice(0, 2000) ?? null,
      category: EVENTBRITE_CAT[ev.category_id] ?? "other",
      starts_at: startsAt,
      ends_at: ev.end?.utc ?? null,
      venue_name: venue?.name ?? null,
      address_line: venue?.address?.address_1 ?? null,
      city,
      country: countryCode,
      latitude: lat,
      longitude: lng,
      cover_image_url: ev.logo?.url ?? null,
      price_label: priceLabel,
      normalized_hash: hash,
      slug: await makeSlug(ev.name?.text ?? "evento", startsAt),
    });
  }

  log("info", "Eventbrite fetch completed", { count: results.length, city });
  return results;
}

// ============================================================
// TICKETMASTER ADAPTER
// ============================================================

async function fetchTicketmaster(
  apiKey: string,
  city: string,
  countryCode: string
): Promise<NormalizedEvent[]> {
  log("info", "Fetching Ticketmaster events", { city, country: countryCode });

  const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
  url.searchParams.set("city", city);
  url.searchParams.set("countryCode", countryCode);
  url.searchParams.set("size", "50");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set(
    "startDateTime",
    new Date().toISOString().slice(0, 19) + "Z"
  );

  const res = await fetchWithRetry(url.toString());
  const data = await res.json();

  const events = data._embedded?.events ?? [];
  const results: NormalizedEvent[] = [];

  for (const ev of events) {
    const startsAt =
      ev.dates?.start?.dateTime ??
      ev.dates?.start?.localDate + "T00:00:00Z";
    if (!startsAt) continue;

    const venue = ev._embedded?.venues?.[0];
    const hashKey = `${norm(ev.name ?? "")}|${startsAt.slice(0, 10)}|${norm(city)}`;
    const hash = await sha256(hashKey);
    const segmentId = ev.classifications?.[0]?.segment?.id ?? "";
    const cat = TM_SEGMENT[segmentId] ?? "other";

    const minPrice = ev.priceRanges?.[0]?.min;
    const priceLabel = minPrice != null ? `Da €${minPrice}` : null;

    // Geocodifica fallback
    let lat = venue?.location?.latitude ? parseFloat(venue.location.latitude) : null;
    let lng = venue?.location?.longitude ? parseFloat(venue.location.longitude) : null;

    if ((!lat || !lng) && venue?.address?.line1) {
      const coords = await geocodeAddress(venue.address.line1, city);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }

    results.push({
      external_id: `tm_${ev.id}`,
      source_name: "Ticketmaster",
      source_url: ev.url ?? null,
      title: ev.name ?? "Evento",
      description: null,
      category: cat,
      starts_at: startsAt,
      ends_at: null,
      venue_name: venue?.name ?? null,
      address_line: venue?.address?.line1 ?? null,
      city,
      country: countryCode,
      latitude: lat,
      longitude: lng,
      cover_image_url:
        ev.images?.find((i: { ratio: string }) => i.ratio === "16_9")?.url ??
        ev.images?.[0]?.url ??
        null,
      price_label: priceLabel,
      normalized_hash: hash,
      slug: await makeSlug(ev.name ?? "evento", startsAt),
    });
  }

  log("info", "Ticketmaster fetch completed", { count: results.length, city });
  return results;
}

// ============================================================
// SONGKICK ADAPTER
// ============================================================

async function fetchSongkick(
  apiKey: string,
  city: string
): Promise<NormalizedEvent[]> {
  log("info", "Fetching Songkick events", { city });

  // Songkick usa metro areas - per semplicità usiamo la search API
  const url = new URL("https://api.songkick.com/api/3.0/events.json");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("location", `sk:geo:${city},IT`);
  url.searchParams.set("min_date", new Date().toISOString().slice(0, 10));
  url.searchParams.set("max_date", new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));

  const res = await fetchWithRetry(url.toString());
  const data = await res.json();

  const events = data.resultsPage?.results?.event ?? [];
  const results: NormalizedEvent[] = [];

  for (const ev of events) {
    const startsAt = ev.start?.datetime ?? `${ev.start?.date}T20:00:00`;
    if (!startsAt) continue;

    const venue = ev.venue;
    const hashKey = `${norm(ev.displayName ?? "")}|${startsAt.slice(0, 10)}|${norm(city)}`;
    const hash = await sha256(hashKey);
    const cat = SONGKICK_CATEGORY[ev.type] ?? "music";

    results.push({
      external_id: `sk_${ev.id}`,
      source_name: "Songkick",
      source_url: ev.uri ?? null,
      title: ev.displayName ?? "Concerto",
      description: null,
      category: cat,
      starts_at: startsAt,
      ends_at: null,
      venue_name: venue?.displayName ?? null,
      address_line: venue?.street ?? null,
      city: venue?.city?.displayName ?? city,
      country: "IT",
      latitude: venue?.lat ?? null,
      longitude: venue?.lng ?? null,
      cover_image_url: null, // Songkick non ha cover dirette
      price_label: null,
      normalized_hash: hash,
      slug: await makeSlug(ev.displayName ?? "concerto", startsAt),
    });
  }

  log("info", "Songkick fetch completed", { count: results.length, city });
  return results;
}

// ============================================================
// MEETUP ADAPTER (GraphQL)
// ============================================================

async function fetchMeetup(
  token: string,
  city: string
): Promise<NormalizedEvent[]> {
  log("info", "Fetching Meetup events", { city });

  // Meetup API v3 (URLSearch)
  const url = "https://api.meetup.com/find/upcoming_events";
  const cityCoords = await geocodeCity(city);
  const params = new URLSearchParams({
    key: token,
    lat: cityCoords.lat,
    lon: cityCoords.lon,
    radius: "25",
    page: "20"
  });

  const res = await fetchWithRetry(`${url}?${params.toString()}`);
  const data = await res.json();

  const events = data.events ?? [];
  const results: NormalizedEvent[] = [];

  for (const ev of events) {
    const startsAt = ev.local_time
      ? `${ev.local_date}T${ev.local_time}`
      : ev.time
      ? new Date(ev.time).toISOString()
      : null;
    if (!startsAt) continue;

    const venue = ev.venue;
    const hashKey = `${norm(ev.name ?? "")}|${startsAt.slice(0, 10)}|${norm(city)}`;
    const hash = await sha256(hashKey);

    // Categoria da meetup group topics
    const cat = "social"; // Default per meetup

    results.push({
      external_id: `mu_${ev.id}`,
      source_name: "Meetup",
      source_url: ev.link ?? null,
      title: ev.name ?? "Evento",
      description: ev.description?.slice(0, 2000) ?? null,
      category: cat,
      starts_at: startsAt,
      ends_at: ev.duration
        ? new Date(new Date(startsAt).getTime() + ev.duration).toISOString()
        : null,
      venue_name: venue?.name ?? null,
      address_line: venue?.address_1 ?? null,
      city: venue?.city ?? city,
      country: venue?.country?.toUpperCase() ?? "IT",
      latitude: venue?.lat ?? null,
      longitude: venue?.lon ?? null,
      cover_image_url: ev.featured_photo?.photo_link ?? null,
      price_label: ev.is_free ? "Gratuito" : null,
      normalized_hash: hash,
      slug: await makeSlug(ev.name ?? "evento", startsAt),
    });
  }

  log("info", "Meetup fetch completed", { count: results.length, city });
  return results;
}

// ============================================================
// OPENDATA ADAPTER (CKAN - Comuni Italiani)
// ============================================================

async function fetchOpenData(
  baseUrl: string,
  city: string
): Promise<NormalizedEvent[]> {
  log("info", "Fetching OpenData events", { city, url: baseUrl });

  // CKAN API - cerca package/dataset con eventi
  const searchUrl = `${baseUrl}/api/3/action/package_search?q=eventi&rows=10`;

  const res = await fetchWithRetry(searchUrl);
  const data = await res.json();

  // Nota: OpenData varia molto per comune, implementazione base
  // che cerca dataset eventi e ne estrae i dati

  const results: NormalizedEvent[] = [];

  // Estrai resources dai risultati
  const packages = data.result?.results ?? [];

  for (const pkg of packages) {
    for (const resource of pkg.resources ?? []) {
      if (resource.format?.toLowerCase() === "json" && resource.url) {
        try {
          const eventRes = await fetchWithRetry(resource.url, {}, 2);
          const eventData = await eventRes.json();

          // Parsing generico - struttura varia per comune
          for (const ev of Array.isArray(eventData) ? eventData : eventData.data ?? []) {
            if (!ev.data_inizio && !ev.start_date) continue;

            const startsAt = ev.data_inizio || ev.start_date;
            const hashKey = `${norm(ev.titolo || ev.title || "")}|${startsAt.slice(0, 10)}|${norm(city)}`;
            const hash = await sha256(hashKey);

            results.push({
              external_id: `od_${ev.id || ev._id || Math.random().toString(36)}`,
              source_name: `OpenData ${city}`,
              source_url: ev.url || ev.link || null,
              title: ev.titolo || ev.title || "Evento",
              description: (ev.descrizione || ev.description || "").slice(0, 2000),
              category: ev.categoria || ev.category || "other",
              starts_at: startsAt,
              ends_at: ev.data_fine || ev.end_date || null,
              venue_name: ev.luogo || ev.venue || ev.location || null,
              address_line: ev.indirizzo || ev.address || null,
              city,
              country: "IT",
              latitude: ev.lat || ev.latitude || null,
              longitude: ev.lng || ev.longitude || null,
              cover_image_url: ev.immagine || ev.image || null,
              price_label: ev.prezzo || ev.price || null,
              normalized_hash: hash,
              slug: await makeSlug(ev.titolo || ev.title || "evento", startsAt),
            });
          }
        } catch (e) {
          log("warn", "Failed to parse OpenData resource", { url: resource.url, error: String(e) });
        }
      }
    }
  }

  log("info", "OpenData fetch completed", { count: results.length, city });
  return results;
}

// ============================================================
// CATEGORIA DA KEYWORD (per RSS e sorgenti senza categoria esplicita)
// ============================================================

const RSS_CATEGORY_KEYWORDS: Array<[string[], string]> = [
  [["sagra", "sagre", "fiera", "feste", "tradizione", "patrono"], "festival"],
  [["concerto", "musica", "music", "live", "band", "dj", "festival musicale"], "music"],
  [["sport", "calcio", "corsa", "maratona", "tennis", "atletica", "gara"], "sport"],
  [["arte", "mostra", "museum", "galleria", "esibizione", "pittura", "scultura"], "art"],
  [["teatro", "spettacolo", "opera", "commedia", "palcoscenico"], "teatro"],
  [["cinema", "film", "proiezione", "rassegna cinematografica"], "cinema"],
  [["tech", "digitale", "startup", "hackathon", "coding", "software", "ai"], "tech"],
  [["food", "cibo", "gastronomia", "degustazione", "vino", "birra", "enogastronomia"], "food"],
  [["yoga", "meditazione", "wellness", "salute", "benessere", "mindfulness"], "wellness"],
  [["comedy", "comico", "stand-up", "cabaret", "umorismo"], "comedy"],
  [["danza", "ballo", "dance", "coreografia", "ballet"], "dance"],
  [["nightlife", "notte", "club", "disco", "aperitivo", "cocktail"], "nightlife"],
  [["conferenza", "convegno", "seminario", "workshop", "summit", "tavola rotonda"], "conference"],
];

function categorizFromText(text: string): string {
  const lower = text.toLowerCase();
  for (const [keywords, category] of RSS_CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return "other";
}

// ============================================================
// RSS ADAPTER (generico per feed RSS 2.0 e Atom)
// ============================================================

async function fetchRSS(
  feedUrl: string,
  city: string | null,
  sourceName: string
): Promise<NormalizedEvent[]> {
  log("info", "Fetching RSS feed", { feedUrl, city });

  const res = await fetchWithRetry(feedUrl, {
    headers: {
      "User-Agent": "Vibe-Loop/1.0",
      "Accept": "application/rss+xml, application/atom+xml, text/xml, */*",
    },
  }, 2);

  const xmlText = await res.text();

  // DOMParser è disponibile in Deno Deploy nativamente
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  const results: NormalizedEvent[] = [];
  const effectiveCity = city ?? "Italia";

  // Supporta sia RSS 2.0 (<item>) che Atom (<entry>)
  const items = [
    ...Array.from(doc.querySelectorAll("item")),
    ...Array.from(doc.querySelectorAll("entry")),
  ];

  for (const item of items) {
    const getText = (tag: string): string | null =>
      item.querySelector(tag)?.textContent?.trim() || null;

    const title = getText("title");
    if (!title) continue;

    // Data: prova vari tag comuni
    const rawDate =
      getText("pubDate") ??
      getText("published") ??
      getText("updated") ??
      null;

    if (!rawDate) continue;

    let startsAt: string;
    try {
      startsAt = new Date(rawDate).toISOString();
    } catch {
      continue;
    }

    // Salta eventi già passati
    if (new Date(startsAt) < new Date()) continue;

    const description =
      getText("description") ?? getText("summary") ?? getText("content") ?? null;

    const link =
      getText("link") ??
      item.querySelector("link")?.getAttribute("href") ??
      null;

    const imgUrl =
      item.querySelector("enclosure")?.getAttribute("url") ??
      item.querySelector("media\\:thumbnail")?.getAttribute("url") ??
      null;

    const catTag = getText("category") ?? "";
    const category = categorizFromText(`${title} ${catTag} ${description ?? ""}`);

    const hashKey = `${norm(title)}|${startsAt.slice(0, 10)}|${norm(effectiveCity)}`;
    const hash = await sha256(hashKey);

    results.push({
      external_id: `rss_${hash.slice(0, 16)}`,
      source_name: sourceName,
      source_url: link,
      title,
      description: description?.slice(0, 2000) ?? null,
      category,
      starts_at: startsAt,
      ends_at: null,
      venue_name: null,
      address_line: null,
      city: effectiveCity,
      country: "IT",
      latitude: null,
      longitude: null,
      cover_image_url: imgUrl,
      price_label: null,
      normalized_hash: hash,
      slug: await makeSlug(title, startsAt),
    });
  }

  log("info", "RSS fetch completed", { count: results.length, feedUrl });
  return results;
}

// ============================================================
// SEARCH DOCUMENT BUILDER
// ============================================================

function buildSearchDocument(ev: NormalizedEvent): string {
  return [
    ev.title,
    ev.description?.slice(0, 500),
    ev.venue_name,
    ev.address_line,
    ev.city,
    ev.category,
    ev.source_name,
    ev.price_label,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

// ============================================================
// UPSERT EVENTS (BATCH)
// ============================================================

async function upsertEvents(
  events: NormalizedEvent[]
): Promise<{ created: number; skipped: number; errors: number }> {
  let created = 0;
  let skipped = 0;
  let errors = 0;

  const batchSize = 50;

  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);

    try {
      // 1. Batch check duplicati — una sola query per tutti gli hash del batch
      const hashes = batch.map((ev) => ev.normalized_hash);
      const { data: existingRows } = await supabase
        .from("events")
        .select("normalized_hash")
        .in("normalized_hash", hashes);

      const existingHashes = new Set(
        (existingRows ?? []).map((r: { normalized_hash: string }) => r.normalized_hash)
      );

      // 2. Filtra già-esistenti lato JS
      const newEvents = batch.filter((ev) => !existingHashes.has(ev.normalized_hash));
      skipped += batch.length - newEvents.length;

      if (newEvents.length === 0) continue;

      // 3. Batch check slug duplicati — una sola query
      const slugs = newEvents.map((ev) => ev.slug);
      const { data: existingSlugs } = await supabase
        .from("events")
        .select("slug")
        .in("slug", slugs);

      const takenSlugs = new Set(
        (existingSlugs ?? []).map((r: { slug: string }) => r.slug)
      );

      // 4. Prepara il batch di insert con slug univoci e search_document
      const insertRows = newEvents.map((ev) => {
        let slug = ev.slug;
        // Se lo slug è già in DB o duplicato nel batch corrente, aggiungi suffix random
        while (takenSlugs.has(slug)) {
          slug = `${ev.slug}-${Math.random().toString(36).slice(2, 7)}`;
        }
        // Segna lo slug come preso per evitare collisioni intra-batch
        takenSlugs.add(slug);

        return {
          ...ev,
          slug,
          search_document: buildSearchDocument(ev),
          visibility: "public" as const,
          timezone: "Europe/Rome",
        };
      });

      // 5. Batch insert — una sola query per tutti i nuovi eventi
      const { error, count } = await supabase
        .from("events")
        .insert(insertRows);

      if (error) {
        log("error", "Batch insert failed, falling back to individual inserts", {
          error: error.message,
          batchSize: insertRows.length,
        });

        // Fallback: insert individuale per identificare record problematici
        for (const row of insertRows) {
          const { error: singleError } = await supabase
            .from("events")
            .insert(row);

          if (singleError) {
            log("error", "Single insert failed", {
              slug: row.slug,
              error: singleError.message,
            });
            errors++;
          } else {
            created++;
          }
        }
      } else {
        created += count ?? insertRows.length;
        log("info", "Batch insert successful", { inserted: insertRows.length });
      }
    } catch (e) {
      log("error", "Upsert batch error", { error: String(e) });
      errors += batch.length;
    }

    // Rate limiting tra batch
    await sleep(100);
  }

  return { created, skipped, errors };
}

// ============================================================
// MAIN HANDLER
// ============================================================

Deno.serve(async (req) => {
  const startTime = Date.now();
  log("info", "Ingestion started", { method: req.method });

  // Autenticazione — accetta sia CRON_SECRET che service_role key
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const isAuthorized =
    !cronSecret ||
    authHeader === `Bearer ${cronSecret}` ||
    authHeader === `Bearer ${serviceRoleKey}`;

  if (!isAuthorized) {
    log("error", "Unauthorized request", { authHeader: authHeader?.slice(0, 20) });
    return new Response("Unauthorized", { status: 401 });
  }

  // API Keys
  const eventbriteToken = Deno.env.get("EVENTBRITE_TOKEN");
  const ticketmasterKey = Deno.env.get("TICKETMASTER_KEY");
  const songkickKey = Deno.env.get("SONGKICK_KEY");
  const meetupToken = Deno.env.get("MEETUP_TOKEN");

  const apiStatus = {
    eventbrite: !!eventbriteToken,
    ticketmaster: !!ticketmasterKey,
    songkick: !!songkickKey,
    meetup: !!meetupToken,
    rss: true,
  };

  log("info", "API keys status", apiStatus);

  // Parse body una sola volta
  let parsedBody: Record<string, unknown> = {};
  try {
    parsedBody = await req.clone().json().catch(() => ({}));
  } catch {
    // body non JSON, procedi normalmente
  }

  // Action: status — ritorna solo lo stato API keys senza eseguire ingestion
  if (parsedBody?.action === "status") {
    return new Response(JSON.stringify({ ok: true, apiStatus }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Se specificato source_id, processa solo quella sorgente (anche se inattiva, utile per test)
  let sources: Array<Record<string, unknown>> | null = null;
  let sourcesError: { message: string } | null = null;

  if (parsedBody?.source_id && typeof parsedBody.source_id === "string") {
    const { data: singleSource, error: singleError } = await supabase
      .from("ingestion_sources")
      .select("*")
      .eq("id", parsedBody.source_id)
      .single();

    if (singleError) {
      sourcesError = singleError;
    } else if (singleSource) {
      sources = [singleSource];
      log("info", "Single source mode", { source_id: parsedBody.source_id, name: (singleSource as Record<string, unknown>).name });
    }
  } else {
    // Comportamento default: tutte le sorgenti attive
    const { data, error } = await supabase
      .from("ingestion_sources")
      .select("*")
      .eq("is_active", true);
    sources = data;
    sourcesError = error;
  }

  if (sourcesError) {
    log("error", "Failed to fetch sources", { error: sourcesError.message });
    return new Response(JSON.stringify({ error: sourcesError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const results: Array<{
    source: string;
    seen: number;
    created: number;
    skipped: number;
    errors: number;
    error: string | null;
  }> = [];

  // Processa ogni sorgente
  for (const source of sources ?? []) {
    const runStart = new Date().toISOString();
    let itemsCreated = 0;
    let itemsSkipped = 0;
    let itemsSeen = 0;
    let errors = 0;
    let errorMsg: string | null = null;

    try {
      let events: NormalizedEvent[] = [];
      const city = source.city ?? "Milano";
      const countryCode = "IT";

      log("info", `Processing source: ${source.name}`, { kind: source.kind, city });

      switch (source.kind) {
        case "eventbrite":
          if (eventbriteToken) {
            events = await fetchEventbrite(eventbriteToken, city, countryCode);
          } else {
            errorMsg = "EVENTBRITE_TOKEN non configurato";
            log("warn", errorMsg);
          }
          break;

        case "ticketmaster":
          if (ticketmasterKey) {
            events = await fetchTicketmaster(ticketmasterKey, city, countryCode);
          } else {
            errorMsg = "TICKETMASTER_KEY non configurato";
            log("warn", errorMsg);
          }
          break;

        case "songkick":
          if (songkickKey) {
            events = await fetchSongkick(songkickKey, city);
          } else {
            errorMsg = "SONGKICK_KEY non configurato";
            log("warn", errorMsg);
          }
          break;

        case "meetup":
          if (meetupToken) {
            events = await fetchMeetup(meetupToken, city);
          } else {
            errorMsg = "MEETUP_TOKEN non configurato";
            log("warn", errorMsg);
          }
          break;

        case "rss":
          if (source.feed_url) {
            events = await fetchRSS(source.feed_url, source.city, source.name);
          } else {
            errorMsg = "feed_url mancante per RSS";
            log("warn", errorMsg);
          }
          break;

        case "opendata":
          if (source.feed_url) {
            events = await fetchOpenData(source.feed_url, city);
          } else {
            errorMsg = "feed_url mancante per OpenData";
            log("warn", errorMsg);
          }
          break;

        default:
          errorMsg = `Sorgente ${source.kind} non supportata`;
          log("warn", errorMsg);
      }

      itemsSeen = events.length;

      if (events.length > 0 && !errorMsg) {
        const upsertResult = await upsertEvents(events);
        itemsCreated = upsertResult.created;
        itemsSkipped = upsertResult.skipped;
        errors = upsertResult.errors;
      }
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : String(e);
      log("error", `Source ${source.name} failed`, { error: errorMsg });
    }

    // Salva run record
    const { error: runError } = await supabase.from("ingestion_runs").insert({
      source_id: source.id,
      status: errorMsg ? "error" : "success",
      items_seen: itemsSeen,
      items_created: itemsCreated,
      items_updated: 0,
      error_message: errorMsg,
      started_at: runStart,
      finished_at: new Date().toISOString(),
    });
    if (runError) {
      log("error", "Failed to save ingestion run", { source: source.name, error: runError.message });
    }

    results.push({
      source: source.name,
      seen: itemsSeen,
      created: itemsCreated,
      skipped: itemsSkipped,
      errors,
      error: errorMsg,
    });
  }

  const duration = Date.now() - startTime;
  log("info", "Ingestion completed", { duration_ms: duration, results_count: results.length });

  return new Response(JSON.stringify({ ok: true, duration_ms: duration, apiStatus, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
