// Appointment scores (rulebook 3.2) and bottom-three reviews (3.1) for the Top 100
// admin appointments page (tournaments.smtop100.blog/admin/appointments), from the
// same archive as Stats & History: the Full History sheet, the stats archive and
// the live season. POST { mode: "vacancies" | "review" | "history", ...config } with the config
// described in src/data/appointmentData.js. It only computes from public data.
// GET ?mode=profiles[&manager=&club=] returns every current manager's appointment profile
// (approximate level, trajectory, strengths and weaknesses), for the archive's manager
// profiles and the Manager Portal; it is public and cached.
import { applicantHistory, buildArchive, managerProfiles, parseSheetTable, reviewBottomThree, sameClub, scoreVacancies } from "../../src/data/appointmentData.js";
import { buildCupHonours } from "../../src/data/cupHonours.js";
import { mergeHonoursWide } from "../../src/data/gameHonours.js";

const clean = (value) => String(value || "").trim().replace(/^['"]|['"]$/g, "").trim();
const SHEET_ID = clean(process.env.REACT_APP_SHEET_ID) || "17-BZlcYuAQCfUV5gxAzS93Dsy6bq8mk_yRat88R5t-w";
const SHEET_RANGE = "Full History!A:R";
// The winners sheet (Youth Cup and Shield, World Club and seasons Sync hasn't read), as the Honours tab reads it.
const WINNERS_SHEET_ID = clean(process.env.REACT_APP_WINNERS_SHEET_ID);
const WINNERS_CLUBS_RANGE = clean(process.env.REACT_APP_WINNERS_CLUBS_RANGE) || "Clubs!A:Z";
const WINNERS_MANAGERS_RANGE = clean(process.env.REACT_APP_WINNERS_MANAGERS_RANGE) || "Managers!A:Z";
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

// Cup honours for the honours part of the score: Soccer Manager Sync's game honours merged
// over the winners sheet, exactly as the Honours tab shows them. Without them no cups count,
// so a failure is logged rather than hidden.
const sheetValues = async (range) =>
  WINNERS_SHEET_ID
    ? (await json(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(WINNERS_SHEET_ID)}/values/${encodeURIComponent(range)}?key=${encodeURIComponent(GOOGLE_KEY)}`,
        { headers: { Referer: `${SITE}/` } })).values || []
    : [];
const loadCupHonours = async () => {
  const [clubs, managers, game] = await Promise.allSettled([
    sheetValues(WINNERS_CLUBS_RANGE),
    sheetValues(WINNERS_MANAGERS_RANGE),
    json(`${SUPABASE_URL}/rest/v1/rpc/public_game_world_honours`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_world_slug: "top-100" }),
    }),
  ]);
  [clubs, managers, game].filter((result) => result.status === "rejected").forEach((result) => console.error(`appointment-scores honours: ${result.reason?.message}`));
  const value = (result) => (result.status === "fulfilled" && Array.isArray(result.value) ? result.value : []);
  return buildCupHonours({ clubs: mergeHonoursWide(value(clubs), value(game), "club"), managers: mergeHonoursWide(value(managers), value(game), "manager") });
};

const loadArchive = async () => {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.archive;
  const cupHonours = loadCupHonours();
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
  const archive = buildArchive({ sheetRows: parseSheetTable(sheet.values || []), statsRows: stats.rows || stats, liveRows: live || [], cupHonours: await cupHonours });
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
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: { ...headers, "Access-Control-Allow-Methods": "GET, POST, OPTIONS" }, body: "" };
  if (event.httpMethod === "GET") return profilesResponse(event.queryStringParameters || {});
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "GET or POST only" }) };

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
    if (config.mode === "history") {
      if (!Array.isArray(config.applicants) || config.applicants.length > 300) throw Object.assign(new Error("applicants (up to 300) are required"), { status: 400 });
      return { statusCode: 200, headers, body: JSON.stringify({ currentSeason: season, applicants: applicantHistory(archive, { ...config, currentSeason: season }) }) };
    }
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'mode must be "vacancies", "review" or "history"' }) };
  } catch (error) {
    console.error(`appointment-scores: ${error.message}`);
    return { statusCode: error.status || 502, headers, body: JSON.stringify({ error: error.message }) };
  }
};

// Public appointment profiles: from public records only, so any site may read them.
const profilesResponse = async (query) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=900",
  };
  if (query.mode !== "profiles") return { statusCode: 400, headers, body: JSON.stringify({ error: 'GET supports mode=profiles only' }) };
  try {
    const archive = await loadArchive();
    const latest = Math.max(...archive.rows.map((row) => Number(row.season)).filter(Number.isFinite));
    const requested = Number(query.season);
    const currentSeason = Number.isInteger(requested) && requested > 0 && requested <= latest ? requested : latest;
    let profiles = managerProfiles(archive, { currentSeason });
    const managers = profiles.length;
    const manager = String(query.manager || "").slice(0, 120);
    const club = String(query.club || "").slice(0, 120);
    if (manager) {
      const name = archive.archiveName({ name: manager, club: club || undefined });
      profiles = profiles.filter((profile) => profile.manager === name);
    } else if (club) {
      // A club on its own: whoever manages it in the chosen season.
      profiles = profiles.filter((profile) => sameClub(profile.club, club));
    }
    return { statusCode: 200, headers, body: JSON.stringify({ currentSeason, managers, profiles }) };
  } catch (error) {
    console.error(`appointment-scores profiles: ${error.message}`);
    return { statusCode: 502, headers: { ...headers, "Cache-Control": "no-store" }, body: JSON.stringify({ error: "Profiles are unavailable right now." }) };
  }
};
