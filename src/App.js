// src/App.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Charts from "./Charts";
import ManagerProfiles from "./ManagerProfiles";
import Winners from "./Winners";
import {
  Search,
  BarChart3,
  Target,
  Trophy,
  Users,
  Loader,
  AlertCircle,
  SortAsc,
  Database,
} from 'lucide-react';

// ------------------------------
// Status logic helpers
// ------------------------------
// ------------------------------
// Status + tag helpers (define ONCE, above component)
// ------------------------------
const isChampion = (pos) => parseInt(pos || 0, 10) === 1;
const isD1UCL = (div, pos) => parseInt(div || 0, 10) === 1 && parseInt(pos || 0, 10) >= 2 && parseInt(pos || 0, 10) <= 4;
const isD1Shield = (div, pos) => parseInt(div || 0, 10) === 1 && parseInt(pos || 0, 10) >= 5 && parseInt(pos || 0, 10) <= 10;
const isAutoPromo = (div, pos) => {
  const d = parseInt(div || 0, 10), p = parseInt(pos || 0, 10);
  return d >= 2 && d <= 5 && (p === 2 || p === 3);
};
const isPlayoffBand = (div, pos) => {
  const d = parseInt(div || 0, 10), p = parseInt(pos || 0, 10);
  return d >= 2 && d <= 5 && p >= 4 && p <= 7;
};
const isRelegated = (div, pos) => {
  const d = parseInt(div || 0, 10), p = parseInt(pos || 0, 10);
  return d >= 1 && d <= 4 && p >= 17 && p <= 20;
};
const isAutoSacked = (pos) => {
  const p = parseInt(pos || 0, 10);
  return p >= 18 && p <= 20;
};

// normalization used for playoff winners matching
const normDiv = (d) => {
  const m = String(d || '').match(/\d+/);
  return m ? m[0] : String(d || '').trim();
};
const normalizeName = (s) =>
  String(s || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(fc|cf|afc|sc|club)\b/gi, ' ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const playoffWinnerKey = (season, division, team) =>
  `${String(season || '').trim()}|${normDiv(division)}|${normalizeName(team)}`;

// SINGLE SOURCE OF TRUTH — keep ONLY this getTeamTags
const getTeamTags = (position, division, team, season, playoffWinnersSet) => {
  const tags = [];
  if (isChampion(position)) tags.push({ label: 'Champions', style: 'bg-yellow-100 text-yellow-800 border border-yellow-300' });
  if (isD1UCL(division, position)) tags.push({ label: 'SMFA Champions Cup', style: 'bg-purple-100 text-purple-800 border border-purple-300' });
  if (isD1Shield(division, position)) tags.push({ label: 'SMFA Shield', style: 'bg-indigo-100 text-indigo-800 border border-indigo-300' });
  if (isAutoPromo(division, position)) tags.push({ label: 'Auto-Promoted', style: 'bg-green-100 text-green-800 border border-green-300' });
  if (isPlayoffBand(division, position) &&
      playoffWinnersSet?.has(playoffWinnerKey(season, division, team))) {
    tags.push({ label: 'Playoff Winner (Promoted)', style: 'bg-green-200 text-green-900 border border-green-400' });
  }
  if (isRelegated(division, position)) tags.push({ label: 'Relegated', style: 'bg-red-100 text-red-800 border border-red-300' });
  if (isAutoSacked(position)) tags.push({ label: 'Auto-Sacked', style: 'bg-rose-200 text-rose-900 border border-rose-400' });
  return tags;
};

const getPositionBadge = (position, division, team, season, playoffWinnersSet) => {
  if (isAutoSacked(position)) return { bg: 'bg-rose-600', text: 'text-white', icon: '⛔' };
  if (isRelegated(division, position)) return { bg: 'bg-red-600', text: 'text-white', icon: '⬇️' };
  if (isChampion(position)) return { bg: 'bg-yellow-500', text: 'text-white', icon: '👑' };
  if (isAutoPromo(division, position)) return { bg: 'bg-green-600', text: 'text-white', icon: '⬆️' };
  if (isPlayoffBand(division, position) &&
      playoffWinnersSet?.has(playoffWinnerKey(season, division, team))) {
    return { bg: 'bg-green-600', text: 'text-white', icon: '⬆️' };
  }
  if (isD1UCL(division, position)) return { bg: 'bg-purple-600', text: 'text-white', icon: '🏆' };
  if (isD1Shield(division, position)) return { bg: 'bg-indigo-600', text: 'text-white', icon: '🛡️' };
  return { bg: 'bg-gray-200', text: 'text-gray-800', icon: '' };
};

// ------------------------------
// Main component
// ------------------------------
const Top100Archive = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('tables'); 
  const [selectedSeason, setSelectedSeason] = useState('25');
  const [selectedDivision, setSelectedDivision] = useState('1');
  const [sortBy, setSortBy] = useState('position');
  const [allPositionData, setAllPositionData] = useState([]);
  const [playoffWinnersBySeasonDiv, setPlayoffWinnersBySeasonDiv] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Config
  const SHEET_ID = process.env.REACT_APP_SHEET_ID;
  const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
  const SHEET_RANGE = 'Sorted by team!A:R';
  const WINNERS_SHEET_ID = process.env.REACT_APP_WINNERS_SHEET_ID;
  const WINNERS_CLUBS_RANGE = process.env.REACT_APP_WINNERS_CLUBS_RANGE;

  // Load main league data
  const loadFromGoogleSheets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(SHEET_ID)}/values/${encodeURIComponent(SHEET_RANGE)}?key=${encodeURIComponent(API_KEY)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const data = await response.json();
      if (!data.values) throw new Error("No data returned");

      const [headerRow, ...rows] = data.values;
      const idx = (names) => {
        const candidates = Array.isArray(names) ? names : [names];
        return headerRow.findIndex((h) => candidates.includes(h.toLowerCase()));
      };
      const get = (row, i) => (i == null ? '' : String(row[i] ?? '').trim());

      const formatted = rows.map((row) => ({
        season: get(row, 0),
        division: get(row, 1),
        position: get(row, 2),
        team: get(row, 3),
        played: get(row, 4),
        won: get(row, 5),
        drawn: get(row, 6),
        lost: get(row, 7),
        goals_for: get(row, 8),
        goals_against: get(row, 9),
        goal_difference: get(row, 10),
        points: get(row, 11),
        start_date: get(row, 12),
        manager: get(row, 13),
      }));

      setAllPositionData(formatted);
      setDataLoaded(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [API_KEY, SHEET_ID, SHEET_RANGE]);

  // Load playoff winners (clubs sheet)
  const loadWinners = useCallback(async () => {
    if (!WINNERS_SHEET_ID || !WINNERS_CLUBS_RANGE) return;
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(WINNERS_SHEET_ID)}/values/${encodeURIComponent(WINNERS_CLUBS_RANGE)}?key=${encodeURIComponent(API_KEY)}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.values) return;
      const [header, ...rows] = data.values;
      const playoffCols = [
        { col: header.indexOf("Division 2 Play-off"), div: 2 },
        { col: header.indexOf("Division 3 Play-off"), div: 3 },
        { col: header.indexOf("Division 4 Play-off"), div: 4 },
        { col: header.indexOf("Division 5 Play-off"), div: 5 },
      ];
      const s = new Set();
      for (const row of rows) {
        const season = row[0];
        for (const { col, div } of playoffCols) {
          if (col >= 0 && row[col]) {
            s.add(playoffWinnerKey(season, div, row[col]));
          }
        }
      }
      setPlayoffWinnersBySeasonDiv(s);
    } catch (_) {}
  }, [WINNERS_SHEET_ID, WINNERS_CLUBS_RANGE, API_KEY]);

  useEffect(() => {
    loadFromGoogleSheets();
    loadWinners();
  }, [loadFromGoogleSheets, loadWinners]);

  // ---- UI continues (Search, Tables, Insights, Charts, Managers, Honours) ----
  // For brevity, keep your existing UI components exactly as before,
  // but replace calls to getTeamTags / getPositionBadge to include playoffWinnersBySeasonDiv.
  // Example inside LeagueTable:
  // const tags = getTeamTags(team.position, selectedDivision, team.team, team.season, playoffWinnersBySeasonDiv);
  // const badge = getPositionBadge(team.position, selectedDivision, team.team, team.season, playoffWinnersBySeasonDiv);

  // Render tab content (add honours back):
  // {activeTab === 'honours' && <Winners />}

  // Keep rest of your render unchanged…
};

export default Top100Archive;

  /* =========================
     Derived data
     ========================= */

  // Fast lookup set for playoff winners -> promotion
  const playoffWinnersSet = useMemo(() => {
    const s = new Set();
    playoffWinnersBySeasonDiv.forEach((team, key) => {
      const [season, division] = key.split('|');
      s.add(playoffWinnerKey(season, division, team));
    });
    return s;
  }, [playoffWinnersBySeasonDiv]);

  const availableSeasons = useMemo(
    () =>
      [...new Set(allPositionData.map((r) => (r.season || '').trim()))]
        .filter(Boolean)
        .sort((a, b) => b.localeCompare(a)),
    [allPositionData]
  );

  const availableDivisions = useMemo(
    () =>
      [
        ...new Set(
          allPositionData
            .filter((r) => (r.season || '').trim() === (selectedSeason || '').trim())
            .map((r) => (r.division || '').trim())
        ),
      ]
        .filter(Boolean)
        .sort(),
    [allPositionData, selectedSeason]
  );

  const getFilteredData = (season = null, division = null, sortOrder = 'position') => {
    let filtered = [...allPositionData];
    if (season) filtered = filtered.filter((r) => (r.season || '').trim() === (season || '').trim());
    if (division)
      filtered = filtered.filter((r) => (r.division || '').trim() === (division || '').trim());

    switch (sortOrder) {
      case 'points':
        return filtered.sort((a, b) => numeric(b.points) - numeric(a.points));
      case 'team':
        return filtered.sort((a, b) => a.team.localeCompare(b.team));
      case 'manager':
        return filtered.sort((a, b) => (a.manager || '').localeCompare(b.manager || ''));
      case 'division':
        return filtered.sort((a, b) => {
          const d = parseInt(a.division || 0, 10) - parseInt(b.division || 0, 10);
          return d !== 0 ? d : parseInt(a.position || 0, 10) - parseInt(b.position || 0, 10);
        });
      case 'position':
      default:
        return filtered.sort((a, b) => parseInt(a.position || 0, 10) - parseInt(b.position || 0, 10));
    }
  };

  /* =========================
     Tags builder (uses winners)
     ========================= */
  
/* =========================
   Tags builder (uses winners)
   ========================= */
const buildRowTags = (position, division, team, season, winnersSet) => {
  const tags = [];

  if (isChampion(position))
    tags.push({ label: 'Champions', style: 'bg-yellow-100 text-yellow-800 border border-yellow-300' });
  if (isD1UCL(division, position))
    tags.push({ label: 'SMFA Champions Cup', style: 'bg-purple-100 text-purple-800 border border-purple-300' });
  if (isD1Shield(division, position))
    tags.push({ label: 'SMFA Shield', style: 'bg-indigo-100 text-indigo-800 border border-indigo-300' });
  if (isAutoPromo(division, position))
    tags.push({ label: 'Auto-Promoted', style: 'bg-green-100 text-green-800 border border-green-300' });
  if (isPlayoffBand(division, position))
    tags.push({ label: 'Playoffs', style: 'bg-blue-100 text-blue-800 border border-blue-300' });
  if (isRelegated(division, position))
    tags.push({ label: 'Relegated', style: 'bg-red-100 text-red-800 border border-red-300' });
  if (isAutoSacked(position))
    tags.push({ label: 'Auto-Sacked', style: 'bg-rose-200 text-rose-900 border border-rose-400' });

  // Playoff Winner (promoted) — from winners sheet
  const isWinner = winnersSet?.has(playoffWinnerKey(season, division, team));
  if (isWinner) {
    tags.push({
      label: 'Playoff Winner (Promoted)',
      style: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    });
  }

  return { tags, isWinner };
};
  /* =========================
     Insights (leaders, records, thresholds)
     ========================= */

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

  const leaders = useMemo(() => {
    const rowsTitles = allPositionData.filter((r) => isChampion(r.position));

    // Promotions = auto-promo + (playoff band & winner set match)
    const promos = [];
    for (const r of allPositionData) {
      if (isAutoPromo(r.division, r.position)) {
        promos.push(r);
        continue;
      }
      if (isPlayoffBand(r.division, r.position) &&
          playoffWinnersSet.has(playoffWinnerKey(r.season, r.division, r.team))) {
        promos.push(r);
      }
    }

    const rowsReleg = allPositionData.filter((r) => isRelegated(r.division, r.position));
    const rowsSack = allPositionData.filter((r) => isAutoSacked(r.position));

    const byTeam = {
      titles: countBy(rowsTitles, (r) => r.team),
      promotions: countBy(promos, (r) => r.team),
      relegations: countBy(rowsReleg, (r) => r.team),
      sackings: countBy(rowsSack, (r) => r.team),
    };
    const byManager = {
      titles: countBy(rowsTitles, (r) => r.manager),
      promotions: countBy(promos, (r) => r.manager),
      relegations: countBy(rowsReleg, (r) => r.manager),
      sackings: countBy(rowsSack, (r) => r.manager),
    };
    return { byTeam, byManager };
  }, [allPositionData, playoffWinnersSet]);

  const buildRecords = (metric = 'points', group = 'team', order = 'desc', seasonFilter, divisionFilter) => {
    const rows = getFilteredData(seasonFilter || null, divisionFilter || null, 'position');
    const withMetric = rows.map((r) => ({
      ...r,
      value:
        metric === 'points'
          ? numeric(r.points)
          : metric === 'gf'
          ? numeric(r.goals_for)
          : metric === 'ga'
          ? numeric(r.goals_against)
          : metric === 'gd'
          ? numeric(r.goal_difference)
          : 0,
    }));
    withMetric.sort((a, b) => (order === 'asc' ? a.value - b.value : b.value - a.value));
    const keyFn =
      group === 'team'
        ? (r) => r.team
        : group === 'manager'
        ? (r) => r.manager
        : group === 'season'
        ? (r) => r.season
        : group === 'division'
        ? (r) => r.division
        : group === 'position'
        ? (r) => r.position
        : () => '';

    const seen = new Set();
    const result = [];
    for (const r of withMetric) {
      const k = keyFn(r);
      if (!k) continue;
      if (seen.has(k)) continue;
      seen.add(k);
      result.push(r);
      if (result.length >= 50) break;
    }
    return result;
  };

    const computeThresholds = useMemo(() => {
    const bySeasonDiv = new Map();
    for (const r of allPositionData) {
      const season = (r.season || '').trim();
      const division = (r.division || '').trim();
      const key = `${season}|${division}`;
      if (!bySeasonDiv.has(key)) bySeasonDiv.set(key, []);
      bySeasonDiv.get(key).push(r);
    }

    const acc = {
      win: new Map(),
      autoPromo: new Map(),
      playoffs: new Map(),
      avoidReleg: new Map(),
      avoidSack: new Map(),
    };

    const push = (m, div, pts) => {
      const d = (div || '').trim();
      if (!d) return;
      const p = numeric(pts);
      if (!m.has(d)) m.set(d, []);
      m.get(d).push(p);
    };

    for (const [key, rows] of bySeasonDiv.entries()) {
      const [, div] = key.split('|');
      const d = parseInt(div || 0, 10);
      const byPos = new Map();
      for (const r of rows) byPos.set(parseInt(r.position || 0, 10), r);

      if (byPos.has(1)) push(acc.win, div, byPos.get(1).points);
      if (d >= 2 && d <= 5 && byPos.has(3)) push(acc.autoPromo, div, byPos.get(3).points);
      if (d >= 2 && d <= 5 && byPos.has(7)) push(acc.playoffs, div, byPos.get(7).points);
      if (d >= 1 && d <= 4 && byPos.has(16)) push(acc.avoidReleg, div, byPos.get(16).points);
      if (byPos.has(17)) push(acc.avoidSack, div, byPos.get(17).points);
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
      return out.sort((a, b) => parseInt(a.division, 10) - parseInt(b.division, 10));
    };

    return {
      win: summarize(acc.win),
      autoPromo: summarize(acc.autoPromo),
      playoffs: summarize(acc.playoffs),
      avoidReleg: summarize(acc.avoidReleg),
      avoidSack: summarize(acc.avoidSack),
    };
  }, [allPositionData]);

  const thresholdHistory = useMemo(() => {
    const bySeasonDiv = new Map();
    for (const r of allPositionData) {
      const season = (r.season || '').trim();
      const division = (r.division || '').trim();
      if (!season || !division) continue;
      const key = `${season}|${division}`;
      if (!bySeasonDiv.has(key)) bySeasonDiv.set(key, []);
      bySeasonDiv.get(key).push(r);
    }
    const out = { win: [], autoPromo: [], playoffs: [], avoidReleg: [], avoidSack: [] };
    const push = (arr, season, division, posRow) => {
      if (!posRow) return;
      arr.push({ season, division, points: numeric(posRow.points) });
    };
    for (const [key, rows] of bySeasonDiv.entries()) {
      const [season, division] = key.split('|');
      const d = parseInt(division, 10);
      const byPos = new Map();
      rows.forEach((r) => byPos.set(parseInt(r.position || 0, 10), r));
      push(out.win, season, division, byPos.get(1));
      if (d >= 2 && d <= 5) push(out.autoPromo, season, division, byPos.get(3));
      if (d >= 2 && d <= 5) push(out.playoffs, season, division, byPos.get(7));
      if (d >= 1 && d <= 4) push(out.avoidReleg, season, division, byPos.get(16));
      push(out.avoidSack, season, division, byPos.get(17));
    }
    return out;
  }, [allPositionData]);

  /* =========================
     UI: Search Results
     ========================= */
  const SearchResults = () => {
    const filtered = allPositionData
      .filter(
        (team) =>
          team.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (team.manager && team.manager.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => {
        const seasonCompare = parseInt(b.season || 0, 10) - parseInt(a.season || 0, 10);
        if (seasonCompare !== 0) return seasonCompare;
        const divCompare = parseInt(a.division || 0, 10) - parseInt(b.division || 0, 10);
        if (divCompare !== 0) return divCompare;
        return parseInt(a.position || 0, 10) - parseInt(b.position || 0, 10);
      });

    return (
      <div className="space-y-4">
        <div className="grid gap-4">
          {filtered.map((team, index) => {
              const tags = getTeamTags(team.position, selectedDivision, team.team, team.season, playoffWinnersBySeasonDiv);
  const badge = getPositionBadge(team.position, selectedDivision, team.team, team.season, playoffWinnersBySeasonDiv);

            const rowClass = getRowStyling(team.position, team.division, isWinner);

            return (
              <div
                key={index}
                className={`${rowClass} rounded-xl p-6 shadow-lg transition-all hover:shadow-xl`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h4 className="text-xl font-bold text-gray-900">{team.team}</h4>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${badge.bg} ${badge.text}`}
                        title={tags.map((t) => t.label).join(' • ')}
                      >
                        {badge.icon ? `${badge.icon} ` : ''}
                        #{team.position}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Manager</p>
                        <p className="font-semibold">{team.manager || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Season & Division</p>
                        <p className="font-semibold">
                          S{team.season} D{team.division}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Record</p>
                        <p className="font-semibold">
                          {team.won}W {team.drawn}D {team.lost}L
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Goal Difference</p>
                        <p className={`font-semibold ${numeric(team.goal_difference) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {numeric(team.goal_difference) > 0 ? '+' : ''}
                          {team.goal_difference}
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

  /* =========================
     UI: League Table
     ========================= */
  const LeagueTable = () => {
    const tableData = getFilteredData(selectedSeason, selectedDivision, sortBy);

    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header with controls */}
        <div className="p-6 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-2xl font-bold">
                Season {selectedSeason} - Division {selectedDivision}
              </h3>
              <p className="text-blue-200">Complete League Table ({tableData.length} teams)</p>
              <p className="text-xs text-blue-300 mt-1">Soccer Manager Worlds Top 100 Elite Community</p>
            </div>

            {/* Sort Controls */}
            <div className="flex gap-2 flex-wrap">
              {[
                { id: 'position', label: 'Position', icon: Trophy },
                { id: 'points', label: 'Points', icon: Target },
                { id: 'team', label: 'Team A-Z', icon: SortAsc },
                { id: 'manager', label: 'Manager A-Z', icon: Users },
              ].map((sort) => (
                <button
                  key={sort.id}
                  onClick={() => setSortBy(sort.id)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    sortBy === sort.id ? 'bg-white text-blue-600 shadow-lg' : 'bg-blue-500 hover:bg-blue-400 text-white'
                  }`}
                >
                  <sort.icon className="w-4 h-4" />
                  {sort.label}
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
                <th className="text-left py-4 px-4 font-bold text-gray-700">Pos</th>
                <th className="text-left py-4 px-4 font-bold text-gray-700">Team & Manager</th>
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
 {tableData.map((team, index) => {
  const rowTags = getTeamTags(
    team.position,
    selectedDivision,
    team.team,
    team.season,
    playoffWinnersBySeasonDiv
  );
  const badge = getPositionBadge(
    team.position,
    selectedDivision,
    team.team,
    team.season,
    playoffWinnersBySeasonDiv
  );

  return (
    <tr key={index} className={`${getRowStyling(team.position, selectedDivision)} border-b border-gray-100 transition-all hover:shadow-md`}>
      <td className="py-4 px-4">
        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold ${badge.bg} ${badge.text}`}>
          {badge.icon ? `${badge.icon} ` : ''}{team.position}
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
            {rowTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {rowTags.map((t, i) => (
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
                      {numeric(team.goal_difference) > 0 ? '+' : ''}
                      {team.goal_difference}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-12 h-8 bg-blue-100 text-blue-800 rounded-lg font-bold">
                        {team.points}
                      </span>
                    </td>
                  </tr>
                );
              })}
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
                <LegendSwatch color="bg-green-300 border-green-600" label="Promoted (Auto or Playoff Winner)" />
                <LegendSwatch color="bg-blue-300 border-blue-600" label="Playoff Places (4th–7th in D2–D5)" />
                <LegendSwatch color="bg-red-300 border-red-700" label="Relegated (17th–20th in D1–D4)" />
                <LegendSwatch color="bg-rose-400 border-rose-700" label="Automatic Sacking (18th–20th all divisions)" />
                <LegendSwatch color="bg-purple-300 border-purple-500" label="D1: SMFA Champions Cup (2nd–4th)" />
                <LegendSwatch color="bg-indigo-300 border-indigo-500" label="D1: SMFA Shield (5th–10th)" />
              </div>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p className="font-semibold">Current View:</p>
              <p>Sorted by: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}</p>
              <p>
                Season {selectedSeason} Division {selectedDivision}
              </p>
              <p>{tableData.length} teams displayed</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* =========================
     UI: Insights
     ========================= */
  const [leadersView, setLeadersView] = useState('team');
  const [recordsMetric, setRecordsMetric] = useState('points');
  const [recordsGroup, setRecordsGroup] = useState('team');
  const [recordsOrder, setRecordsOrder] = useState('desc');
  const [recordsSeason, setRecordsSeason] = useState('');
  const [recordsDivision, setRecordsDivision] = useState('');

  const recordRows = useMemo(
    () =>
      buildRecords(
        recordsMetric,
        recordsGroup,
        recordsOrder,
        recordsSeason || null,
        recordsDivision || null
      ),
    [recordsMetric, recordsGroup, recordsOrder, recordsSeason, recordsDivision] // eslint-disable-line
  );

  const Insights = () => {
    const src = leadersView === 'team' ? leaders.byTeam : leaders.byManager;

    const LeaderTable = ({ title, rows }) => (
      <div className="bg-white rounded-xl shadow p-4">
        <h4 className="font-semibold mb-3">{title}</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="py-2">{leadersView === 'team' ? 'Team' : 'Manager'}</th>
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
            <LeaderTable title="Most Titles" rows={src.titles} />
            <LeaderTable title="Most Promotions" rows={src.promotions} />
            <LeaderTable title="Most Relegations" rows={src.relegations} />
            <LeaderTable title="Most Sackings" rows={src.sackings} />
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
                  <option key={s} value={s}>
                    Season {s}
                  </option>
                ))}
              </select>
              <select className="border rounded px-2 py-1" value={recordsDivision} onChange={(e) => setRecordsDivision(e.target.value)}>
                <option value="">All Divisions</option>
                {[1, 2, 3, 4, 5].map((d) => (
                  <option key={d} value={String(d)}>
                    Division {d}
                  </option>
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
            <ThresholdCard title="Win Division (Pos 1)" rows={computeThresholds.win} />
            <ThresholdCard title="Auto-Promotion (Pos 3 in D2–D5)" rows={computeThresholds.autoPromo} />
            <ThresholdCard title="Make Playoffs (Pos 7 in D2–D5)" rows={computeThresholds.playoffs} />
            <ThresholdCard title="Avoid Relegation (Pos 16 in D1–D4)" rows={computeThresholds.avoidReleg} />
            <ThresholdCard title="Avoid Sacking (Pos 17 in all Divs)" rows={computeThresholds.avoidSack} />
          </div>
        </div>
      </div>
    );
  };

  /* =========================
     Layout (Hero + Tabs)
     ========================= */
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
              { id: 'tables',   label: 'League Tables',     icon: BarChart3, color: 'purple' },
              { id: 'insights', label: 'Insights',          icon: BarChart3, color: 'green' },
              { id: 'charts',   label: 'Charts',            icon: BarChart3, color: 'indigo' },
              { id: 'managers', label: 'Manager Profiles',  icon: Users,     color: 'teal' },
													{ id: 'honours', label: 'Honours',  icon: Users,     color: 'amber' },
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
                    <option key={season} value={season}>
                      Season {season}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white"
                >
                  {availableDivisions.map((div) => (
                    <option key={div} value={div}>
                      Division {div}
                    </option>
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
