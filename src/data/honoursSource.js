// One place to load the honours tables (Clubs and Managers, wide layout).
// Game competitions come from Soccer Manager Sync for every season it has read;
// the winners sheet supplies the Youth Cup and Shield and any season Sync hasn't
// read. If Sync can't be reached, the sheet is used as it is.
import { gameHonoursSeasons, mergeHonoursWide } from "./gameHonours";

const SHEET_ID = process.env.REACT_APP_WINNERS_SHEET_ID;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const CLUBS_RANGE = process.env.REACT_APP_WINNERS_CLUBS_RANGE || "Clubs!A:Z";
const MANAGERS_RANGE = process.env.REACT_APP_WINNERS_MANAGERS_RANGE || "Managers!A:Z";
const GAME_HONOURS_URL = "/.netlify/functions/game-honours";

const fetchSheetValues = async (range) => {
  if (!SHEET_ID || !API_KEY) return [];
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(SHEET_ID)}/values/${encodeURIComponent(range)}?key=${encodeURIComponent(API_KEY)}`;
  const res = await fetch(url);
  if (!res.ok) {
    let details = "";
    try {
      const json = await res.json();
      details = json?.error?.message ? ` - ${json.error.message}` : "";
    } catch {}
    throw new Error(`Honours sheet error: ${res.status}${details}`);
  }
  const json = await res.json();
  return json.values || [];
};

const fetchGameHonours = async () => {
  const res = await fetch(GAME_HONOURS_URL, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`game honours ${res.status}`);
  const json = await res.json();
  return Array.isArray(json?.rows) ? json.rows : [];
};

let cached = null;

// { clubs, managers, gameSeasons, sheetError, gameError }
export const loadHonoursTables = () => {
  if (!cached) {
    cached = (async () => {
      const [clubsResult, managersResult, gameResult] = await Promise.allSettled([
        fetchSheetValues(CLUBS_RANGE),
        fetchSheetValues(MANAGERS_RANGE),
        fetchGameHonours(),
      ]);
      const game = gameResult.status === "fulfilled" ? gameResult.value : [];
      const sheetClubs = clubsResult.status === "fulfilled" ? clubsResult.value : [];
      const sheetManagers = managersResult.status === "fulfilled" ? managersResult.value : [];
      const sheetError = [clubsResult, managersResult].find((r) => r.status === "rejected")?.reason?.message || null;
      if (sheetError && !game.length) throw new Error(sheetError);
      return {
        clubs: mergeHonoursWide(sheetClubs, game, "club"),
        managers: mergeHonoursWide(sheetManagers, game, "manager"),
        gameSeasons: gameHonoursSeasons(game),
        sheetError,
        gameError: gameResult.status === "rejected" ? gameResult.reason?.message || "unavailable" : null,
      };
    })();
    cached.catch(() => { cached = null; });
  }
  return cached;
};

// The wide values as objects keyed by lower-case header (what most readers use).
export const valuesToObjects = (values) => {
  if (!Array.isArray(values) || !values.length) return [];
  const [headers, ...rows] = values;
  const keys = headers.map((header) => String(header || "").trim().toLowerCase());
  return rows
    .filter((row) => row && row.length)
    .map((row) => Object.fromEntries(keys.map((key, index) => [key, String(row[index] ?? "").trim()])));
};
