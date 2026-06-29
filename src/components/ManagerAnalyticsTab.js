import React, { useMemo, useState } from "react";
import { BarChart3, Search, TrendingDown, TrendingUp, Trophy, Users } from "lucide-react";
import {
  getManagerCareerSummary,
  getManagerOptions,
  getManagerValueAddedTable,
} from "../analytics/managerAnalytics";

const fmt = (value, digits = 2, prefix = "") => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  const sign = prefix === "signed" && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}`;
};

const fmtStrength = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return n.toFixed(2);
};

const StatCard = ({ label, value, hint }) => (
  <div className="bg-white rounded-xl shadow p-4">
    <div className="text-sm text-gray-500">{label}</div>
    <div className="text-3xl font-black text-gray-900 mt-1">{value}</div>
    {hint && <div className="text-xs text-gray-500 mt-2">{hint}</div>}
  </div>
);

const LeaderboardTable = ({
  title,
  description,
  rows,
  metricLabel,
  metricKey,
  metricDigits = 2,
  contextLabel = "Avg PVA",
  contextKey = "averagePVA",
  contextDigits = 3,
  limit = 20,
}) => (
  <div className="bg-white rounded-xl shadow-lg overflow-hidden">
    <div className="p-4 border-b">
      <h3 className="text-lg font-bold">{title}</h3>
      {description && <p className="text-sm text-gray-500">{description}</p>}
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="text-left py-3 px-3">Rank</th>
            <th className="text-left py-3 px-3">Manager</th>
            <th className="text-right py-3 px-3">Seasons</th>
            <th className="text-right py-3 px-3">Clubs</th>
            <th className="text-right py-3 px-3">{metricLabel}</th>
            <th className="text-right py-3 px-3">Avg VA</th>
            <th className="text-right py-3 px-3">{contextLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, limit).map((row, index) => (
            <tr key={row.manager} className="border-t">
              <td className="py-3 px-3 font-bold">#{index + 1}</td>
              <td className="py-3 px-3 font-semibold">{row.manager}</td>
              <td className="py-3 px-3 text-right">{row.seasons}</td>
              <td className="py-3 px-3 text-right">{row.clubsManaged}</td>
              <td className="py-3 px-3 text-right font-bold text-green-700">
                {fmt(row[metricKey], metricDigits, "signed")}
              </td>
              <td className="py-3 px-3 text-right">{fmt(row.averageVA, 2, "signed")}</td>
              <td className="py-3 px-3 text-right">{fmt(row[contextKey], contextDigits, "signed")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const ManagerAnalyticsTab = ({ archiveRows = [], statsRows = [] }) => {
  const [managerQuery, setManagerQuery] = useState("");
  const [leaderboardLimit, setLeaderboardLimit] = useState(20);
  const [minMatchedSeasons, setMinMatchedSeasons] = useState(5);

  const managerOptions = useMemo(() => getManagerOptions(archiveRows), [archiveRows]);

  const valueAddedTable = useMemo(
    () => getManagerValueAddedTable(archiveRows, statsRows, { minMatchedSeasons }),
    [archiveRows, statsRows, minMatchedSeasons]
  );

  const pvaLeaders = useMemo(
    () => [...valueAddedTable].sort((a, b) => b.averagePVA - a.averagePVA || b.averageVA - a.averageVA),
    [valueAddedTable]
  );

  const netStrengthGainLeaders = useMemo(
    () =>
      [...valueAddedTable]
        .filter((row) => row.netStrengthGain !== null && row.netStrengthGain !== undefined)
        .sort((a, b) => b.netStrengthGain - a.netStrengthGain),
    [valueAddedTable]
  );

  const netStrengthLossLeaders = useMemo(
    () =>
      [...valueAddedTable]
        .filter((row) => row.netStrengthGain !== null && row.netStrengthGain !== undefined)
        .sort((a, b) => a.netStrengthGain - b.netStrengthGain),
    [valueAddedTable]
  );

  const selectedManager = managerQuery.trim();

  const summary = useMemo(
    () => getManagerCareerSummary(selectedManager, archiveRows, statsRows),
    [selectedManager, archiveRows, statsRows]
  );

  const careerRowsForDisplay = useMemo(
    () =>
      summary.clubSpells.flatMap((spell) =>
        spell.rows.map((row) => ({ ...row, displayClub: spell.club }))
      ),
    [summary.clubSpells]
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

        <div className="grid md:grid-cols-2 gap-3">
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

          <select
            value={managerOptions.some((option) => option.manager === managerQuery) ? managerQuery : ""}
            onChange={(e) => setManagerQuery(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 bg-white transition-all"
          >
            <option value="">Select manager…</option>
            {managerOptions.map((option) => (
              <option key={option.manager} value={option.manager}>
                {option.manager} ({option.seasons} seasons)
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedManager ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
          Search for a manager or select one from the dropdown to view their career analytics.
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
                  Inherited ETOT to last ETOT for each uninterrupted spell at a club.
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
                      <th className="text-right py-3 px-3">Last</th>
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
                        <td className="py-3 px-3 text-right">{fmtStrength(spell.inheritedStrength)}</td>
                        <td className="py-3 px-3 text-right">{fmtStrength(spell.lastStrength)}</td>
                        <td className="py-3 px-3 text-right">{fmtStrength(spell.highestStrength)}</td>
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
              <p className="text-sm text-gray-500">Grouped by club spell so mid-season moves do not split tenures.</p>
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
                  {careerRowsForDisplay.map((row, index) => (
                    <tr key={`${row.displayClub}-${row.season}-${row.division}-${index}`} className="border-t">
                      <td className="py-3 px-3 font-semibold">S{row.season}</td>
                      <td className="py-3 px-3">D{row.division}</td>
                      <td className="py-3 px-3 font-semibold">{row.displayClub || row.canonicalClub || row.team}</td>
                      <td className="py-3 px-3 text-right">{row.predictedPosition ?? "—"}</td>
                      <td className="py-3 px-3 text-right">{row.position ?? row.finalPositionFromStats ?? "—"}</td>
                      <td className={`py-3 px-3 text-right font-bold ${Number(row.valueAdded) > 0 ? "text-green-700" : Number(row.valueAdded) < 0 ? "text-red-700" : ""}`}>
                        {row.valueAdded === null || row.valueAdded === undefined ? "—" : fmt(row.valueAdded, 0, "signed")}
                      </td>
                      <td className="py-3 px-3 text-right">{fmt(row.pva, 3, "signed")}</td>
                      <td className="py-3 px-3 text-right">{fmtStrength(row.etot)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="bg-white rounded-xl shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Manager leaderboards</h3>
          <p className="text-sm text-gray-500">Adjust the shortlist size and minimum evidence threshold for manager recruitment comparisons.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            Minimum
            <select
              value={minMatchedSeasons}
              onChange={(e) => setMinMatchedSeasons(Number(e.target.value))}
              className="px-3 py-2 border-2 border-gray-200 rounded-lg bg-white focus:ring-4 focus:ring-purple-100 focus:border-purple-500"
            >
              {[1, 3, 5, 10, 15, 20].map((limit) => (
                <option key={limit} value={limit}>
                  {limit}+ matched seasons
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            Show
            <select
              value={leaderboardLimit}
              onChange={(e) => setLeaderboardLimit(Number(e.target.value))}
              className="px-3 py-2 border-2 border-gray-200 rounded-lg bg-white focus:ring-4 focus:ring-purple-100 focus:border-purple-500"
            >
              {[10, 20, 30, 50].map((limit) => (
                <option key={limit} value={limit}>
                  Top {limit}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <LeaderboardTable
          title="Average PVA leaderboard"
          description={`Managers with at least ${minMatchedSeasons} matched Malcolm stats season${minMatchedSeasons === 1 ? "" : "s"}, ranked by average PVA.`}
          rows={pvaLeaders}
          metricLabel="Avg PVA"
          metricKey="averagePVA"
          metricDigits={3}
          contextLabel="Net strength"
          contextKey="netStrengthGain"
          contextDigits={2}
          limit={leaderboardLimit}
        />
        <LeaderboardTable
          title="Net strength gain"
          description={`Largest total ETOT gains across club spells, minimum ${minMatchedSeasons} matched season${minMatchedSeasons === 1 ? "" : "s"}.`}
          rows={netStrengthGainLeaders}
          metricLabel="Net strength"
          metricKey="netStrengthGain"
          metricDigits={2}
          limit={leaderboardLimit}
        />
        <LeaderboardTable
          title="Net strength loss"
          description={`Largest total ETOT losses across club spells, minimum ${minMatchedSeasons} matched season${minMatchedSeasons === 1 ? "" : "s"}.`}
          rows={netStrengthLossLeaders}
          metricLabel="Net strength"
          metricKey="netStrengthGain"
          metricDigits={2}
          limit={leaderboardLimit}
        />
      </div>
    </div>
  );
};

export default ManagerAnalyticsTab;
