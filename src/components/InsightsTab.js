import React from "react";
import { BarChart3, Target, Trophy, Users } from "lucide-react";

const ThresholdCard = ({ title, rows }) => (
  <div className="border rounded-lg p-4 bg-white">
    <h4 className="font-semibold mb-2">{title}</h4>
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-600">
          <th className="py-1">Division</th>
          <th className="py-1">Min</th>
          <th className="py-1">Avg</th>
          <th className="py-1">Max</th>
          <th className="py-1">N</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t">
            <td className="py-1">D{r.division}</td>
            <td className="py-1">{r.min}</td>
            <td className="py-1">{r.avg}</td>
            <td className="py-1">{r.max}</td>
            <td className="py-1">{r.samples}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const InsightsTab = ({
  buildMostClubsManaged,
  leaders,
  leadersView,
  setLeadersView,
  recordsMetric,
  setRecordsMetric,
  recordsGroup,
  setRecordsGroup,
  recordsOrder,
  setRecordsOrder,
  recordsSeason,
  setRecordsSeason,
  recordsDivision,
  setRecordsDivision,
  availableSeasons,
  recordRows,
  computeThresholds,
}) => {
  const mostClubsManaged = buildMostClubsManaged().slice(0, 20);
  const src = leadersView === "team" ? leaders.byTeam : leaders.byManager;

  const LeaderTable = ({ title, rows }) => (
    <div className="bg-white rounded-xl shadow p-4">
      <h4 className="font-semibold mb-3">{title}</h4>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="py-2">
              {leadersView === "team" ? "Team" : "Manager"}
            </th>
            <th className="py-2 text-right">Count</th>
          </tr>
        </thead>
        <tbody>
          {(rows || []).slice(0, 15).map((r, i) => (
            <tr key={i} className="border-t">
              <td className="py-2">{r.key || "Unknown"}</td>
              <td className="py-2 text-right font-semibold">{r.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600" /> Leaders
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setLeadersView("team")}
              className={`px-3 py-1 rounded ${leadersView === "team" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
            >
              Teams
            </button>
            <button
              type="button"
              onClick={() => setLeadersView("manager")}
              className={`px-3 py-1 rounded ${leadersView === "manager" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
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
                  <td className="py-2 px-2">{r.manager || "Unknown"}</td>
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

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-pink-600" />
          <h3 className="text-xl font-bold">Most Clubs Managed</h3>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Managers ranked by the number of different clubs they have managed across
          the Top 100 archive.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 px-2">Rank</th>
                <th className="py-2 px-2">Manager</th>
                <th className="py-2 px-2">Clubs</th>
                <th className="py-2 px-2">Seasons</th>
                <th className="py-2 px-2">Club list</th>
              </tr>
            </thead>
            <tbody>
              {mostClubsManaged.map((row, index) => (
                <tr key={row.manager} className="border-t">
                  <td className="py-2 px-2 font-bold">#{index + 1}</td>
                  <td className="py-2 px-2 font-semibold">{row.manager}</td>
                  <td className="py-2 px-2 font-bold text-pink-700">
                    {row.clubCount}
                  </td>
                  <td className="py-2 px-2">{row.seasons}</td>
                  <td className="py-2 px-2 text-gray-600">{row.clubs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InsightsTab;
