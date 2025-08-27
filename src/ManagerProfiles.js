// src/ManagerProfiles.js
import React, { useMemo, useState } from "react";
import { Users, AlertCircle } from "lucide-react";

/* ===== Helpers (must mirror App.js) ===== */
const isChampion = (pos) => parseInt(pos || 0, 10) === 1;
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

/* ===== Component ===== */
export default function ManagerProfiles({
  allPositionData = [],
  playoffWinnersSet,                 // preferred: a Set from App.js
  playoffWinnersBySeasonDiv,         // legacy support: Map-like
}) {
  // Normalize winners into a Set
  const winnersSet = useMemo(() => {
    if (playoffWinnersSet instanceof Set) return playoffWinnersSet;
    if (playoffWinnersBySeasonDiv && typeof playoffWinnersBySeasonDiv.forEach === "function") {
      const s = new Set();
      playoffWinnersBySeasonDiv.forEach((team, key) => {
        const parts = String(key).split("|");
        if (parts.length >= 2) {
          const season = parts[0];
          const division = parts[1];
          s.add(playoffWinnerKey(season, division, team));
        }
      });
      return s;
    }
    return new Set();
  }, [playoffWinnersSet, playoffWinnersBySeasonDiv]);

  // Manager list for dropdown
  const managerNames = useMemo(
    () =>
      [...new Set(allPositionData.map(r => (r.manager || '').trim()))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [allPositionData]
  );

  const [teamQuery, setTeamQuery] = useState("");
  const [managerQuery, setManagerQuery] = useState(managerNames[0] || "");

  // Filter/group rows by manager
  const filteredManagers = useMemo(() => {
    const qTeam = teamQuery.toLowerCase();
    const qMgr  = managerQuery.toLowerCase();

    const grouped = new Map();
    for (const r of allPositionData) {
      const m = (r.manager || "").trim();
      if (!m) continue;
      if (qMgr && !m.toLowerCase().includes(qMgr)) continue;
      if (qTeam && !String(r.team || "").toLowerCase().includes(qTeam)) continue;
      if (!grouped.has(m)) grouped.set(m, []);
      grouped.get(m).push(r);
    }

    // sort each manager’s rows: season desc, division asc, position asc
    for (const [mgrName, rows] of grouped.entries()) {
      rows.sort((a, b) => {
        const s = parseInt(b.season || 0, 10) - parseInt(a.season || 0, 10);
        if (s !== 0) return s;
        const d = parseInt(a.division || 0, 10) - parseInt(b.division || 0, 10);
        if (d !== 0) return d;
        return parseInt(a.position || 0, 10) - parseInt(b.position || 0, 10);
      });
    }

    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [allPositionData, teamQuery, managerQuery]);

  const ManagerCard = ({ mgrName, rows }) => {
    let titles = 0, autoPromos = 0, playoffWins = 0, releg = 0, sack = 0;

    const tableRows = rows.map(r => {
      const { season, division, position: pos, team } = r;

      const wonTitle    = isChampion(pos);
      const auto        = isAutoPromo(division, pos);
      const inPlayoffs  = isPlayoffBand(division, pos);
      const wonPlayoff  = winnersSet.has(playoffWinnerKey(season, division, team));

      if (wonTitle) titles++;
      if (auto) autoPromos++;
      if (wonPlayoff) playoffWins++;
      if (isRelegated(division, pos)) releg++;
      if (isAutoSacked(pos)) sack++;

      const notes = [];
      if (wonPlayoff) notes.push("Playoff Winner 🏆");
      if (wonTitle) notes.push("Champions");
      if (auto) notes.push("Auto Promoted");
      if (inPlayoffs && !wonPlayoff) notes.push("Playoffs");
      if (isRelegated(division, pos)) notes.push("Relegated");
      if (isAutoSacked(pos)) notes.push("Auto-Sacked");

      return {
        season,
        division,
        position: pos,
        team,
        points: r.points,
        notes: notes.join(" • ") || "—",
      };
    });

    return (
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-lg">{mgrName || "Unknown"}</h3>
          </div>
          <div className="flex gap-3 text-sm">
            <Badge label="Titles" value={titles} color="yellow" />
            <Badge label="Auto Promotions" value={autoPromos} color="green" />
            <Badge label="Playoff Wins" value={playoffWins} color="emerald" />
            <Badge label="Relegations" value={releg} color="red" />
            <Badge label="Sackings" value={sack} color="rose" />
            <Badge label="Seasons Managed" value={rows.length} color="indigo" />
          </div>
        </div>

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
              {tableRows.map((tr, i) => (
                <tr key={i} className="border-t">
                  <td className="py-2 px-2">S{tr.season}</td>
                  <td className="py-2 px-2">D{tr.division}</td>
                  <td className="py-2 px-2">{tr.position}</td>
                  <td className="py-2 px-2">{tr.team}</td>
                  <td className="py-2 px-2">{tr.points}</td>
                  <td className="py-2 px-2">{tr.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3 flex-col md:flex-row">
        <div className="relative flex-1">
          <input
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Search teams…"
            value={teamQuery}
            onChange={(e) => setTeamQuery(e.target.value)}
          />
        </div>
        <div>
          <select
            className="px-3 py-2 border rounded-lg"
            value={managerQuery}
            onChange={(e) => setManagerQuery(e.target.value)}
          >
            {managerNames.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredManagers.length === 0 ? (
        <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded">
          <AlertCircle className="w-5 h-5" />
          <span>No managers match your filters.</span>
        </div>
      ) : (
        filteredManagers.map(([mgrName, rows]) => (
          <ManagerCard key={mgrName || "unknown"} mgrName={mgrName} rows={rows} />
        ))
      )}
    </div>
  );
}

/* ===== Small UI badge ===== */
function Badge({ label, value, color }) {
  const colors = {
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    green: 'bg-green-100 text-green-800 border-green-300',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    red: 'bg-red-100 text-red-800 border-red-300',
    rose: 'bg-rose-100 text-rose-800 border-rose-300',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded-md border text-xs font-semibold ${colors[color] || ''}`}>
      {label} <span className="font-bold ml-1">{value}</span>
    </span>
  );
}