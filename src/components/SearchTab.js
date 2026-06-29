import React from "react";
import { Search } from "lucide-react";

const SearchTab = ({
  allPositionData,
  searchTerm,
  numeric,
  getTeamTags,
  getPositionBadge,
  getRowStyling,
  playoffWinnersSet,
  comparisonManagers,
  openManagerComparisonChart,
  setComparisonManagers,
  openClubChart,
  openManagerChart,
  toggleComparisonManager,
}) => {
  const filtered = allPositionData
    .filter(
      (team) =>
        team.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (team.manager && team.manager.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      const seasonCompare = parseInt(b.season || 0, 10) - parseInt(a.season || 0, 10);
      if (seasonCompare !== 0) return seasonCompare;
      const divCompare = parseInt(a.division || 0, 10) - parseInt(b.division || 0, 10);
      if (divCompare !== 0) return divCompare;
      return parseInt(a.position || 0, 10) - parseInt(b.position || 0, 10);
    });

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {filtered.map((team, index) => {
          const tags = getTeamTags(
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

          const rowClass = getRowStyling(team.position, team.division);

          return (
            <div
              key={index}
              className={`${rowClass} rounded-xl p-6 shadow-lg transition-all hover:shadow-xl`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h4 className="text-xl font-bold text-gray-900">{team.team}</h4>

                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${badge.bg} ${badge.text}`}
                      title={tags.map((t) => t.label).join(" • ")}
                    >
                      {badge.icon ? `${badge.icon} ` : ""}
                      #{team.position}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Manager</p>
                      <p className="font-semibold">{team.manager || "Unknown"}</p>
                    </div>

                    <div>
                      <p className="text-gray-500">Season & Division</p>
                      <p className="font-semibold">
                        S{team.season} D{team.division}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Record</p>
                      <p className="font-semibold">
                        {team.won}W {team.drawn}D {team.lost}L
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Goal Difference</p>
                      <p
                        className={`font-semibold ${
                          numeric(team.goal_difference) >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {numeric(team.goal_difference) > 0 ? "+" : ""}
                        {team.goal_difference}
                      </p>
                    </div>

                    {comparisonManagers.length > 0 && (
                      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap items-center gap-3">
                        <span className="font-semibold text-gray-700">
                          Comparing: {comparisonManagers.join(", ")}
                        </span>

                        {comparisonManagers.length >= 2 && (
                          <button
                            type="button"
                            onClick={openManagerComparisonChart}
                            className="px-3 py-2 rounded-lg bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800"
                          >
                            ⚔️ Compare Managers
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setComparisonManagers([])}
                          className="px-3 py-2 rounded-lg bg-gray-200 text-gray-800 text-sm font-semibold hover:bg-gray-300"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tags.map((t, i) => (
                        <span
                          key={i}
                          className={`px-2 py-0.5 rounded-md text-xs font-semibold ${t.style}`}
                        >
                          {t.label}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => openClubChart(team.team)}
                    className="mt-3 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                  >
                    📈 Club History
                  </button>

                  {team.manager && (
                    <button
                      type="button"
                      onClick={() => openManagerChart(team.manager)}
                      className="mt-3 ml-2 px-3 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700"
                    >
                      👤 Manager Career
                    </button>
                  )}

                  {team.manager && (
                    <button
                      type="button"
                      onClick={() => toggleComparisonManager(team.manager)}
                      className={`mt-3 ml-2 px-3 py-2 rounded-lg text-white text-sm font-semibold ${
                        comparisonManagers.includes(team.manager)
                          ? "bg-gray-700 hover:bg-gray-800"
                          : "bg-pink-600 hover:bg-pink-700"
                      }`}
                    >
                      {comparisonManagers.includes(team.manager)
                        ? "✓ Selected"
                        : "⚔️ Compare Manager"}
                    </button>
                  )}
                </div>

                <div className="text-right ml-4">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {team.points}
                  </div>
                  <div className="text-sm text-gray-500">points</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            No Results Found
          </h3>
          <p className="text-gray-500">
            Try searching for a different team or manager name
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchTab;
