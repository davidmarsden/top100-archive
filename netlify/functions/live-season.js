// Current-season league table from Soccer Manager Sync (Supabase RPC
// public_league_season_rows), for merging into the Full History sheet rows.
// Needs SUPABASE_URL and SUPABASE_ANON_KEY: the public browser credentials,
// not the service-role key.

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || '';

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
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_league_season_rows`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_world_slug: 'top-100' }),
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const rows = await res.json();
    return {
      statusCode: 200,
      headers: headers('public, max-age=300, s-maxage=900, stale-while-revalidate=86400'),
      body: JSON.stringify({ rows, configured: true }),
    };
  } catch (error) {
    return { statusCode: 502, headers: headers('no-store'), body: JSON.stringify({ rows: [], error: error.message }) };
  }
};
