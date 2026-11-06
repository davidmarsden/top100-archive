import React, { useEffect, useState } from "react";
import { worldQuery } from "../config/world";
import {
  AWARDS,
  RANKINGS,
  formatAward,
  formatMoney,
  formatNumber,
  formatSigned,
  formatUpdated,
  rankClubs,
} from "../data/divisionStats";

// This season's division stats, live from Soccer Manager Sync. Squad strength
// uses Mister TRX's ETOT formula; predicted position is each club's ETOT rank
// in its division at the start of the season.
export default function LiveDivisionStats() {
  const [state, setState] = useState({ status: "loading", stats: null });
  const [division, setDivision] = useState(1);
  const [ranking, setRanking] = useState(null); // default: the stats table once the opening is recorded

  useEffect(() => {
    let cancelled = false;
    fetch(`/.netlify/functions/division-stats?${worldQuery()}`)
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled) setState({ status: body?.stats?.divisions?.length ? "loaded" : "empty", stats: body?.stats || null });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "empty", stats: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return <div className="bg-white rounded-xl shadow-lg p-6 text-gray-600 font-semibold">Loading this season&apos;s division stats…</div>;
  }
  if (state.status === "empty") return null;

  const { stats } = state;
  const divisions = stats.divisions || [];
  const current = divisions.find((item) => item.division === division) || divisions[0];
  const opening = stats.openingRecorded;
  const available = RANKINGS.filter((item) => opening || !item.needsOpening);
  const chosen = ranking || (opening ? "pva" : "table");
  const activeRanking = available.some((item) => item.id === chosen) ? chosen : "table";
  const clubs = rankClubs(current?.clubs || [], activeRanking);
  const updated = formatUpdated(stats.observedAt);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-100 space-y-5">
      <div>
        <h2 className="text-3xl font-black text-gray-900">S{stats.season} Division Stats</h2>
        <p className="text-gray-600 mt-1">
          Live from Soccer Manager Sync{updated ? `, updated ${updated}` : ""}. Squad strength (ETOT) uses Mister TRX&apos;s formula
          {opening
            ? "; predicted position is each club's ETOT rank in its division at the start of the season, value added (VA) is predicted minus current position, and PVA is (VA + 1) ÷ position, which orders the stats table."
            : ". Predicted positions and value added appear once the season's opening squads are recorded."}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1">
          {divisions.map((item) => (
            <button
              key={item.division}
              type="button"
              onClick={() => setDivision(item.division)}
              className={`px-3 py-2 rounded-lg font-bold ${item.division === current?.division ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"}`}
            >
              D{item.division}
            </button>
          ))}
        </div>
        <label className="text-sm text-gray-700 font-semibold">
          Rank by{" "}
          <select value={activeRanking} onChange={(event) => setRanking(event.target.value)} className="ml-1 border rounded-lg px-2 py-2">
            {available.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-right py-2 px-2">#</th>
              <th className="text-left py-2 px-2">Club</th>
              <th className="text-left py-2 px-2">Manager</th>
              <th className="text-right py-2 px-2">P</th>
              <th className="text-right py-2 px-2">Pts</th>
              <th className="text-right py-2 px-2">ETOT</th>
              {opening && <th className="text-right py-2 px-2" title="Predicted position at the start of the season">Pre</th>}
              {opening && <th className="text-right py-2 px-2" title="Value added: predicted minus current position">VA</th>}
              {opening && <th className="text-right py-2 px-2" title="Positional value added: (VA + 1) ÷ position">PVA</th>}
              {opening && <th className="text-right py-2 px-2" title="Change in ETOT since the start of the season">ETOT ±</th>}
              <th className="text-right py-2 px-2" title="Squad value">Value</th>
              <th className="text-right py-2 px-2" title="Points per £10m of squad value">Pts/£10m</th>
              <th className="text-right py-2 px-2" title="Average age of the whole squad">Age</th>
              <th className="text-right py-2 px-2" title="Average age weighted by appearances">Used age</th>
            </tr>
          </thead>
          <tbody>
            {clubs.map((club) => (
              <tr key={club.club} className="border-t">
                <td className="py-2 px-2 text-right font-bold">{club.position}</td>
                <td className="py-2 px-2 font-semibold">{club.club}</td>
                <td className="py-2 px-2 text-gray-600">{club.manager || "—"}</td>
                <td className="py-2 px-2 text-right">{club.played}</td>
                <td className="py-2 px-2 text-right font-bold">{club.points}</td>
                <td className="py-2 px-2 text-right">{formatNumber(club.etot, 2)}</td>
                {opening && <td className="py-2 px-2 text-right">{formatNumber(club.predicted_position)}</td>}
                {opening && <td className="py-2 px-2 text-right font-bold">{formatSigned(club.value_added)}</td>}
                {opening && <td className="py-2 px-2 text-right">{formatNumber(club.pva, 2)}</td>}
                {opening && <td className="py-2 px-2 text-right">{formatSigned(club.etot_change, 2)}</td>}
                <td className="py-2 px-2 text-right">{formatMoney(club.squad_value)}</td>
                <td className="py-2 px-2 text-right">{formatNumber(club.points_per_10m, 2)}</td>
                <td className="py-2 px-2 text-right">{formatNumber(club.average_age, 1)}</td>
                <td className="py-2 px-2 text-right">{formatNumber(club.used_age, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {current?.awards && (
        <div>
          <h3 className="font-black text-gray-900 mb-2">D{current.division} awards so far</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {AWARDS.map((award) => (
              <div key={award.id} className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs uppercase tracking-wide text-gray-500 font-bold">{award.label}</div>
                <div className="text-sm font-semibold text-gray-900 mt-1">{formatAward(current.awards[award.id], award.unit)}</div>
                {award.note && <div className="text-xs text-gray-500 mt-1">{award.note}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
