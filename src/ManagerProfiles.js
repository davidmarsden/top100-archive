// src/ManagerProfiles.js
import React, { useMemo, useState } from "react";
import { Users, Search as SearchIcon } from "lucide-react";

/* ------------------------------
   Status + helpers (mirror App)
------------------------------ */
const isChampion = (pos) => parseInt(pos || 0, 10) === 1;
const isAutoPromo = (div, pos) => {
  const d = parseInt(div || 0, 10);
  const p = parseInt(pos || 0, 10);
  return d >= 2 && d <= 5 && (p === 2 || p === 3);
};
const isPlayoffBand = (div, pos) => {
  const d = parseInt(div || 0, 10);
  const p = parseInt(pos || 0, 10);
  return d >= 2 && d <= 5 && p >= 4 && p <= 7;
};
const isRelegated = (div, pos) => {
  const d = parseInt(div || 0, 10);
  const p = parseInt(pos || 0, 10);
  return d >= 1 && d <= 4 && p >= 17 && p <= 20;
};
const isAutoSacked = (pos) => {
  const p = parseInt(pos || 0, 10);
  return p >= 18 && p <= 20;
};

// Normalizers (must match App.js)
const normDiv = (d) => {
  const m = String(d || "").match(/\d+/);
  return m ? m[0] : String(d || "").trim();
};
const normalizeName = (s) =>
  String(s || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(fc|cf|afc|sc|club)\b/gi, " ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const playoffWinnerKey = (season, division, team) =>
  `${String(season || "").trim()}|${normDiv(division)}|${normalizeName(team)}`;

/* ------------------------------
   Small UI bits
------------------------------ */
const StatPill = ({ label, value, color }) => (
  <span
    className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold border ${color}`}
  >
    {label} <span className="inline-block px-1.5 py-0.5 bg-white/70 rounded">{value}</span>
  </span>
);

const SectionTitle = ({ children }) => (
  <h3 className="text-lg font-bold flex items-center gap-2 mb-3">
    <Users className="w-4 h-4 text-slate-600" />
    {children}
  </h3>
);

/* ------------------------------
   Main component
------------------------------ */
const ManagerProfiles = ({ allPositionData = [], winnersSet }) => {
  // default to empty Set if not provided
  const winners = useMemo(() => (winnersSet instanceof Set ? winnersSet : new Set()), [winnersSet]);

  // unique manager names (include "Unknown"/"???" if present in data)
  const managerNames = useMemo(() => {
    const names = new Set();
    allPositionData.forEach((r) => {
      const m = (r.manager || "").trim();
      names.add(m || "???");
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [allPositionData]);

  const [search, setSearch] = useState("");
  const [selectedManager, setSelectedManager] = useState("");

  const filteredManagers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return managerNames.filter((n) =>
      needle ? n.toLowerCase().includes(needle) : true
    );
  }, [managerNames, search]);

  // rows grouped by manager
  const rowsByManager = useMemo(() => {
    const map = new Map();
    for (const r of allPositionData) {
      const name = (r.manager || "???").trim() || "???";
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(r);
    }
    // sort each manager's rows by season/division/position
    for (const [k, rows] of map.entries()) {
      rows.sort((a, b) => {
        const s = parseInt(b.season || 0, 10) - parseInt(a.season || 0, 10);
        if (s) return s;
        const d = parseInt(a.division || 0, 10) - parseInt(b.division || 0, 10);
        if (d) return d;
        return parseInt(a.position || 0, 10) - parseInt(b.position || 0, 10);
      });
    }
    return map;
  }, [allPositionData]);

  const visibleManagers = (selectedManager
    ? [selectedManager]
    : filteredManagers
  ).filter((n) => rowsByManager.has(n));

  const ManagerCard = ({ name }) => {
    const rows = rowsByManager.get(name) || [];

    // counts
    const titles = rows.filter((r) => isChampion(r.position)).length;
    const autoPromos = rows.filter((r) => isAutoPromo(r.division, r.position)).length;

    // ✅ PLAYOFF WINS — normalized key on both sides
    const playoffWins = rows.filter(
      (r) =>
        isPlayoffBand(r.division, r.position) &&
        winners.has(playoffWinnerKey(r.season, r.division, r.team))
    ).length;

    const relegations = rows.filter((r) => isRelegated(r.division, r.position)).length;
    const sackings = rows.filter((r) => isAutoSacked(r.position)).length;
    const seasonsManaged = new Set(rows.map((r) => (r.season || "").trim())).size;

    return (
      <div className="bg-white rounded-xl shadow p-4 space-y-4">
        <div className="flex items-center justify-between">
          <SectionTitle>{name || "???"}</SectionTitle>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-2">
          <StatPill label="🏆 Titles" value={titles} color="bg-yellow-50 text-yellow-800 border-yellow-200" />
          <StatPill label="⬆️ Auto Promotions" value={autoPromos} color="bg-green-50 text-green-800 border-green-200" />
          <StatPill label="🎟️ Playoff Wins" value={playoffWins} color="bg-emerald-50 text-emerald-800 border-emerald-200" />
          <StatPill label="⬇️ Relegations" value={relegations} color="bg-red-50 text-red-800 border-red-200" />
          <StatPill label="⛔ Sackings" value={sackings} color="bg-rose-50 text-rose-900 border-rose-200" />
          <StatPill label="📅 Seasons Managed" value={seasonsManaged} color="bg-indigo-50 text-indigo-800 border-indigo-200" />
        </div>

        {/* Career history */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 px-2">Season</th>
                <th className="py-2 px-2">Division</th>
                <th className="py-2 px-2">Pos</th>
                <th className="py-2 px-2">Team</th>
                <th className="py-2 px-2">Pts</th>
                <th className="py-2 px-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="py-2 px-2">S{r.season}</td>
                  <td className="py-2 px-2">D{r.division}</td>
                  <td className="py-2 px-2">{r.position}</td>
                  <td className="py-2 px-2">{r.team}</td>
                  <td className="py-2 px-2">{r.points}</td>
                  <td className="py-2 px-2">{r.notes || "—"}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td className="py-4 px-2 text-gray-500" colSpan={6}>
                    No rows for this manager.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search / filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            className="w-full pl-9 pr-3 py-2 border rounded-lg"
            placeholder="Search teams or managers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="px-3 py-2 border rounded-lg"
          value={selectedManager}
          onChange={(e) => setSelectedManager(e.target.value)}
        >
          <option value="">All managers</option>
          {managerNames.map((n) => (
            <option key={n} value={n}>
              {n || "???"}
            </option>
          ))}
        </select>
      </div>

      {/* Cards */}
      <div className="grid gap-6">
        {visibleManagers.map((name) => (
          <ManagerCard key={name || "unknown"} name={name} />
        ))}
        {!visibleManagers.length && (
          <div className="text-center text-gray-500 py-12">No managers match your search.</div>
        )}
      </div>
    </div>
  );
};

export default ManagerProfiles;