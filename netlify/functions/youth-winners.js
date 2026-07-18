const SHEET_ID = process.env.REACT_APP_WINNERS_SHEET_ID;
const CLUBS_RANGE = process.env.REACT_APP_WINNERS_CLUBS_RANGE || 'Clubs!A:Z';
const MANAGERS_RANGE = process.env.REACT_APP_WINNERS_MANAGERS_RANGE || 'Managers!A:Z';
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
  'Content-Type': 'application/json; charset=utf-8',
};

function response(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function normalise(value) {
  return String(value || '').trim().toLowerCase();
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

async function fetchRange(range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(SHEET_ID)}/values/${encodeURIComponent(range)}?key=${encodeURIComponent(API_KEY)}`;
  const result = await fetch(url);
  if (!result.ok) {
    let detail = '';
    try {
      const payload = await result.json();
      detail = payload?.error?.message ? `: ${payload.error.message}` : '';
    } catch {}
    throw new Error(`Google Sheets request failed (${result.status})${detail}`);
  }
  return result.json();
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return response(405, { error: 'Method not allowed' });
  if (!SHEET_ID || !API_KEY) return response(500, { error: 'Archive winners data source is not configured.' });

  try {
    const [clubsJson, managersJson] = await Promise.all([
      fetchRange(CLUBS_RANGE),
      fetchRange(MANAGERS_RANGE),
    ]);
    const rows = youthRows(sheetToObjects(clubsJson.values), sheetToObjects(managersJson.values));
    return response(200, { source: 'top100-archive', count: rows.length, rows });
  } catch (error) {
    return response(502, { error: error.message || 'Could not load archive winners.' });
  }
};
