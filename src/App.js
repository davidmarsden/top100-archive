// src/App.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Charts from './Charts';
import ManagerProfiles from './ManagerProfiles';
import Winners from './Winners';
import {
  Search,
  BarChart3,
  Target,
  Trophy,
  Users,
  Loader,
  AlertCircle,
  SortAsc,
  Award,
  Database,
} from 'lucide-react';

/* ------------------------------
   Helpers (no hooks)
--------------------------------*/
const numeric = (v) => {
  const n = parseInt(String(v ?? '').trim(), 10);
  return Number.isFinite(n) ? n : 0;
};

const isChampion   = (pos)           => numeric(pos) === 1;
const isD1UCL      = (div, pos)      => numeric(div) === 1 && numeric(pos) >= 2 && numeric(pos) <= 4;
const isD1Shield   = (div, pos)      => numeric(div) === 1 && numeric(pos) >= 5 && numeric(pos) <= 10;
const isAutoPromo  = (div, pos)      => numeric(div) >= 2 && numeric(div) <= 5 && (numeric(pos) === 2 || numeric(pos) === 3);
const isPlayoff    = (div, pos)      => numeric(div) >= 2 && numeric(div) <= 5 && numeric(pos) >= 4 && numeric(pos) <= 7;
const isRelegated  = (div, pos)      => numeric(div) >= 1 && numeric(div) <= 4 && numeric(pos) >= 17 && numeric(pos) <= 20;
const isAutoSacked = (pos)           => numeric(pos) >= 18 && numeric(pos) <= 20;

const getRowStyling = (position, division) => {
  if (isAutoSacked(position))                 return 'bg-rose-50 border-l-4 border-rose-700 ring-1 ring-rose-200 hover:bg-rose-100';
  if (isRelegated(division, position))        return 'bg-red-50 border-l-4 border-red-700 ring-1 ring-red-200 hover:bg-red-100';
  if (isChampion(position))                    return 'bg-yellow-50 border-l-4 border-yellow-500 ring-1 ring-yellow-200 hover:bg-yellow-100';
  if (isAutoPromo(division, position))         return 'bg-green-50 border-l-4 border-green-600 ring-1 ring-green-200 hover:bg-green-100';
  if (isPlayoff(division, position))           return 'bg-blue-50 border-l-4 border-blue-600 ring-1 ring-blue-200 hover:bg-blue-100';
                                               return 'bg-white hover:bg-gray-50';
};

const getPositionBadge = (position, division) => {
  if (isAutoSacked(position))          return { bg: 'bg-rose-600',   text: 'text-white', icon: '⛔' };
  if (isRelegated(division, position)) return { bg: 'bg-red-600',    text: 'text-white', icon: '⬇️' };
  if (isChampion(position))            return { bg: 'bg-yellow-500', text: 'text-white', icon: '👑' };
  if (isAutoPromo(division, position)) return { bg: 'bg-green-600',  text: 'text-white', icon: '⬆️' };
  if (isPlayoff(division, position))   return { bg: 'bg-blue-600',   text: 'text-white', icon: '🏁' };
  if (isD1UCL(division, position))     return { bg: 'bg-purple-600', text: 'text-white', icon: '🏆' };
  if (isD1Shield(division, position))  return { bg: 'bg-indigo-600', text: 'text-white', icon: '🛡️' };
                                       return { bg: 'bg-gray-200',   text: 'text-gray-800', icon: '' };
};

// Build tags; accepts the playoff winners map so it doesn’t close over component state
const getTeamTags = (position, division, team, season, playoffMap) => {
  const tags = [];
  if (isChampion(position))            tags.push({ label: 'Champions',               style: 'bg-yellow-100 text-yellow-800 border border-yellow-300' });
  if (isD1UCL(division, position))     tags.push({ label: 'SMFA Champions Cup',      style: 'bg-purple-100 text-purple-800 border border-purple-300' });
  if (isD1Shield(division, position))  tags.push({ label: 'SMFA Shield',             style: 'bg-indigo-100 text-indigo-800 border border-indigo-300' });
  if (isAutoPromo(division, position)) tags.push({ label: 'Auto-Promoted',           style: 'bg-green-100 text-green-800 border border-green-300' });
  if (isPlayoff(division, position))   tags.push({ label: 'Playoffs',                style: 'bg-blue-100 text-blue-800 border border-blue-300' });
  if (isRelegated(division, position)) tags.push({ label: 'Relegated',               style: 'bg-red-100 text-red-800 border border-red-300' });
  if (isAutoSacked(position))          tags.push({ label: 'Auto-Sacked',             style: 'bg-rose-200 text-rose-900 border border-rose-400' });

  // Add "Playoff Winner (Promoted)" if this row matches the winners sheet
  const key    = `${String(season || '').trim()}|${String(division || '').trim()}`;
  const winner = playoffMap?.get(key);
  if (winner && team && winner.toLowerCase() === String(team).toLowerCase()) {
    tags.push({ label: 'Playoff Winner (Promoted)', style: 'bg-emerald-100 text-emerald-800 border border-emerald-300' });
  }
  return tags;
};

/* ------------------------------
   Small presentational helpers
--------------------------------*/
const LegendSwatch = ({ color, label }) => (
  <div className="flex items-center gap-2">
    <span className={`w-4 h-4 rounded border ${color}`} />
    <span>{label}</span>
  </div>
);

const ThresholdCard = ({ title, rows }) => (
  <div className="bg-white rounded-xl shadow p-4">
    <h4 className="font-semibold mb-3">{title}</h4>
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-600">
          <th className="py-2">Div</th>
          <th className="py-2">Min</th>
          <th className="py-2">Avg</th>
          <th className="py-2">Max</th>
          <th className="py-2 text-right">Samples</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t">
            <td className="py-2">D{r.division}</td>
            <td className="py-2">{r.min}</td>
            <td className="py-2 font-semibold">{r.avg}</td>
            <td className="py-2">{r.max}</td>
            <td className="py-2 text-right">{r.samples}</td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td className="py-2 text-gray-500" colSpan={5}>
              No data available.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const DataPlaceholder = () => (
  <div className="bg-white rounded-2xl p-16 shadow-xl text-center">
    <Trophy className="w-20 h-20 text-gray-400 mx-auto mb-6" />
    <h3 className="text-2xl font-bold text-gray-700 mb-4">Connecting to Database…</h3>
    <p className="text-gray-600 mb-6">Please wait while we load the latest archive data.</p>
  </div>
);

/* ------------------------------
   Main App
--------------------------------*/
const Top100Archive = () => {
  // Core data state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('tables');
  const [selectedSeason, setSelectedSeason] = useState('25');
  const [selectedDivision, setSelectedDivision] = useState('1');
  const [sortBy, setSortBy] = useState('position');
  const [allPositionData, setAllPositionData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);

  // Play-off winners (from Winners sheet: Clubs tab)
  const [playoffWinnersBySeasonDiv, setPlayoffWinnersBySeasonDiv] = useState(new Map());

  // Environment / config
  const API_KEY    = process.env.REACT_APP_GOOGLE_API_KEY;
  const SHEET_ID   = process.env.REACT_APP_SHEET_ID || process.env.REACT_APP_TOP100_SHEET_ID; // support either name
  const SHEET_RANGE = 'Sorted by team!A:R';

  // Winners sheet env (same spreadsheet ID for clubs & managers winners)
  const WINNERS_SHEET_ID    = process.env.REACT_APP_WINNERS_SHEET_ID;
  const WINNERS_CLUBS_RANGE = process.env.REACT_APP_WINNERS_CLUBS_RANGE || 'Clubs!A:U';

  // Hash → tab sync
  useEffect(() => {
    const allowed = new Set(['search', 'tables', 'insights', 'charts', 'managers', 'honours']);
    const apply = () => {
      const h = (window.location.hash || '').replace('#', '').trim();
      setActiveTab(allowed.has(h) ? h : 'tables');
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  // Load archive data (header-based)
  const loadFromGoogleSheets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!SHEET_ID) throw new Error('Missing REACT_APP_SHEET_ID.');
      if (!API_KEY) throw new Error('Missing REACT_APP_GOOGLE_API_KEY.');

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        SHEET_ID
      )}/values/${encodeURIComponent(SHEET_RANGE)}?key=${encodeURIComponent(API_KEY)}`;

      const res = await fetch(url);
      if (!res.ok) {
        let details = '';
        try {
          const j = await res.json();
          details = j?.error?.message ? ` - ${j.error.message}` : '';
        } catch {}
        throw new Error(`API Error: ${res.status}${details}`);
      }

      const data = await res.json();
      const values = data?.values || [];
      if (!values.length) throw new Error('No data found in the sheet');

      const [headerRow, ...rows] = values;
      const norm = (s) => String(s || '').trim().toLowerCase();
      const H = headerRow.map(norm);
      const idx = (alts) => {
        const a = Array.isArray(alts) ? alts : [alts];
        const i = H.findIndex((h) => a.includes(h));
        return i === -1 ? null : i;
      };
      const get = (row, i) => (i == null ? '' : String(row[i] ?? '').trim());

      const cSeason  = idx(['season', 'seas', 's']);
      const cDiv     = idx(['div', 'division', 'd']);
      const cPos     = idx(['pos', 'position', 'rank']);
      const cTeam    = idx(['team', 'club']);
      const cP       = idx(['p', 'played', 'pld']);
      const cW       = idx(['w', 'won']);
      const cD       = idx(['d', 'drawn', 'draws']);
      const cL       = idx(['l', 'lost']);
      const cGF      = idx(['gf', 'goals for', 'for']);
      const cGA      = idx(['ga', 'goals against', 'against', 'conceded']);
      const cGD      = idx(['gd', 'goal difference']);
      const cPts     = idx(['pts', 'points', 'pnts']);
      const cStart   = idx(['start date', 'start', 'date']);
      const cManager = idx(['manager', 'mgr', 'coach']);

      const formatted = rows
        .filter((r) => get(r, cSeason) && get(r, cTeam))
        .map((r) => ({
          season:          get(r, cSeason),
          division:        get(r, cDiv),
          position:        get(r, cPos),
          team:            get(r, cTeam),
          played:          get(r, cP),
          won:             get(r, cW),
          drawn:           get(r, cD),
          lost:            get(r, cL),
          goals_for:       get(r, cGF),
          goals_against:   get(r, cGA),
          goal_difference: get(r, cGD),
          points:          get(r, cPts),
          start_date:      get(r, cStart),
          manager:         get(r, cManager),
        }));

      setAllPositionData(formatted);
      setDataLoaded(true);

      const latest = Math.max(...formatted.map((r) => numeric(r.season) || 0)).toString();
      if (latest && latest !== '-Infinity') setSelectedSeason(latest);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [API_KEY, SHEET_ID]);

  // Load play-off winners (clubs tab)
  const loadPlayoffWinners = useCallback(async () => {
    if (!WINNERS_SHEET_ID || !API_KEY) return; // optional
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        WINNERS_SHEET_ID
      )}/values/${encodeURIComponent(WINNERS_CLUBS_RANGE)}?key=${encodeURIComponent(API_KEY)}`;

      const res = await fetch(url);
      if (!res.ok) return;
      const json = await res.json();
      const values = json?.values || [];
      if (!values.length) return;

      const [header, ...rows] = values;
      const norm = (s) => String(s || '').trim().toLowerCase();
      const H = header.map(norm);
      const ix = (name) => H.findIndex((h) => h === name);
      const sIx  = ix('season');
      const d2PO = ix('division 2 play-off');
      const d3PO = ix('division 3 play-off');
      const d4PO = ix('division 4 play-off');
      const d5PO = ix('division 5 play-off');
      const get = (row, i) => (i < 0 ? '' : String(row[i] ?? '').trim());

      const map = new Map();
      for (const r of rows) {
        const season = get(r, sIx);
        if (!season) continue;
        const d2 = get(r, d2PO); if (d2) map.set(`${season}|2`, d2);
        const d3 = get(r, d3PO); if (d3) map.set(`${season}|3`, d3);
        const d4 = get(r, d4PO); if (d4) map.set(`${season}|4`, d4);
        const d5 = get(r, d5PO); if (d5) map.set(`${season}|5`, d5);
      }
      setPlayoffWinnersBySeasonDiv(map);
    } catch {
      // optional, ignore errors
    }
  }, [API_KEY, WINNERS_SHEET_ID, WINNERS_CLUBS_RANGE]);

  // Kick off loads
  useEffect(() => {
    loadFromGoogleSheets();
    loadPlayoffWinners();
  }, [loadFromGoogleSheets, loadPlayoffWinners]);

  // Options for selectors
  const availableSeasons = useMemo(() => {
    return [...new Set(allPositionData.map((r) => (r.season || '').trim()))]
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));
  }, [allPositionData]);

  const availableDivisions = useMemo(() => {
    return [
      ...new Set(
        allPositionData
          .filter((r) => (r.season || '').trim() === (selectedSeason || '').trim())
          .map((r) => (r.division || '').trim())
      ),
    ]
      .filter(Boolean)
      .sort();
  }, [allPositionData, selectedSeason]);

  // Filtering/sorting
  const getFilteredData = (season = null, division = null, sortOrder = 'position') => {
    let filtered = [...allPositionData];
    if (season)   filtered = filtered.filter((r) => (r.season || '').trim()   === (season || '').trim());
    if (division) filtered = filtered.filter((r) => (r.division || '').trim() === (division || '').trim());

    switch (sortOrder) {
      case 'points':
        return filtered.sort((a, b) => numeric(b.points) - numeric(a.points));
      case 'team':
        return filtered.sort((a, b) => a.team.localeCompare(b.team));
      case 'manager':
        return filtered.sort((a, b) => (a.manager || '').localeCompare(b.manager || ''));
      case 'division':
        return filtered.sort((a, b) => {
          const d = numeric(a.division) - numeric(b.division);
          return d !== 0 ? d : numeric(a.position) - numeric(b.position);
        });
      case 'position':
      default:
        return filtered.sort((a, b) => numeric(a.position) - numeric(b.position));
    }
  };

  /* -------- Insights data builders -------- */
  const countBy = (arr, keyGetter) => {
    const map = new Map();
    for (const item of arr) {
      const key = keyGetter(item);
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  };

  const allRows = allPositionData;

  const leaders = useMemo(() => {
    const titles = allRows.filter((r) => isChampion(r.position));

    // Promotions = auto-promo + play-off winners
    const promos = allRows.filter((r) => isAutoPromo(r.division, r.position));
    for (const r of allRows) {
      if (!isPlayoff(r.division, r.position)) continue;
      const key = `${String(r.season || '').trim()}|${String(r.division || '').trim()}`;
      const winner = playoffWinnersBySeasonDiv.get(key);
      if (winner && winner.toLowerCase() === String(r.team || '').toLowerCase()) {
        promos.push(r);
      }
    }

    const rels  = allRows.filter((r) => isRelegated(r.division, r.position));
    const sacks = allRows.filter((r) => isAutoSacked(r.position));

    return {
      byTeam: {
        titles:      countBy(titles, (r) => r.team),
        promotions:  countBy(promos, (r) => r.team),
        relegations: countBy(rels,   (r) => r.team),
        sackings:    countBy(sacks,  (r) => r.team),
      },
      byManager: {
        titles:      countBy(titles, (r) => r.manager),
        promotions:  countBy(promos, (r) => r.manager),
        relegations: countBy(rels,   (r) => r.manager),
        sackings:    countBy(sacks,  (r) => r.manager),
      },
    };
  }, [allRows, playoffWinnersBySeasonDiv]);

  const buildRecords = (metric = 'points', group = 'team', order = 'desc', seasonFilter, divisionFilter) => {
    const rows = getFilteredData(seasonFilter || null, divisionFilter || null, 'position');
    const withMetric = rows.map((r) => ({
      ...r,
      value:
        metric === 'points' ? numeric(r.points)
      : metric === 'gf'     ? numeric(r.goals_for)
      : metric === 'ga'     ? numeric(r.goals_against)
      : metric === 'gd'     ? numeric(r.goal_difference)
      : 0,
    }));
    withMetric.sort((a, b) => (order === 'asc' ? a.value - b.value : b.value - a.value));

    const keyFn =
      group === 'team'     ? (r) => r.team
    : group === 'manager'  ? (r) => r.manager
    : group === 'season'   ? (r) => r.season
    : group === 'division' ? (r) => r.division
    : group === 'position' ? (r) => r.position
                           : () => '';

    const seen = new Set();
    const result = [];
    for (const r of withMetric) {
      const k = keyFn(r);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      result.push(r);
      if (result.length >= 50) break;
    }
    return result;
  };

  const computeThresholds = useMemo(() => {
    const bySeasonDiv = new Map();
    for (const r of allRows) {
      const season = (r.season || '').trim();
      const div    = (r.division || '').trim();
      if (!season || !div) continue;
      const key = `${season}|${div}`;
      if (!bySeasonDiv.has(key)) bySeasonDiv.set(key, []);
      bySeasonDiv.get(key).push(r);
    }

    const acc = {
      win:        new Map(), // pos 1
      autoPromo:  new Map(), // D2–D5 pos 3
      playoffs:   new Map(), // D2–D5 pos 7
      avoidReleg: new Map(), // D1–D4 pos 16
      avoidSack:  new Map(), // all pos 17
    };

    const push = (m, div, pts) => {
      const d = (div || '').trim();
      if (!d) return;
      const p = numeric(pts);
      if (!m.has(d)) m.set(d, []);
      m.get(d).push(p);
    };

    for (const [k, rows] of bySeasonDiv.entries()) {
      const [, div] = k.split('|');
      const d = numeric(div);
      const byPos = new Map();
      for (const r of rows) byPos.set(numeric(r.position), r);

      if (byPos.has(1))  push(acc.win,        div, byPos.get(1).points);
      if (d >= 2 && d <= 5 && byPos.has(3)) push(acc.autoPromo,  div, byPos.get(3).points);
      if (d >= 2 && d <= 5 && byPos.has(7)) push(acc.playoffs,   div, byPos.get(7).points);
      if (d >= 1 && d <= 4 && byPos.has(16)) push(acc.avoidReleg, div, byPos.get(16).points);
      if (byPos.has(17)) push(acc.avoidSack,  div, byPos.get(17).points);
    }

    const summarize = (m) => {
      const out = [];
      for (const [div, arr] of m.entries()) {
        if (!arr.length) continue;
        const min = Math.min(...arr);
        const max = Math.max(...arr);
        const avg = Math.round((arr.reduce((s, x) => s + x, 0) / arr.length) * 10) / 10;
        out.push({ division: div, min, avg, max, samples: arr.length });
      }
      return out.sort((a, b) => numeric(a.division) - numeric(b.division));
    };

    return {
      win:        summarize(acc.win),
      autoPromo:  summarize(acc.autoPromo),
      playoffs:   summarize(acc.playoffs),
      avoidReleg: summarize(acc.avoidReleg),
      avoidSack:  summarize(acc.avoidSack),
    };
  }, [allRows]);

   // Raw per-(season,division) points series for Charts
  const thresholdHistory = useMemo(() => {
    const bySeasonDiv = new Map();
    for (const r of allRows) {
      const season = (r.season || '').trim();
      const div    = (r.division || '').trim();
      if (!season || !div) continue;
      const key = `${season}|${div}`;
      if (!bySeasonDiv.has(key)) bySeasonDiv.set(key, []);
      bySeasonDiv.get(key).push(r);
    }

    const out = { win: [], autoPromo: [], playoffs: [], avoidReleg: [], avoidSack: [] };
    const push = (arr, season, division, row) => {
      if (!row) return;
      arr.push({ season, division, points: numeric(row.points) });
    };

    for (const [k, rows] of bySeasonDiv.entries()) {
      const [season, division] = k.split('|');
      const d = numeric(division);
      const byPos = new Map();
      rows.forEach((r) => byPos.set(numeric(r.position), r));

      push(out.win,       season, division, byPos.get(1));
      if (d >= 2 && d <= 5) push(out.autoPromo, season, division, byPos.get(3));
      if (d >= 2 && d <= 5) push(out.playoffs,  season, division, byPos.get(7));
      if (d >= 1 && d <= 4) push(out.avoidReleg,season, division, byPos.get(16));
      push(out.avoidSack, season, division, byPos.get(17));
    }

    return out;
  }, [allRows]);

  /* -------- UI blocks (components within file) -------- */
  const SearchResults = () => {
    const filtered = allPositionData
      .filter(
        (t) =>
          t.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (t.manager && t.manager.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => {
        const s = numeric(b.season) - numeric(a.season);
        if (s !== 0) return s;
        const d = numeric(a.division) - numeric(b.division);
        if (d !== 0) return d;
        return numeric(a.position) - numeric(b.position);
      });

    return (
      <div className="space-y-4">
        <div className="grid gap-4">
          {filtered.map((team, index) => {
            const badge = getPositionBadge(team.position, team.division);
            const tags  = getTeamTags(team.position, team.division, team.team, team.season, playoffWinnersBySeasonDiv);
            return (
              <div
                key={index}
                className={`${getRowStyling(team.position, team.division)} rounded-xl p-6 shadow-lg transition-all hover:shadow-xl`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h4 className="text-xl font-bold text-gray-900">{team.team}</h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${badge.bg} ${badge.text}`}>
                        {badge.icon ? `${badge.icon} ` : ''}#{team.position}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Manager</p>
                        <p className="font-semibold">{team.manager || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Season & Division</p>
                        <p className="font-semibold">S{team.season} D{team.division}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Record</p>
                        <p className="font-semibold">{team.won}W {team.drawn}D {team.lost}L</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Goal Difference</p>
                        <p className={`font-semibold ${numeric(team.goal_difference) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {numeric(team.goal_difference) > 0 ? '+' : ''}{team.goal_difference}
                        </p>
                      </div>
                    </div>
                    {tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {tags.map((t, i) => (
                          <span key={i} className={`px-2 py-0.5 rounded-md text-xs font-semibold ${t.style}`}>
                            {t.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-3xl font-bold text-blue-600 mb-1">{team.points}</div>
                    <div className="text-sm text-gray-500">points</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Results Found</h3>
            <p className="text-gray-500">Try searching for a different team or manager name</p>
          </div>
        )}
      </div>
    );
  };

  const LeagueRow = ({ team, selectedDivision }) => {
    const badge = getPositionBadge(team.position, selectedDivision);
    const tags  = getTeamTags(team.position, selectedDivision, team.team, team.season, playoffWinnersBySeasonDiv);
    return (
      <tr className={`${getRowStyling(team.position, selectedDivision)} border-b border-gray-100 transition-all hover:shadow-md`}>
        <td className="py-4 px-4">
          <span
            className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold ${badge.bg} ${badge.text}`}
            title={tags.map((t) => t.label).join(' • ')}
          >
            {badge.icon ? `${badge.icon} ` : ''}
            {team.position}
          </span>
        </td>
        <td className="py-4 px-4">
          <div className="flex items-start gap-3">
            <div>
              <div className="font-bold text-gray-900 text-lg">{team.team}</div>
              <div className="text-sm text-gray-600 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {team.manager || 'Unknown Manager'}
              </div>
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((t, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded-md text-xs font-semibold ${t.style}`}>
                      {t.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="py-4 px-3 text-center font-semibold">{team.played}</td>
        <td className="py-4 px-3 text-center font-bold text-green-600">{team.won}</td>
        <td className="py-4 px-3 text-center font-semibold text-gray-600">{team.drawn}</td>
        <td className="py-4 px-3 text-center font-bold text-red-600">{team.lost}</td>
        <td className="py-4 px-3 text-center font-semibold">{team.goals_for}</td>
        <td className="py-4 px-3 text-center font-semibold">{team.goals_against}</td>
        <td className={`py-4 px-3 text-center font-bold ${numeric(team.goal_difference) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {numeric(team.goal_difference) > 0 ? '+' : ''}{team.goal_difference}
        </td>
        <td className="py-4 px-4 text-center">
          <span className="inline-flex items-center justify-center w-12 h-8 bg-blue-100 text-blue-800 rounded-lg font-bold">
            {team.points}
          </span>
        </td>
      </tr>
    );
  };

  const LeagueTable = () => {
    const tableData = getFilteredData(selectedSeason, selectedDivision, sortBy);
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header with controls */}
        <div className="p-6 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-2xl font-bold">Season {selectedSeason} - Division {selectedDivision}</h3>
              <p className="text-blue-200">Complete League Table ({tableData.length} teams)</p>
              <p className="text-xs text-blue-300 mt-1">Soccer Manager Worlds Top 100 Elite Community</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { id: 'position', label: 'Position',   icon: Trophy },
                { id: 'points',   label: 'Points',     icon: Target },
                { id: 'team',     label: 'Team A-Z',   icon: SortAsc },
                { id: 'manager',  label: 'Manager A-Z',icon: Users },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSortBy(s.id)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    sortBy === s.id ? 'bg-white text-blue-600 shadow-lg' : 'bg-blue-500 hover:bg-blue-400 text-white'
                  }`}
                >
                  <s.icon className="w-4 h-4" />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left  py-4 px-4 font-bold text-gray-700">Pos</th>
                <th className="text-left  py-4 px-4 font-bold text-gray-700">Team & Manager</th>
                <th className="text-center py-4 px-3 font-bold text-gray-700">P</th>
                <th className="text-center py-4 px-3 font-bold text-green-600">W</th>
                <th className="text-center py-4 px-3 font-bold text-gray-600">D</th>
                <th className="text-center py-4 px-3 font-bold text-red-600">L</th>
                <th className="text-center py-4 px-3 font-bold text-gray-700">GF</th>
                <th className="text-center py-4 px-3 font-bold text-gray-700">GA</th>
                <th className="text-center py-4 px-3 font-bold text-gray-700">GD</th>
                <th className="text-center py-4 px-4 font-bold text-blue-600">Pts</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((team, index) => (
                <LeagueRow key={index} team={team} selectedDivision={selectedDivision} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="p-6 bg-gray-50 border-t">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-700 mb-2">Legend</h4>
              <div className="flex flex-wrap gap-4 text-sm">
                <LegendSwatch color="bg-yellow-300 border-yellow-500" label="Champions (1st)" />
                <LegendSwatch color="bg-green-300 border-green-600"  label="Auto-Promoted (2nd–3rd in D2–D5)" />
                <LegendSwatch color="bg-blue-300 border-blue-600"   label="Playoffs (4th–7th in D2–D5)" />
                <LegendSwatch color="bg-red-300 border-red-700"     label="Relegated (17th–20th in D1–D4)" />
                <LegendSwatch color="bg-rose-400 border-rose-700"   label="Automatic Sacking (18th–20th all divisions)" />
                <LegendSwatch color="bg-purple-300 border-purple-500" label="D1: SMFA Champions Cup (2nd–4th)" />
                <LegendSwatch color="bg-indigo-300 border-indigo-500" label="D1: SMFA Shield (5th–10th)" />
              </div>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p className="font-semibold">Current View:</p>
              <p>Sorted by: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}</p>
              <p>Season {selectedSeason} Division {selectedDivision}</p>
              <p>{tableData.length} teams displayed</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Insights = () => {
    const [leadersView,   setLeadersView]   = useState('team');     // 'team' | 'manager'
    const [recordsMetric, setRecordsMetric] = useState('points');   // points|gf|ga|gd
    const [recordsGroup,  setRecordsGroup]  = useState('team');     // team|manager|season|division|position
    const [recordsOrder,  setRecordsOrder]  = useState('desc');     // desc|asc
    const [recordsSeason, setRecordsSeason] = useState('');
    const [recordsDivision, setRecordsDivision] = useState('');

    const recordRows = useMemo(
      () => buildRecords(recordsMetric, recordsGroup, recordsOrder, recordsSeason || null, recordsDivision || null),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [recordsMetric, recordsGroup, recordsOrder, recordsSeason, recordsDivision]
    );

    const src = leadersView === 'team' ? leaders.byTeam : leaders.byManager;

    const LeaderTable = ({ title, rows }) => (
      <div className="bg-white rounded-xl shadow p-4">
        <h4 className="font-semibold mb-3">{title}</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="py-2">#{leadersView === 'team' ? 'Team' : 'Manager'}</th>
              <th className="py-2 text-right">Count</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 15).map((r, i) => (
              <tr key={i} className="border-t">
                <td className="py-2">{r.key || 'Unknown'}</td>
                <td className="py-2 text-right font-semibold">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    return (
      <div className="space-y-8">
        {/* Leaders */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-600" /> Leaders
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setLeadersView('team')}
                className={`px-3 py-1 rounded ${leadersView === 'team' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
              >
                Teams
              </button>
              <button
                onClick={() => setLeadersView('manager')}
                className={`px-3 py-1 rounded ${leadersView === 'manager' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
              >
                Managers
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <LeaderTable title="Most Titles"           rows={src.titles} />
            <LeaderTable title="Most Promotions"       rows={src.promotions} />
            <LeaderTable title="Most Relegations"      rows={src.relegations} />
            <LeaderTable title="Most Sackings"         rows={src.sackings} />
          </div>
        </div>

        {/* Records */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" /> Records
            </h3>
            <div className="flex flex-wrap gap-2">
              <select className="border rounded px-2 py-1" value={recordsMetric} onChange={(e) => setRecordsMetric(e.target.value)}>
                <option value="points">Points</option>
                <option value="gf">Goals For</option>
                <option value="ga">Goals Against</option>
                <option value="gd">Goal Difference</option>
              </select>
              <select className="border rounded px-2 py-1" value={recordsGroup} onChange={(e) => setRecordsGroup(e.target.value)}>
                <option value="team">By Team</option>
                <option value="manager">By Manager</option>
                <option value="season">By Season</option>
                <option value="division">By Division</option>
                <option value="position">By Position</option>
              </select>
              <select className="border rounded px-2 py-1" value={recordsOrder} onChange={(e) => setRecordsOrder(e.target.value)}>
                <option value="desc">Highest</option>
                <option value="asc">Lowest</option>
              </select>
              <select className="border rounded px-2 py-1" value={recordsSeason} onChange={(e) => setRecordsSeason(e.target.value)}>
                <option value="">All Seasons</option>
                {availableSeasons.map((s) => (
                  <option key={s} value={s}>Season {s}</option>
                ))}
              </select>
              <select className="border rounded px-2 py-1" value={recordsDivision} onChange={(e) => setRecordsDivision(e.target.value)}>
                <option value="">All Divisions</option>
                {[1, 2, 3, 4, 5].map((d) => (
                  <option key={d} value={String(d)}>Division {d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 px-2">Team</th>
                  <th className="py-2 px-2">Manager</th>
                  <th className="py-2 px-2">Season</th>
                  <th className="py-2 px-2">Div</th>
                  <th className="py-2 px-2">Pos</th>
                  <th className="py-2 px-2">Points</th>
                  <th className="py-2 px-2">GF</th>
                  <th className="py-2 px-2">GA</th>
                  <th className="py-2 px-2">GD</th>
                </tr>
              </thead>
              <tbody>
                {recordRows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-2 px-2">{r.team}</td>
                    <td className="py-2 px-2">{r.manager || 'Unknown'}</td>
                    <td className="py-2 px-2">{r.season}</td>
                    <td className="py-2 px-2">{r.division}</td>
                    <td className="py-2 px-2">{r.position}</td>
                    <td className="py-2 px-2 font-semibold">{r.points}</td>
                    <td className="py-2 px-2">{r.goals_for}</td>
                    <td className="py-2 px-2">{r.goals_against}</td>
                    <td className="py-2 px-2">{r.goal_difference}</td>
                  </tr>
                ))}
                {recordRows.length === 0 && (
                  <tr>
                    <td className="py-4 px-2 text-gray-500" colSpan={9}>
                      No rows found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Thresholds */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-green-700" />
            <h3 className="text-xl font-bold">Points Thresholds (Min / Avg / Max)</h3>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            <ThresholdCard title="Win Division (Pos 1)"               rows={computeThresholds.win} />
            <ThresholdCard title="Auto-Promotion (Pos 3 in D2–D5)"     rows={computeThresholds.autoPromo} />
            <ThresholdCard title="Make Playoffs (Pos 7 in D2–D5)"      rows={computeThresholds.playoffs} />
            <ThresholdCard title="Avoid Relegation (Pos 16 in D1–D4)"  rows={computeThresholds.avoidReleg} />
            <ThresholdCard title="Avoid Sacking (Pos 17 in all Divs)"  rows={computeThresholds.avoidSack} />
          </div>
        </div>
      </div>
    );
  };

  /* ------------------------------
     Layout
  -------------------------------*/
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-white bg-opacity-10 rounded-full p-4">
                <Trophy className="w-16 h-16 text-yellow-400" />
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-yellow-400 via-blue-300 to-purple-300 bg-clip-text text-transparent">
              TOP 100 ARCHIVE
            </h1>
            <p className="text-xl md:text-2xl text-blue-200 mb-8">
              Soccer Manager Worlds Elite Community • Complete Historical Database
            </p>

            {/* Status Indicator */}
            <div className="flex items-center justify-center gap-3 text-lg">
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin text-yellow-400" />
                  <span className="text-blue-200">Loading historical data...</span>
                </>
              ) : error ? (
                <>
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-300">Database Error: {error}</span>
                </>
              ) : dataLoaded ? (
                <>
                  <Database className="w-5 h-5 text-green-400" />
                  <span className="text-green-300">✅ Live Database Connected</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <span className="text-yellow-300">⚙️ Setup Required</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white shadow-xl sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap gap-2 py-4">
            {[
              { id: 'search',   label: 'Search',            icon: Search,   color: 'blue' },
              { id: 'tables',   label: 'League Tables',     icon: BarChart3,color: 'purple' },
              { id: 'insights', label: 'Insights',          icon: Award,    color: 'green' },
              { id: 'charts',   label: 'Charts',            icon: BarChart3,color: 'indigo' },
              { id: 'managers', label: 'Manager Profiles',  icon: Users,    color: 'teal' },
              { id: 'honours',  label: 'Honours',           icon: Trophy,   color: 'yellow' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  window.location.hash = tab.id;
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                  activeTab === tab.id
                    ? `bg-gradient-to-r from-${tab.color}-500 to-${tab.color}-600 text-white shadow-lg`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search bar + selectors */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search teams or managers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                disabled={!dataLoaded}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {activeTab === 'tables' && availableSeasons.length > 0 && (
              <>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white"
                >
                  {availableSeasons.map((season) => (
                    <option key={season} value={season}>Season {season}</option>
                  ))}
                </select>
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white"
                >
                  {availableDivisions.map((div) => (
                    <option key={div} value={div}>Division {div}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {/* Content sections */}
        {activeTab === 'search'   && (dataLoaded ? <SearchResults /> : <DataPlaceholder />)}
        {activeTab === 'tables'   && (dataLoaded ? <LeagueTable />   : <DataPlaceholder />)}
        {activeTab === 'insights' && (dataLoaded ? <Insights />      : <DataPlaceholder />)}
        {activeTab === 'charts'   && (dataLoaded ? <Charts thresholdHistory={thresholdHistory} /> : <DataPlaceholder />)}
        {activeTab === 'managers' && (dataLoaded ? <ManagerProfiles allPositionData={allPositionData} /> : <DataPlaceholder />)}
        {activeTab === 'honours'  && <Winners />}
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-slate-800 to-slate-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Trophy className="w-12 h-12 text-yellow-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Soccer Manager Worlds Top 100</h3>
            <p className="text-gray-300 mb-6">Elite Community • Historical Database • 25+ Seasons</p>
            <div className="mt-8 pt-6 border-t border-gray-700">
              <p className="text-sm text-gray-400">
                Built for the Soccer Manager Worlds Top 100 Community •
                <span className="text-blue-300"> Professional Football Management</span>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Top100Archive;
