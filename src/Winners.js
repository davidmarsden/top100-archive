// src/Winners.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Trophy, Users, Loader, AlertCircle, Filter } from 'lucide-react';

// ENV
const SHEET_ID = process.env.REACT_APP_WINNERS_SHEET_ID;
const CLUBS_RANGE = process.env.REACT_APP_WINNERS_CLUBS_RANGE || 'Clubs!A:Z';
const MANAGERS_RANGE = process.env.REACT_APP_WINNERS_MANAGERS_RANGE || 'Managers!A:Z';
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;

// Normalize a header to a key
const norm = (s) => String(s || '').trim().toLowerCase();

// Convert a Google Sheets table (values array) into objects using header row
const sheetToObjects = (values) => {
  if (!values || values.length === 0) return [];
  const [headers, ...rows] = values;
  const keys = headers.map((h) => norm(h));
  return rows
    .filter((r) => r && r.length > 0)
    .map((r) => {
      const o = {};
      keys.forEach((k, i) => (o[k] = (r[i] ?? '').toString().trim()));
      return o;
    });
};

const Winners = ({ sharedSearch, onSharedSearchChange }) => {
  // Use shared search from App if passed; otherwise keep a local one
  const [localSearch, setLocalSearch] = useState('');
  const search = typeof sharedSearch === 'string' ? sharedSearch : localSearch;
  const setSearch =
    typeof onSharedSearchChange === 'function' ? onSharedSearchChange : setLocalSearch;

  // Local UI state
  const [kind, setKind] = useState('club'); // 'club' | 'manager'
  const [season, setSeason] = useState(''); // '' = all
  const [comp, setComp] = useState(''); // '' = all

  // Data state
  const [clubs, setClubs] = useState([]); // [{ season, competition, winner }]
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

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
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!SHEET_ID || !API_KEY) {
        setErr('Missing REACT_APP_WINNERS_SHEET_ID or REACT_APP_GOOGLE_API_KEY');
        return;
      }
      setLoading(true);
      setErr('');
      try {
        // Fetch both tabs in parallel
        const [clubsJson, managersJson] = await Promise.all([
          fetchRange(CLUBS_RANGE),
          fetchRange(MANAGERS_RANGE),
        ]);

        // Convert to objects
        const clubRows = sheetToObjects(clubsJson.values);
        const mgrRows = sheetToObjects(managersJson.values);

        // clubRows/managersRows headers: "season", then a set of competition columns
        // Convert wide -> long: each competition column becomes a row
        const wideToLong = (arr, winnerKeyName = 'winner') => {
          const out = [];
          for (const row of arr) {
            const season = row['season'] || row['seas'] || row['s'] || '';
            Object.entries(row).forEach(([k, v]) => {
              if (!season) return;
              if (k === 'season' || k === 'seas' || k === 's') return;
              if (!v) return;
              out.push({
                season,
                competition: k, // keep normalized label; we can title-case for UI later
                [winnerKeyName]: v,
              });
            });
          }
          return out;
        };

        const clubsLong = wideToLong(clubRows, 'club');
        const managersLong = wideToLong(mgrRows, 'manager');

        setClubs(clubsLong);
        setManagers(managersLong);
      } catch (e) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fetchRange]);

  const allSeasons = useMemo(() => {
    const src = kind === 'club' ? clubs : managers;
    return [...new Set(src.map((r) => r.season))].sort((a, b) => Number(b) - Number(a));
  }, [kind, clubs, managers]);

  const allComps = useMemo(() => {
    const src = kind === 'club' ? clubs : managers;
    const set = new Set(src.map((r) => r.competition));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [kind, clubs, managers]);

  const rows = useMemo(() => {
    const src = kind === 'club' ? clubs : managers;
    let filtered = src.slice();

    if (season) filtered = filtered.filter((r) => r.season === season);
    if (comp) filtered = filtered.filter((r) => r.competition === comp);

    const q = search.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((r) => {
        const winner = (kind === 'club' ? r.club : r.manager) || '';
        return (
          winner.toLowerCase().includes(q) ||
          (r.competition || '').toLowerCase().includes(q) ||
          (r.season || '').toLowerCase().includes(q)
        );
      });
    }

    // Sort: newest season first, then competition
    filtered.sort((a, b) => {
      const s = Number(b.season) - Number(a.season);
      if (s !== 0) return s;
      return (a.competition || '').localeCompare(b.competition || '');
    });

    return filtered;
  }, [kind, clubs, managers, season, comp, search]);

  const titleCase = (s) =>
    (s || '')
      .split(' ')
      .map((x) => (x ? x[0].toUpperCase() + x.slice(1) : ''))
      .join(' ');

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Kind toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setKind('club')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                kind === 'club' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
              }`}
              title="Club winners"
            >
              <Trophy className="inline w-4 h-4 mr-1" />
              Clubs
            </button>
            <button
              onClick={() => setKind('manager')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                kind === 'manager' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
              }`}
              title="Manager winners"
            >
              <Users className="inline w-4 h-4 mr-1" />
              Managers
            </button>
          </div>

          {/* Season select */}
          <select
            className="px-3 py-2 border rounded-lg"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            title="Filter by season"
          >
            <option value="">All seasons</option>
            {allSeasons.map((s) => (
              <option key={s} value={s}>
                Season {s}
              </option>
            ))}
          </select>

          {/* Competition select */}
          <select
            className="px-3 py-2 border rounded-lg"
            value={comp}
            onChange={(e) => setComp(e.target.value)}
            title="Filter by competition"
          >
            <option value="">All competitions</option>
            {allComps.map((c) => (
              <option key={c} value={c}>
                {titleCase(c)}
              </option>
            ))}
          </select>

          {/* Local search box only renders if no shared search was passed */}
          {typeof sharedSearch !== 'string' && (
            <div className="relative ml-auto w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 border rounded-lg"
                placeholder={`Search ${kind === 'club' ? 'clubs' : 'managers'} or competitions...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Data state */}
      {loading && (
        <div className="bg-white rounded-xl shadow p-6 text-center text-gray-600">
          <Loader className="inline w-5 h-5 animate-spin mr-2" />
          Loading winners…
        </div>
      )}
      {err && (
        <div className="bg-white rounded-xl shadow p-6 text-red-700">
          <AlertCircle className="inline w-5 h-5 mr-2" />
          {err}
        </div>
      )}

      {/* Table */}
      {!loading && !err && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="py-3 px-3">Season</th>
                <th className="py-3 px-3">Competition</th>
                <th className="py-3 px-3">{kind === 'club' ? 'Club' : 'Manager'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="py-2 px-3 font-semibold">S{r.season}</td>
                  <td className="py-2 px-3">{titleCase(r.competition)}</td>
                  <td className="py-2 px-3">{kind === 'club' ? r.club : r.manager}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="py-6 px-3 text-center text-gray-500" colSpan={3}>
                    No winners match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Winners;