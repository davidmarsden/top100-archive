const SHEET_ID = process.env.REACT_APP_WINNERS_SHEET_ID;
const CLUBS_RANGE = process.env.REACT_APP_WINNERS_CLUBS_RANGE || 'Clubs!A:Z';
const MANAGERS_RANGE = process.env.REACT_APP_WINNERS_MANAGERS_RANGE || 'Managers!A:Z';
const SERVER_API_KEY = process.env.WINNERS_SERVER_GOOGLE_API_KEY || '';

// Archived tournaments in the Tournaments app (Supabase RPC
// public_tournament_honours) fill in seasons the sheet does not have yet.
// Same public credentials as live-season.js; the sheet always wins.
const envValue = (...keys) =>
  keys.map((key) => (process.env[key] || '').trim().replace(/^['"]|['"]$/g, '').trim()).find(Boolean) || '';
const SUPABASE_URL = envValue('SUPABASE_URL', 'REACT_APP_SUPABASE_URL').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = envValue('SUPABASE_ANON_KEY', 'REACT_APP_SUPABASE_ANON_KEY');

const baseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

const successHeaders = {
  ...baseHeaders,
  'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
};

const errorHeaders = {
  ...baseHeaders,
  'Cache-Control': 'no-store',
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: statusCode >= 200 && statusCode < 300 ? successHeaders : errorHeaders,
    body: JSON.stringify(body),
  };
}

function normalise(value) {
  return String(value || '').trim().toLowerCase();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (char !== '\r') cell += char;
  }

  row.push(cell);
  if (row.some((value) => String(value || '').trim())) rows.push(row);
  return rows;
}

function sheetToObjects(values) {
  if (!Array.isArray(values) || !values.length) return [];
  const [headersRow, ...rows] = values;
  const keys = headersRow.map(normalise);
  return rows
    .filter((row) => Array.isArray(row) && row.some((cell) => String(cell || '').trim()))
    .map((row) => Object.fromEntries(keys.map((key, index) => [key, String(row[index] ?? '').trim()])));
}

function youthRows(clubRows, managerRows) {
  const managerBySeason = new Map(
    managerRows.map((row) => [String(row.season || row.seas || row.s || '').trim(), row]),
  );
  const competitions = [
    { key: 'youth cup', label: 'Youth Cup' },
    { key: 'youth shield', label: 'Youth Shield' },
  ];

  return clubRows.flatMap((clubRow) => {
    const season = String(clubRow.season || clubRow.seas || clubRow.s || '').trim();
    if (!season) return [];
    const managerRow = managerBySeason.get(season) || {};
    return competitions.flatMap(({ key, label }) => {
      const team = String(clubRow[key] || '').trim();
      if (!team) return [];
      return [{
        id: `${season}-${key.replace(/\s+/g, '-')}`,
        season,
        season_number: Number(season) || 0,
        tournament_id: null,
        tournament_name: `S${season} ${label}`,
        honour: `${label} Winner`,
        competition: label,
        team_name: team,
        manager_name: String(managerRow[key] || '').trim(),
      }];
    });
  }).sort((a, b) => b.season_number - a.season_number || a.competition.localeCompare(b.competition));
}

async function fetchTournamentHonours() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_tournament_honours`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}

// Winner honours from archived Youth tournaments, in the same shape as youthRows.
function honourRows(honours) {
  return (Array.isArray(honours) ? honours : [])
    .filter((row) => Number(row.position) === 1 && /youth/i.test(`${row.honour} ${row.tournament_name}`) && Number(row.season_number))
    .map((row) => {
      const shield = /shield/i.test(row.honour);
      const label = shield ? 'Youth Shield' : 'Youth Cup';
      const season = String(row.season_number);
      return {
        id: `${season}-${shield ? 'youth-shield' : 'youth-cup'}`,
        season,
        season_number: Number(season),
        tournament_id: row.tournament_id,
        tournament_name: `S${season} ${label}`,
        honour: `${label} Winner`,
        competition: label,
        team_name: String(row.team_name || '').trim(),
        manager_name: String(row.manager_name || '').trim(),
        source: 'tournaments',
      };
    })
    .filter((row) => row.team_name);
}

// Youth sides in the Tournaments app carry suffixes ("Espanyol Academy",
// "Leicester Youth", "Club Brugge NXT") and short names ("Bayern"), while the
// sheet uses the club's full name ("RCD Espanyol"). Compare on the core tokens.
const YOUTH_SUFFIX = /\b(academy|youth|youths|nxt|molodizhka|u\d{2}|juniors?|primavera|reserves|b team|ii)\b/g;
const CLUB_NOISE = /\b(fc|cf|afc|sc|sk|ac|as|rcd|cd|ud|sv|club|calcio|cp|ssc|hsc|cfc)\b/g;

function clubTokens(name) {
  return String(name || '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(YOUTH_SUFFIX, ' ')
    .replace(CLUB_NOISE, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

// The sheet's spelling of a club when exactly one sheet club matches.
function sheetClubName(appName, sheetNames) {
  const tokens = clubTokens(appName);
  if (!tokens.length) return appName;
  const key = tokens.join(' ');
  const matches = sheetNames.filter((name) => {
    const other = clubTokens(name);
    if (!other.length) return false;
    if (other.join(' ') === key) return true;
    const [short, long] = tokens.length <= other.length ? [tokens, other] : [other, tokens];
    return short.every((token) => long.includes(token));
  });
  const exact = matches.filter((name) => clubTokens(name).join(' ') === key);
  if (exact.length === 1) return exact[0];
  return matches.length === 1 ? matches[0] : appName;
}

function mergeRows(sheetRows, appRows) {
  const seen = new Set(sheetRows.map((row) => row.id));
  const sheetNames = [...new Set(sheetRows.map((row) => row.team_name).filter(Boolean))];
  const added = appRows
    .filter((row) => !seen.has(row.id))
    .map((row) => ({ ...row, app_team_name: row.team_name, team_name: sheetClubName(row.team_name, sheetNames) }));
  return [...sheetRows, ...added]
    .sort((a, b) => b.season_number - a.season_number || a.competition.localeCompare(b.competition));
}

function splitRange(range) {
  const [sheetName, cellRange = 'A:Z'] = String(range || '').split('!');
  return { sheetName: sheetName || 'Sheet1', cellRange };
}

async function fetchPublicCsv(range) {
  const { sheetName, cellRange } = splitRange(range);
  const params = new URLSearchParams({
    tqx: 'out:csv',
    sheet: sheetName,
    range: cellRange,
    headers: '1',
  });
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(SHEET_ID)}/gviz/tq?${params.toString()}`;
  const result = await fetch(url);
  if (!result.ok) throw new Error(`Public Google Sheets CSV request failed (${result.status})`);
  const text = await result.text();
  if (/<!doctype html|<html/i.test(text)) {
    throw new Error('The winners spreadsheet is not publicly readable via CSV export.');
  }
  const values = parseCsv(text);
  const headersRow = (values[0] || []).map(normalise);
  const validSeasonHeaders = ['season', 'seas', 's'];
  if (!validSeasonHeaders.some((header) => headersRow.includes(header))) {
    throw new Error(`Public CSV for ${sheetName} did not return a supported season header.`);
  }
  return values;
}

async function fetchApiRange(range) {
  if (!SERVER_API_KEY) throw new Error('No server-safe Google API key is configured.');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(SHEET_ID)}/values/${encodeURIComponent(range)}?key=${encodeURIComponent(SERVER_API_KEY)}`;
  const result = await fetch(url);
  if (!result.ok) {
    let detail = '';
    try {
      const payload = await result.json();
      detail = payload?.error?.message ? `: ${payload.error.message}` : '';
    } catch {}
    throw new Error(`Google Sheets API request failed (${result.status})${detail}`);
  }
  const payload = await result.json();
  return payload.values || [];
}

async function fetchRange(range) {
  try {
    return await fetchPublicCsv(range);
  } catch (csvError) {
    if (!SERVER_API_KEY) throw csvError;
    return fetchApiRange(range);
  }
}

exports._test = { honourRows, mergeRows, sheetClubName };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: successHeaders, body: '' };
  if (event.httpMethod !== 'GET') return response(405, { error: 'Method not allowed' });
  if (!SHEET_ID) return response(500, { error: 'Archive winners spreadsheet is not configured.' });

  try {
    const [clubsValues, managersValues, honours] = await Promise.all([
      fetchRange(CLUBS_RANGE),
      fetchRange(MANAGERS_RANGE),
      fetchTournamentHonours().catch((error) => {
        console.error(`youth-winners: tournament honours unavailable (${error.message})`);
        return [];
      }),
    ]);
    const rows = mergeRows(youthRows(sheetToObjects(clubsValues), sheetToObjects(managersValues)), honourRows(honours));
    return response(200, { source: 'top100-archive', count: rows.length, rows });
  } catch (error) {
    return response(502, { error: error.message || 'Could not load archive winners.' });
  }
};