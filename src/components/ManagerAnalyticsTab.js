import React, { useMemo, useState } from "react";
import { BarChart3, Search, TrendingDown, TrendingUp, Trophy, Users } from "lucide-react";
import { getManagerCareerSummary, getManagerValueAddedTable } from "../analytics/managerAnalytics";

const fmt = (value, digits = 2, prefix = "") => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  const sign = prefix === "signed" && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}`;
};

const StatCard = ({ label, value, hint }) => (
  <div className="bg-white rounded-xl shadow p-4">
    <div className="text-sm text-gray-500">{label}</div>
    <div className="text-3xl font-black text-gray-900 mt-1">{value}</div>
    {hint && <div className="text-xs text-gray-500 mt-2">{hint}</div>}
  </div>
);

const ManagerAnalyticsTab = ({ archiveRows = [], statsRows = [] }) => {
  const [managerQuery, setManagerQuery] = useState("");

  const valueAddedTable = useMemo(
    () => getManagerValueAddedTable(archiveRows, statsRows, { minMatchedSeasons: 5 }),
    [archiveRows, statsRows]
  );

  const selectedManager = managerQuery.trim();

  const summary = useMemo(
    () => getManagerCareerSummary(selectedManager, archiveRows, statsRows),
    [selectedManager, archiveRows, statsRows]
  );

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-6 h-6 text-purple-600" />
          <div>
            <h2 className="text-2xl font-black text-gray-900">Manager Analytics</h2>
            <p className="text-gray-500">
              Career performance joined to Malcolm&apos;s predicted strength, VA and PVA data.
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={managerQuery}
            onChange={(e) => setManagerQuery(e.target.value)}
            placeholder="Search manager name..."
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all"
          />
        </div>
      </div>

      {!selectedManager ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
          Search for a manager to view their career analytics.
        </div>
      ) : summary.seasons === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
          No manager career rows found for “{selectedManager}”.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Seasons" value={summary.seasons} />
            <StatCard label="Clubs" value={summary.clubsManaged} hint={summary.clubs.join(", ")} />
            <StatCard label="Avg VA" value={fmt(summary.averageVA, 2, "signed")} />
            <StatCard label="Avg PVA" value={fmt(summary.averagePVA, 3, "signed")} />
            <StatCard label="Avg ETOT" value={fmt(summary.averageETOT, 2)} />
            <StatCard label="Avg finish" value={fmt(summary.averageFinish, 2)} />
            <StatCard label="Stats matched" value={`${summary.statsMatched}/${summary.seasons}`} />
            <StatCard
              label="Net strength"
              value={fmt(summary.netStrengthGain, 2, "signed")}
              hint="Sum of each club spell’s ETOT change"
            />
          </div>

          {summary.clubSpells.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="text-lg font-bold">Club spell strength changes</h3>
                <p className="text-sm text-gray-500">
                  Inherited ETOT to left ETOT for each uninterrupted spell at a club.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left py-3 px-3">Club</th>
                      <th className="text-right py-3 px-3">Seasons</th>
                      <th className="text-right py-3 px-3">From</th>
                      <th className="text-right py-3 px-3">To</th>
                      <th className="text-right py-3 px-3">Inherited</th>
                      <th className="text-right py-3 px-3">Left</th>
                      <th className="text-right py-3 px-3">Highest</th>
                      <th className="text-right py-3 px-3">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.clubSpells.map((spell, index) => (
                      <tr key={`${spell.club}-${index}`} className="border-t">
                        <td className="py-3 px-3 font-semibold">{spell.club}</td>
                        <td className="py-3 px-3 text-right">{spell.seasons}</td>
                        <td className="py-3 px-3 text-right">S{spell.firstSeason}</td>
                        <td className="py-3 px-3 text-right">S{spell.lastSeason}</td>
                        <td className="py-3 px-3 text-right">{fmt(spell.inheritedStrength, 2)}</td>
                        <td className="py-3 px-3 text-right">{fmt(spell.leftStrength, 2)}</td>
                        <td className="py-3 px-3 text-right">{fmt(spell.highestStrength, 2)}</td>
                        <td className={`py-3 px-3 text-right font-bold ${Number(spell.netStrengthGain) > 0 ? "text-green-700" : Number(spell.netStrengthGain) < 0 ? "text-red-700" : ""}`}>
                          {fmt(spell.netStrengthGain, 2, "signed")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-yellow-600" /> Career outcomes
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>Titles: <strong>{summary.titles}</strong></div>
                <div>Auto promotions: <strong>{summary.autoPromotions}</strong></div>
                <div>Playoff finishes: <strong>{summary.playoffFinishes}</strong></div>
                <div>Relegations: <strong>{summary.relegations}</strong></div>
                <div>Auto sackings: <strong>{summary.autoSackings}</strong></div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-blue-600" /> VA extremes
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-semibold">Best VA</div>
                    <div className="text-gray-600">
                      {summary.bestVA
                        ? `S${summary.bestVA.season} D${summary.bestVA.division} ${summary.bestVA.team}: ${fmt(summary.bestVA.valueAdded, 0, "signed")}`
                        : "—"}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <TrendingDown className="w-4 h-4 text-red-600 mt-0.5" />
                  <div>
                    <div className="font-semibold">Worst VA</div>
                    <div className="text-gray-600">
                      {summary.worstVA
                        ? `S${summary.worstVA.season} D${summary.worstVA.division} ${summary.worstVA.team}: ${fmt(summary.worstVA.valueAdded, 0, "signed")}`
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="text-lg font-bold">Season-by-season career</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left py-3 px-3">Season</th>
                    <th className="text-left py-3 px-3">Div</th>
                    <th className="text-left py-3 px-3">Club</th>
                    <th className="text-right py-3 px-3">Pre</th>
                    <th className="text-right py-3 px-3">Fin</th>
                    <th className="text-right py-3 px-3">VA</th>
                    <th className="text-right py-3 px-3">PVA</th>
                    <th className="text-right py-3 px-3">ETOT</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.careerRows.map((row, index) => (
                    <tr key={`${row.season}-${row.division}-${row.team}-${index}`} className="border-t">
                      <td className="py-3 px-3 font-semibold">S{row.season}</td>
                      <td className="py-3 px-3">D{row.division}</td>
                      <td className="py-3 px-3 font-semibold">{row.team}</td>
                      <td className="py-3 px-3 text-right">{row.predictedPosition ?? "—"}</td>
                      <td className="py-3 px-3 text-right">{row.position ?? row.finalPositionFromStats ?? "—"}</td>
                      <td className={`py-3 px-3 text-right font-bold ${Number(row.valueAdded) > 0 ? "text-green-700" : Number(row.valueAdded) < 0 ? "text-red-700" : ""}`}>
                        {row.valueAdded === null || row.valueAdded === undefined ? "—" : fmt(row.valueAdded, 0, "signed")}
                      </td>
                      <td className="py-3 px-3 text-right">{fmt(row.pva, 3, "signed")}</td>
                      <td className="py-3 px-3 text-right">{fmt(row.etot, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-lg font-bold">Average VA leaderboard</h3>
          <p className="text-sm text-gray-500">
            Managers with at least five matched Malcolm stats rows, ranked by average VA.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left py-3 px-3">Rank</th>
                <th className="text-left py-3 px-3">Manager</th>
                <th className="text-right py-3 px-3">Seasons</th>
                <th className="text-right py-3 px-3">Clubs</th>
                <th className="text-right py-3 px-3">Avg VA</th>
                <th className="text-right py-3 px-3">Avg PVA</th>
                <th className="text-right py-3 px-3">Avg ETOT</th>
                <th className="text-right py-3 px-3">Net strength</th>
              </tr>
            </thead>
            <tbody>
              {valueAddedTable.slice(0, 25).map((row, index) => (
                <tr key={row.manager} className="border-t">
                  <td className="py-3 px-3 font-bold">#{index + 1}</td>
                  <td className="py-3 px-3 font-semibold">{row.manager}</td>
                  <td className="py-3 px-3 text-right">{row.seasons}</td>
                  <td className="py-3 px-3 text-right">{row.clubsManaged}</td>
                  <td className="py-3 px-3 text-right font-bold text-green-700">{fmt(row.averageVA, 2, "signed")}</td>
                  <td className="py-3 px-3 text-right">{fmt(row.averagePVA, 3, "signed")}</td>
                  <td className="py-3 px-3 text-right">{fmt(row.averageETOT, 2)}</td>
                  <td className="py-3 px-3 text-right">{fmt(row.netStrengthGain, 2, "signed")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManagerAnalyticsTab;
