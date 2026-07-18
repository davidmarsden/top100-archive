const SHEET_ID = process.env.REACT_APP_WINNERS_SHEET_ID;
const CLUBS_RANGE = process.env.REACT_APP_WINNERS_CLUBS_RANGE || 'Clubs!A:Z';
const MANAGERS_RANGE = process.env.REACT_APP_WINNERS_MANAGERS_RANGE || 'Managers!A:Z';
const SERVER_API_KEY = process.env.WINNERS_SERVER_GOOGLE_API_KEY || '';

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
  });
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(SHEET_ID)}/gviz/tq?${params.toString()}`;
  const result = await fetch(url);
  if (!result.ok) throw new Error(`Public Google Sheets CSV request failed (${result.status})`);
  const text = await result.text();
  if (/<!doctype html|<html/i.test(text)) {
    throw new Error('The winners spreadsheet is not publicly readable via CSV export.');
  }
  return parseCsv(text);
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

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: successHeaders, body: '' };
  if (event.httpMethod !== 'GET') return response(405, { error: 'Method not allowed' });
  if (!SHEET_ID) return response(500, { error: 'Archive winners spreadsheet is not configured.' });

  try {
    const [clubsValues, managersValues] = await Promise.all([
      fetchRange(CLUBS_RANGE),
      fetchRange(MANAGERS_RANGE),
    ]);
    const rows = youthRows(sheetToObjects(clubsValues), sheetToObjects(managersValues));
    return response(200, { source: 'top100-archive', count: rows.length, rows });
  } catch (error) {
    return response(502, { error: error.message || 'Could not load archive winners.' });
  }
};
