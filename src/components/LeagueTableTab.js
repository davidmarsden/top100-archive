import React from "react";
import { SortAsc, Target, Trophy, Users } from "lucide-react";

const LegendSwatch = ({ color, label }) => (
  <span className={`inline-flex items-center gap-2 px-2 py-1 rounded border ${color}`}>
    <span className="inline-block w-3 h-3 rounded-full bg-white/60 border" />
    <span className="text-sm">{label}</span>
  </span>
);

const LeagueTableTab = ({
  getFilteredData,
  selectedSeason,
  selectedDivision,
  sortBy,
  setSortBy,
  getTeamTags,
  getPositionBadge,
  getRowStyling,
  playoffWinnersSet,
  numeric,
}) => {
  const tableData = getFilteredData(selectedSeason, selectedDivision, sortBy);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-2xl font-bold">
              Season {selectedSeason} - Division {selectedDivision}
            </h3>
            <p className="text-blue-200">Complete League Table ({tableData.length} teams)</p>
            <p className="text-xs text-blue-300 mt-1">Soccer Manager Worlds Top 100 Elite Community</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {[
              { id: "position", label: "Position", icon: Trophy },
              { id: "points", label: "Points", icon: Target },
              { id: "team", label: "Team A-Z", icon: SortAsc },
              { id: "manager", label: "Manager A-Z", icon: Users },
            ].map((sort) => (
              <button
                key={sort.id}
                type="button"
                onClick={() => setSortBy(sort.id)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  sortBy === sort.id
                    ? "bg-white text-blue-600 shadow-lg"
                    : "bg-blue-500 hover:bg-blue-400 text-white"
                }`}
              >
                <sort.icon className="w-4 h-4" />
                {sort.label}
              </button>
            ))}
          </div>
        </div>
      </div>

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
                team.division,
                team.team,
                team.season,
                playoffWinnersSet
              );
              const badge = getPositionBadge(
                team.position,
                team.division,
                team.team,
                team.season,
                playoffWinnersSet
              );

              return (
                <tr
                  key={index}
                  className={`${getRowStyling(team.position, team.division)} border-b border-gray-100 transition-all hover:shadow-md`}
                >
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold ${badge.bg} ${badge.text}`}>
                      {badge.icon ? `${badge.icon} ` : ""}
                      {team.position}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-start gap-3">
                      <div>
                        <div className="font-bold text-gray-900 text-lg">{team.team}</div>
                        <div className="text-sm text-gray-600 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {team.manager || "Unknown Manager"}
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
                  <td
                    className={`py-4 px-3 text-center font-bold ${
                      numeric(team.goal_difference) >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {numeric(team.goal_difference) > 0 ? "+" : ""}
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

export default LeagueTableTab;
