// Appointment scores (rulebook 3.2) and bottom-three reviews (3.1) for the Top 100
// admin appointments page (tournaments.smtop100.blog/admin/appointments), from the
// same archive as Stats & History: the Full History sheet, the stats archive and
// the live season. POST { mode: "vacancies" | "review", ...config } with the config
// described in src/data/appointmentData.js. It only computes from public data.
import { buildArchive, parseSheetTable, reviewBottomThree, scoreVacancies } from "../../src/data/appointmentData.js";

const clean = (value) => String(value || "").trim().replace(/^['"]|['"]$/g, "").trim();
const SHEET_ID = clean(process.env.REACT_APP_SHEET_ID) || "17-BZlcYuAQCfUV5gxAzS93Dsy6bq8mk_yRat88R5t-w";
const SHEET_RANGE = "Full History!A:R";
const GOOGLE_KEY = clean(process.env.REACT_APP_GOOGLE_API_KEY);
const SUPABASE_URL = clean(process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL).replace(/\/+$/, "");
const SUPABASE_ANON_KEY = clean(process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY);
const SITE = clean(process.env.URL) || "https://archive.smtop100.blog";
const ALLOWED_ORIGINS = ["https://tournaments.smtop100.blog", "https://admin.smtop100.blog"];
const CACHE_MS = 5 * 60 * 1000;

let cached = null;

const json = async (url, options) => {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${new URL(url).hostname} ${response.status}: ${(await response.text()).slice(0, 200)}`);
  return response.json();
};

const loadArchive = async () => {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.archive;
  const [sheet, stats, live] = await Promise.all([
    // The browser key is restricted to the site's referrer.
    json(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(SHEET_ID)}/values/${encodeURIComponent(SHEET_RANGE)}?key=${encodeURIComponent(GOOGLE_KEY)}`,
      { headers: { Referer: `${SITE}/` } }),
    json(`${SITE}/data/statsArchive.json`),
    json(`${SUPABASE_URL}/rest/v1/rpc/public_league_season_rows`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_world_slug: "top-100" }),
    }),
  ]);
  const archive = buildArchive({ sheetRows: parseSheetTable(sheet.values || []), statsRows: stats.rows || stats, liveRows: live || [] });
  cached = { at: Date.now(), archive };
  return archive;
};

export const handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || "";
  const headers = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) || /^https:\/\/deploy-preview-\d+--top100-tournaments\.netlify\.app$/.test(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "POST only" }) };

  let config;
  try {
    config = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }
  const season = Number(config.currentSeason);
  if (!Number.isInteger(season) || season < 1) return { statusCode: 400, headers, body: JSON.stringify({ error: "currentSeason is required" }) };

  try {
    const archive = await loadArchive();
    if (config.mode === "vacancies") {
      if (!Array.isArray(config.vacancies) || !Array.isArray(config.applicants)) throw Object.assign(new Error("vacancies and applicants are required"), { status: 400 });
      return { statusCode: 200, headers, body: JSON.stringify(scoreVacancies(archive, { ...config, currentSeason: season })) };
    }
    if (config.mode === "review") {
      if (!Array.isArray(config.managers)) throw Object.assign(new Error("managers are required"), { status: 400 });
      return { statusCode: 200, headers, body: JSON.stringify(reviewBottomThree(archive, { ...config, currentSeason: season })) };
    }
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'mode must be "vacancies" or "review"' }) };
  } catch (error) {
    console.error(`appointment-scores: ${error.message}`);
    return { statusCode: error.status || 502, headers, body: JSON.stringify({ error: error.message }) };
  }
};
