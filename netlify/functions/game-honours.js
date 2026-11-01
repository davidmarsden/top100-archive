// Game World honours from Soccer Manager Sync (Supabase RPC
// public_game_world_honours): every competition's winning club and manager per
// season. src/data/gameHonours.js merges them over the winners sheet.
// Needs SUPABASE_URL and SUPABASE_ANON_KEY: the public browser credentials,
// not the service-role key.

const envValue = (...keys) =>
  keys.map((key) => (process.env[key] || '').trim().replace(/^['"]|['"]$/g, '').trim()).find(Boolean) || '';

const SUPABASE_URL = envValue('SUPABASE_URL', 'REACT_APP_SUPABASE_URL').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = envValue('SUPABASE_ANON_KEY', 'REACT_APP_SUPABASE_ANON_KEY');

const headers = (cache) => ({
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': cache,
});

exports.handler = async () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { statusCode: 200, headers: headers('no-store'), body: JSON.stringify({ rows: [], configured: false }) };
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_game_world_honours`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_world_slug: 'top-100' }),
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const rows = await res.json();
    return {
      statusCode: 200,
      headers: headers('public, max-age=300, s-maxage=900, stale-while-revalidate=86400'),
      body: JSON.stringify({ rows: Array.isArray(rows) ? rows : [], configured: true }),
    };
  } catch (error) {
    console.error(`game-honours: ${error.message}`);
    return { statusCode: 502, headers: headers('no-store'), body: JSON.stringify({ rows: [], error: error.message }) };
  }
};
