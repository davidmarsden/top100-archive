// src/ManagerProfiles.js
import React, { useMemo, useState } from "react";
import {
  Users, Trophy, ArrowUpCircle, Play, ArrowDownCircle,
  AlertTriangle, Search
} from "lucide-react";

/* ---------- small helpers ---------- */
const numeric = (v) => {
  const n = parseInt(String(v ?? "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};
const isChampion = (pos) => parseInt(pos || 0, 10) === 1;
const isAutoPromo = (div, pos) => {
  const d = parseInt(div || 0, 10), p = parseInt(pos || 0, 10);
  return d >= 2 && d <= 5 && (p === 2 || p === 3);
};
const isRelegated = (div, pos) => {
  const d = parseInt(div || 0, 10), p = parseInt(pos || 0, 10);
  return d >= 1 && d <= 4 && p >= 17 && p <= 20;
};
const isAutoSacked = (pos) => {
  const p = parseInt(pos || 0, 10);
  return p >= 18 && p <= 20;
};

const seasonNorm = (s) => {
  const m = String(s || "").match(/\d+/);
  return m ? m[0] : String(s || "").trim();
};
const normDiv = (d) => {
  const m = String(d || "").match(/\d+/);
  return m ? m[0] : String(d || "").trim();
};

// base normalization
const normalizeName = (s) =>
  String(s || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(fc|cf|cp|fk|cr|afc|sc|club)\b/gi, " ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// tolerant normalization: also strips common prefixes
const stripPrefixes = (name) => {
  const tokens = name.split(" ").filter(Boolean);
  const drop = new Set([
    "rcd","real","rb","ac","as","ss","ud","sd","cd","cf","fc","sc","afc","ssc",
    "psv","deportivo","club","club de"
  ]);
  // remove up to first two tokens if they’re in the drop list or <= 3 chars
  let i = 0;
  while (i < tokens.length && i < 2 && (drop.has(tokens[i]) || tokens[i].length <= 3)) i++;
  return tokens.slice(i).join(" ").trim() || name;
};

const keyExact = (season, division, team) =>
  `${seasonNorm(season)}|${normDiv(division)}|${normalizeName(team)}`;

const keyLoose = (season, division, team) =>
  `${seasonNorm(season)}|${normDiv(division)}|${normalizeName(stripPrefixes(team))}`;

// tolerant membership test against the winners Set
const isPlayoffWinner = (season, division, team, winnersSet) => {
  if (!winnersSet) return false;
  if (winnersSet.has(keyExact(season, division, team))) return true;
  if (winnersSet.has(keyLoose(season, division, team))) return true;
  return false;
};

/* ----------------------------------- */

export default function ManagerProfiles({ allPositionData = [], playoffWinnersSet }) {
  // Manager list (unique + sorted)
  const managers = useMemo(() => {
    const set = new Set(
      allPositionData.map((r) => (r.manager || "").trim()).filter(Boolean)
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allPositionData]);

  const [query, setQuery] = useState("");
  const filteredManagers = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return managers;
    return managers.filter((m) => m.toLowerCase().includes(q));
  }, [managers, query]);

  // Aggregate per manager
  const perManager = useMemo(() => {
    const map = new Map();
    for (const r of allPositionData) {
      const m = (r.manager || "").trim();
      if (!m) continue;
      if (!map.has(m)) {
        map.set(m, {
          manager: m,
          appearances: 0,
          titles: 0,
          autoPromotions: 0,
          playoffWins: 0,
          relegations: 0,
          sackings: 0,
          teams: new Set(),
          seasons: new Set(),
          rows: [],
        });
      }
      const item = map.get(m);
      item.appearances += 1;
      item.teams.add(r.team);
      item.seasons.add(seasonNorm(r.season));
      item.rows.push(r);

      if (isChampion(r.position)) item.titles += 1;
      if (isAutoPromo(r.division, r.position)) item.autoPromotions += 1;
      if (isRelegated(r.division, r.position)) item.relegations += 1;
      if (isAutoSacked(r.position)) item.sackings += 1;

      if (isPlayoffWinner(r.season, r.division, r.team, playoffWinnersSet)) {
        item.playoffWins += 1;
      }
    }
    for (const v of map.values()) {
      v.teamCount = v.teams.size;
      v.seasonCount = v.seasons.size;
      v.teams = Array.from(v.teams).sort((a, b) => a.localeCompare(b));
      v.seasons = Array.from(v.seasons).sort((a, b) => Number(a) - Number(b));
    }
    return map;
  }, [allPositionData, playoffWinnersSet]);

  const [selected, setSelected] = useState("");
  const currentManager = useMemo(() => {
    const pick = selected || filteredManagers[0] || "";
    return perManager.get(pick);
  }, [selected, filteredManagers, perManager]);

  return (
    <div className="space-y-6">
      {/* Search + dropdown */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-col md:flex-row gap-3">
        <div className="relative md:w-1/2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border rounded-lg"
            placeholder="Search managers…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="md:w-1/2 px-3 py-2 border rounded-lg"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {filteredManagers.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Summary + history */}
      {currentManager ? (
        <>
          <Summary manager={currentManager} />
          <CareerTable rows={currentManager.rows} winnersSet={playoffWinnersSet} />
        </>
      ) : (
        <div className="bg-white rounded-xl shadow p-6 text-gray-600">No manager selected.</div>
      )}
    </div>
  );
}

function Summary({ manager }) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center gap-3 mb-4">
        <Users className="w-6 h-6 text-teal-700" />
        <h2 className="text-xl font-bold">{manager.manager}</h2>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatBox icon={<Trophy className="w-4 h-4" />} label="Titles" value={manager.titles} tone="yellow" />
        <StatBox icon={<ArrowUpCircle className="w-4 h-4" />} label="Auto Promotions" value={manager.autoPromotions} tone="green" />
        <StatBox icon={<Play className="w-4 h-4" />} label="Playoff Wins" value={manager.playoffWins} tone="emerald" />
        <StatBox icon={<ArrowDownCircle className="w-4 h-4" />} label="Relegations" value={manager.relegations} tone="red" />
        <StatBox icon={<AlertTriangle className="w-4 h-4" />} label="Sackings" value={manager.sackings} tone="rose" />
        <StatBox icon={<Users className="w-4 h-4" />} label="Seasons Managed" value={manager.seasonCount} tone="indigo" />
      </div>

      <div className="mt-6 text-sm text-gray-600">
        <p><span className="font-semibold">Teams:</span> {manager.teams.join(" • ") || "—"}</p>
        <p className="mt-1"><span className="font-semibold">Seasons:</span> {manager.seasons.join(", ") || "—"}</p>
      </div>
    </div>
  );
}

function CareerTable({ rows, winnersSet }) {
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h3 className="font-semibold">Career History</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-600">
              <th className="py-2 px-3">Season</th>
              <th className="py-2 px-3">Division</th>
              <th className="py-2 px-3">Pos</th>
              <th className="py-2 px-3">Team</th>
              <th className="py-2 px-3 text-right">Pts</th>
              <th className="py-2 px-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .slice()
              .sort((a, b) => {
                const s = numeric(a.season) - numeric(b.season);
                if (s !== 0) return s;
                const d = numeric(a.division) - numeric(b.division);
                if (d !== 0) return d;
                return numeric(a.position) - numeric(b.position);
              })
              .map((r, i) => {
                const playoffWin = isPlayoffWinner(r.season, r.division, r.team, winnersSet);
                const notes = [
                  isChampion(r.position) && "Champions",
                  isAutoPromo(r.division, r.position) && "Auto-Promoted",
                  playoffWin && "Playoff Winner 🏆",
                  isRelegated(r.division, r.position) && "Relegated",
                  isAutoSacked(r.position) && "Auto-Sacked",
                ].filter(Boolean).join(" • ");

                return (
                  <tr key={i} className="border-t">
                    <td className="py-2 px-3">S{r.season}</td>
                    <td className="py-2 px-3">D{r.division}</td>
                    <td className="py-2 px-3">#{r.position}</td>
                    <td className="py-2 px-3">{r.team}</td>
                    <td className="py-2 px-3 text-right font-semibold">{r.points}</td>
                    <td className="py-2 px-3">{notes || "—"}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatBox({ icon, label, value, tone = "slate" }) {
  const tones = {
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
    green: "bg-green-100 text-green-800 border-green-300",
    emerald: "bg-emerald-100 text-emerald-800 border-emerald-300",
    red: "bg-red-100 text-red-800 border-red-300",
    rose: "bg-rose-100 text-rose-800 border-rose-300",
    indigo: "bg-indigo-100 text-indigo-800 border-indigo-300",
    slate: "bg-slate-100 text-slate-800 border-slate-300",
  }[tone];

  return (
    <div className={`rounded-lg border p-3 flex items-center gap-3 ${tones}`}>
      <span className="shrink-0 p-2 rounded-lg bg-white/60">{icon}</span>
      <div>
        <div className="text-xs uppercase tracking-wide">{label}</div>
        <div className="text-lg font-bold">{value}</div>
      </div>
    </div>
  );
}