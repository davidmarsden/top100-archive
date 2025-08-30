// src/ManagerProfiles.js
import React, { useMemo, useState } from "react";
import { Users, Search as SearchIcon } from "lucide-react";

/* ------------------------------
   Status helpers (mirror App.js)
------------------------------ */
const isChampion = (pos) => parseInt(pos || 0, 10) === 1;
const isAutoPromoPos = (div, pos) => {
  const d = parseInt(div || 0, 10);
  const p = parseInt(pos || 0, 10);
  // positions 2–3 in D2–D5
  return d >= 2 && d <= 5 && (p === 2 || p === 3);
};
const isTitlePromo = (div, pos) => {
  // champions in D2–D5 are promoted as champions
  const d = parseInt(div || 0, 10);
  return d >= 2 && d <= 5 && isChampion(pos);
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
  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold border ${color}`}>
    {label} <span className="inline-block px-1.5 py-0.5 bg-white/70 rounded">{value}</span>
  </span>
);

const SectionTitle = ({ children }) => (
  <h3 className="text-lg font-bold flex items-center gap-2 mb-3">
    <Users className="w-4 h-4 text-slate-600" />
    {children}
  </h3>
);

/* Badge next to position */
const posBadge = ({ division, position, isPlayoffWinner }) => {
  if (isAutoSacked(position)) return { bg: "bg-rose-600", text: "text-white", content: "⛔" };
  if (isRelegated(division, position)) return { bg: "bg-red-600", text: "text-white", content: "⬇️" };
  if (isChampion(position)) return { bg: "bg-yellow-500", text: "text-white", content: "👑" };
  if (isAutoPromoPos(division, position) || isPlayoffWinner) return { bg: "bg-green-600", text: "text-white", content: "⬆️" };
  return { bg: "bg-gray-200", text: "text-gray-800", content: "" };
};

/* Utility: split multi-manager names like "Kennedy / Marsden" */
const splitManagers = (raw) => {
  const s = String(raw || "").trim();
  if (!s) return ["???"];
  const parts = s
    .split("/")
    .map((x) => x.trim())
    .filter(Boolean);
  // If it was a multi-name, return individuals + the combined label.
  return parts.length > 1 ? [...parts, s] : parts;
};

/* ------------------------------
   Main component
------------------------------ */
const ManagerProfiles = ({ allPositionData = [], winnersSet }) => {
  // winnersSet -> safe Set
  const winners = useMemo(
    () => (winnersSet instanceof Set ? winnersSet : new Set()),
    [winnersSet]
  );

  // unique manager names: include each individual from "A / B" plus the combined label
  const managerNames = useMemo(() => {
    const names = new Set();
    for (const r of allPositionData) {
      for (const n of splitManagers(r.manager)) {
        names.add(n || "???");
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [allPositionData]);

  const [search, setSearch] = useState("");
  const [selectedManager, setSelectedManager] = useState("");

  const filteredManagers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return managerNames.filter((n) => (needle ? n.toLowerCase().includes(needle) : true));
  }, [managerNames, search]);

  // group rows by EACH manager token (so “A / B” contributes to A and to B, and to “A / B”)
  const rowsByManager = useMemo(() => {
    const map = new Map();
    for (const r of allPositionData) {
      const tokens = splitManagers(r.manager);
      for (const t of tokens) {
        const key = t || "???";
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(r);
      }
    }
    // sort each group
    for (const [, rows] of map.entries()) {
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

  const visibleManagers = (selectedManager ? [selectedManager] : filteredManagers).filter((n) =>
    rowsByManager.has(n)
  );

  const ManagerCard = ({ name }) => {
    const rows = rowsByManager.get(name) || [];

    // counts
    const titles = rows.filter((r) => isChampion(r.position)).length;
    const autoPromosBase = rows.filter((r) => isAutoPromoPos(r.division, r.position)).length;
    const titlePromos = rows.filter((r) => isTitlePromo(r.division, r.position)).length;
    const playoffWins = rows.filter(
      (r) => isPlayoffBand(r.division, r.position) && winners.has(playoffWinnerKey(r.season, r.division, r.team))
    ).length;

    const totalPromos = titlePromos + autoPromosBase + playoffWins;
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
          <StatPill label="⬆️ Total Promotions" value={totalPromos} color="bg-emerald-50 text-emerald-800 border-emerald-200" />
          <StatPill label="🏆 Titles" value={titles} color="bg-yellow-50 text-yellow-800 border-yellow-200" />
          {/* Keep “Auto Promotions” as “non-playoff promotions” (2–3 + champions). 
              If you want strictly positions 2–3, change to value={autoPromosBase}. */}
          <StatPill label="⬆️ Auto Promotions" value={autoPromosBase + titlePromos} color="bg-green-50 text-green-800 border-green-200" />
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
              {rows.map((r, i) => {
                const winner = winners.has(playoffWinnerKey(r.season, r.division, r.team));

                const notes = [];
                if (isChampion(r.position)) {
                  if (isTitlePromo(r.division, r.position)) notes.push("Promoted as Champions");
                  else notes.push("Champions");
                }
                if (isAutoPromoPos(r.division, r.position)) notes.push("Auto-Promoted");
                if (isPlayoffBand(r.division, r.position) && winner) notes.push("Playoff Winner (Promoted)");
                if (isRelegated(r.division, r.position)) notes.push("Relegated");
                if (isAutoSacked(r.position)) notes.push("Auto-Sacked");

                const badge = posBadge({
                  division: r.division,
                  position: r.position,
                  isPlayoffWinner: isPlayoffBand(r.division, r.position) && winner,
                });

                return (
                  <tr key={i} className="border-t">
                    <td className="py-2 px-2">S{r.season}</td>
                    <td className="py-2 px-2">D{r.division}</td>
                    <td className="py-2 px-2">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${badge.bg} ${badge.text} mr-2`}
                        title={notes.join(" • ")}
                      >
                        {badge.content}
                      </span>
                      {r.position}
                    </td>
                    <td className="py-2 px-2">{r.team}</td>
                    <td className="py-2 px-2">{r.points}</td>
                    <td className="py-2 px-2">{notes.join(" • ") || "—"}</td>
                  </tr>
                );
              })}
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
            placeholder="Search managers… (e.g., Kennedy or Marsden)"
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
        {visibleManagers.map((n) => (
          <ManagerCard key={n || "unknown"} name={n} />
        ))}
        {!visibleManagers.length && (
          <div className="text-center text-gray-500 py-12">No managers match your search.</div>
        )}
      </div>
    </div>
  );
};

export default ManagerProfiles;