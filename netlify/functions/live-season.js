// Current-season league table from Soccer Manager Sync (Supabase RPC
// public_league_season_rows), for merging into the Full History sheet rows.
// Needs SUPABASE_URL and SUPABASE_ANON_KEY: the public browser credentials,
// not the service-role key.

// Pasted values often carry spaces or quotes, which would make fetch fail.
const envValue = (...keys) =>
  keys.map((key) => (process.env[key] || '').trim().replace(/^['"]|['"]$/g, '').trim()).find(Boolean) || '';

const SUPABASE_URL = envValue('SUPABASE_URL', 'REACT_APP_SUPABASE_URL').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = envValue('SUPABASE_ANON_KEY', 'REACT_APP_SUPABASE_ANON_KEY');

// ?world=regen reads Top 100 Regen; anything else is Top 100.
const WORLDS = new Set(['top-100', 'regen']);
const worldSlug = (event) => {
  const world = String(event?.queryStringParameters?.world || '').trim();
  return WORLDS.has(world) ? world : 'top-100';
};

const headers = (cache) => ({
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': cache,
  // The CDN keeps one cached copy per world.
  'Netlify-Vary': 'query=world',
});

exports.handler = async (event) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { statusCode: 200, headers: headers('no-store'), body: JSON.stringify({ rows: [], configured: false }) };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_league_season_rows`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_world_slug: worldSlug(event) }),
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const rows = await res.json();
    return {
      statusCode: 200,
      headers: headers('public, max-age=300, s-maxage=900, stale-while-revalidate=86400'),
      body: JSON.stringify({ rows, configured: true }),
    };
  } catch (error) {
    console.error(`live-season: ${error.message}${error.cause ? ` (${error.cause.message || error.cause})` : ''}`);
    return { statusCode: 502, headers: headers('no-store'), body: JSON.stringify({ rows: [], error: error.message }) };
  }
};
