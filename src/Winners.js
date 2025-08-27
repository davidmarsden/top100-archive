// src/Winners.js
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Trophy, Search, Award, ShieldCheck } from 'lucide-react';

const normalize = (s) => String(s ?? '').trim();
const lower = (s) => normalize(s).toLowerCase();

const DEFAULT_COMP_HEADERS = [
  'Division 1','Division 2','Division 3','Division 4','Division 5',
  'Top 100 Cup','Top 100 Shield','Youth Cup','Youth Shield',
  'World Club Cup','World Club Shield','Charity Shield',
  'Division 2 Play-off','Division 3 Play-off','Division 4 Play-off','Division 5 Play-off',
  'SMFA Super Cup','SMFA Champions Cup','SMFA Shield',
  'Youth Spoon','World Cup'
];

// Map arbitrary header to canonical competition name (case-insensitive)
const headerToCompetition = (h) => {
  const H = normalize(h);
  if (DEFAULT_COMP_HEADERS.some((x) => x === H)) return H; // exact
  const hit = DEFAULT_COMP_HEADERS.find((x) => lower(x) === lower(H)); // fuzzy
  return hit || H; // fall back
};

// ...imports...
const Winners = ({ sharedSearch, onSharedSearchChange }) => {
  // If App passes a search + setter, use those; otherwise keep local state
  const [internalSearch, setInternalSearch] = useState('');
  const search   = typeof sharedSearch === 'string' ? sharedSearch : internalSearch;
  const setSearch = typeof onSharedSearchChange === 'function' ? onSharedSearchChange : setInternalSearch;

  // ...rest of Winners.js stays the same...
  // normalized rows: { season, competition, winner, kind: 'club'|'manager' }
  const [clubRows, setClubRows] = useState([]);
  const [managerRows, setManagerRows] = useState([]);

  // UI state
  const [search, setSearch] = useState('');
  const [season, setSeason] = useState('');     // '' = all
  const [comp,   setComp]   = useState('');     // '' = all
  const [kind,   setKind]   = useState('club'); // 'club' | 'manager'

  // ENV — single sheet ID for both tabs
  const SHEET_ID         = process.env.REACT_APP_WINNERS_SHEET_ID;
  const API_KEY          = process.env.REACT_APP_GOOGLE_API_KEY;
  const CLUBS_RANGE      = process.env.REACT_APP_WINNERS_CLUBS_RANGE    || 'Clubs!A:Z';
  const MANAGERS_RANGE   = process.env.REACT_APP_WINNERS_MANAGERS_RANGE || 'Managers!A:Z';

  const fetchRange = useCallback(async (range) => {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      SHEET_ID
    )}/values/${encodeURIComponent(range)}?key=${encodeURIComponent(API_KEY)}`;
    const res = await fetch(url);
    if (!res.ok) {
      let details = '';
      try {
        const j = await res.json();
        details = j?.error?.message ? ` - ${j.error.message}` : '';
      } catch {}
      throw new Error(`API Error: ${res.status}${details}`);
    }
    return res.json();
  }, [API_KEY, SHEET_ID]);

  const normalizeTab = (values, kind) => {
    if (!values || values.length === 0) return [];
    const [headerRow, ...rows] = values;

    // find Season column (case-insensitive)
    const seasonIdx = headerRow.findIndex((h) => lower(h) === 'season');
    if (seasonIdx === -1) return []; // no season col found

    // all other columns are competitions
    const compCols = headerRow
      .map((h, i) => ({ i, h }))
      .filter(({ i }) => i !== seasonIdx);

    const out = [];
    for (const row of rows) {
      const seasonVal = normalize(row[seasonIdx]);
      if (!seasonVal) continue; // skip blank seasons
      for (const col of compCols) {
        const winner = normalize(row[col.i]);
        if (!winner) continue; // no winner recorded in this cell
        const competition = headerToCompetition(col.h);
        out.push({ season: seasonVal, competition, winner, kind });
      }
    }
    return out;
  };

  const loadWinners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!API_KEY)   throw new Error('Missing REACT_APP_GOOGLE_API_KEY.');
      if (!SHEET_ID)  throw new Error('Missing REACT_APP_WINNERS_SHEET_ID.');

      const [clubsJson, managersJson] = await Promise.all([
        fetchRange(CLUBS_RANGE),
        fetchRange(MANAGERS_RANGE),
      ]);

      const clubs    = normalizeTab(clubsJson.values, 'club');
      const managers = normalizeTab(managersJson.values, 'manager');

      setClubRows(clubs);
      setManagerRows(managers);

      // optional: keep "All seasons" default for broader views
      // You can setSeason(latest) if you prefer auto-select.
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [API_KEY, SHEET_ID, CLUBS_RANGE, MANAGERS_RANGE, fetchRange]);

  useEffect(() => {
    loadWinners();
  }, [loadWinners]);

  const allRows = useMemo(() => [...clubRows, ...managerRows], [clubRows, managerRows]);

  const allCompetitions = useMemo(
    () => [...new Set(allRows.map(r => r.competition))].sort((a,b) => a.localeCompare(b)),
    [allRows]
  );

  const allSeasons = useMemo(
    () => [...new Set(allRows.map(r => r.season))].sort((a,b) => parseInt(b,10)-parseInt(a,10)),
    [allRows]
  );

  const filtered = useMemo(() => {
    const term = lower(search);
    return allRows.filter(r => {
      if (kind && r.kind !== kind) return false;
      if (season && r.season !== season) return false;
      if (comp && r.competition !== comp) return false;
      if (term) {
        const hay = `${r.winner} ${r.competition} ${r.season}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [allRows, kind, season, comp, search]);

  // Leaderboards
  const lbOverall = useMemo(() => {
    const map = new Map(); // key: `${kind}|${winner}` -> count
    for (const r of filtered) {
      const k = `${r.kind}|${r.winner}`;
      map.set(k, (map.get(k)||0)+1);
    }
    return [...map.entries()]
      .map(([k,count]) => {
        const [, winner] = k.split('|');
        return { winner, count };
      })
      .sort((a,b)=> b.count - a.count || a.winner.localeCompare(b.winner))
      .slice(0, 50);
  }, [filtered]);

  const lbByCompetition = useMemo(() => {
    const compMap = new Map(); // comp -> Map(key, count)
    for (const r of filtered) {
      if (!compMap.has(r.competition)) compMap.set(r.competition, new Map());
      const m = compMap.get(r.competition);
      const k = `${r.kind}|${r.winner}`;
      m.set(k, (m.get(k)||0)+1);
    }
    const out = [];
    for (const [competition, m] of compMap.entries()) {
      const rows = [...m.entries()]
        .map(([k,count]) => {
          const [, winner] = k.split('|');
          return { competition, winner, count };
        })
        .sort((a,b)=> b.count - a.count || a.winner.localeCompare(b.winner))
        .slice(0, 10);
      out.push({ competition, rows });
    }
    return out.sort((a,b)=> a.competition.localeCompare(b.competition));
  }, [filtered]);

  // Season table (wide view)
  const seasonsToShow = useMemo(() => {
    const set = new Set(filtered.map(r=>r.season));
    const seasons = [...set].sort((a,b)=> parseInt(b,10)-parseInt(a,10));
    return seasons.slice(0, 20);
  }, [filtered]);

  const bySeasonComp = useMemo(() => {
    const map = new Map(); // season -> comp -> Set<winner>
    for (const r of filtered) {
      if (!map.has(r.season)) map.set(r.season, new Map());
      const cMap = map.get(r.season);
      if (!cMap.has(r.competition)) cMap.set(r.competition, new Set());
      cMap.get(r.competition).add(r.winner);
    }
    return map;
  }, [filtered]);

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e)=>setSearch(e.target.value)}
              placeholder="Search winners, competitions, seasons…"
              className="w-full pl-9 pr-3 py-2 border rounded-lg"
            />
          </div>
          <select className="border rounded-lg px-3 py-2" value={kind} onChange={(e)=>setKind(e.target.value)}>
            <option value="club">Clubs</option>
            <option value="manager">Managers</option>
          </select>
          <select className="border rounded-lg px-3 py-2" value={season} onChange={(e)=>setSeason(e.target.value)}>
            <option value="">All seasons</option>
            {allSeasons.map(s=> <option key={s} value={s}>Season {s}</option>)}
          </select>
          <select className="border rounded-lg px-3 py-2" value={comp} onChange={(e)=>setComp(e.target.value)}>
            <option value="">All competitions</option>
            {allCompetitions.map(c=> <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="font-bold text-lg flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-yellow-600" /> Overall {kind === 'club' ? 'Club' : 'Manager'} Winners
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2">#{kind === 'club' ? 'Club' : 'Manager'}</th>
                <th className="py-2 text-right">Trophies</th>
              </tr>
            </thead>
            <tbody>
              {lbOverall.map((r,i)=>(
                <tr key={i} className="border-t">
                  <td className="py-2">{r.winner}</td>
                  <td className="py-2 text-right font-semibold">{r.count}</td>
                </tr>
              ))}
              {lbOverall.length === 0 && (
                <tr><td className="py-3 text-gray-500" colSpan={2}>No data.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl shadow p-5 lg:col-span-2">
          <h3 className="font-bold text-lg flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600" /> Top Winners by Competition
          </h3>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {lbByCompetition.map(block => (
              <div key={block.competition} className="border rounded-lg p-3">
                <div className="font-semibold text-sm mb-2">{block.competition}</div>
                <table className="w-full text-xs">
                  <tbody>
                    {block.rows.map((r,i)=>(
                      <tr key={i} className="border-t">
                        <td className="py-1 pr-2 truncate">{r.winner}</td>
                        <td className="py-1 text-right font-semibold">{r.count}</td>
                      </tr>
                    ))}
                    {block.rows.length === 0 && (
                      <tr><td className="py-2 text-gray-500">—</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            ))}
            {lbByCompetition.length === 0 && <div className="text-gray-500">No competitions in view.</div>}
          </div>
        </div>
      </div>

      {/* Season tables */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-bold text-lg flex items-center gap-2 mb-3">
          <Award className="w-5 h-5 text-green-600" /> Season Winners (last {seasonsToShow.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 px-2">Season</th>
                {allCompetitions.map(c => (
                  <th key={c} className="py-2 px-2">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {seasonsToShow.map(s => {
                const cMap = bySeasonComp.get(s) || new Map();
                return (
                  <tr key={s} className="border-t align-top">
                    <td className="py-2 px-2 font-semibold">S{s}</td>
                    {allCompetitions.map(c => {
                      const winners = cMap.get(c);
                      const list = winners ? [...winners].sort((a,b)=>a.localeCompare(b)) : [];
                      return (
                        <td key={c} className="py-2 px-2">
                          {list.length ? (
                            <div className="flex flex-wrap gap-1">
                              {list.map((w,i)=>(
                                <span key={i} className="inline-block px-2 py-0.5 rounded bg-gray-100 border text-xs">{w}</span>
                              ))}
                            </div>
                          ) : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {seasonsToShow.length === 0 && (
                <tr><td className="py-3 text-gray-500" colSpan={1 + allCompetitions.length}>No seasons in view.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error/Loading */}
      {loading && <div className="text-gray-600">Loading trophy data…</div>}
      {error && <div className="text-red-600">Error: {error}</div>}
    </div>
  );
};

export default Winners;