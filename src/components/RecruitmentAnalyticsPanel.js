import React, { useMemo, useState } from "react";
import { Search, SlidersHorizontal, Users } from "lucide-react";
import {
  applyRecruitmentFilters,
  buildRecruitmentAnalyticsRows,
  RECRUITMENT_FILTERS,
  RECRUITMENT_PRESETS,
} from "../analytics/recruitmentAnalytics";

const fmt = (value, digits = 2, prefix = "") => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  const sign = prefix === "signed" && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}`;
};

const getPreset = (presetId) =>
  RECRUITMENT_PRESETS.find((preset) => preset.id === presetId) || RECRUITMENT_PRESETS[0];

const getMetricClass = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "text-gray-700";
  if (n > 0) return "text-green-700";
  if (n < 0) return "text-red-700";
  return "text-gray-700";
};

const badgeClass = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold bg-purple-50 text-purple-700";

const ManagerBadges = ({ row }) => {
  const badges = [];
  if (row.builder) badges.push("Builder");
  if (row.winner) badges.push("Winner");
  if (row.promotionSpecialist) badges.push("Promotion specialist");
  if (row.oneClubManager) badges.push("One-club");
  if (row.journeyman) badges.push("Journeyman");

  if (!badges.length) return <span className="text-xs text-gray-400">—</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {badges.slice(0, 3).map((badge) => (
        <span key={badge} className={badgeClass}>
          {badge}
        </span>
      ))}
    </div>
  );
};

const RecruitmentAnalyticsPanel = ({ allSummaries = [], onSelectManager }) => {
  const [activePreset, setActivePreset] = useState("overachievers");
  const [activeFilters, setActiveFilters] = useState([]);
  const [minimumSeasons, setMinimumSeasons] = useState(5);
  const [searchQuery, setSearchQuery] = useState("");

  const rows = useMemo(() => buildRecruitmentAnalyticsRows(allSummaries), [allSummaries]);

  const shortlist = useMemo(
    () =>
      applyRecruitmentFilters(rows, {
        activePreset,
        activeFilters,
        minimumSeasons,
        searchQuery,
      }),
    [rows, activePreset, activeFilters, minimumSeasons, searchQuery]
  );

  const preset = getPreset(activePreset);

  const toggleFilter = (filterId) => {
    setActiveFilters((current) =>
      current.includes(filterId) ? current.filter((item) => item !== filterId) : [...current, filterId]
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-5 border-b bg-gradient-to-r from-purple-50 to-white">
        <div className="flex items-start justify-between gap-4 flex-col lg:flex-row">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-purple-600" />
              <h3 className="text-xl font-black text-gray-900">Recruitment Analytics</h3>
            </div>
            <p className="text-sm text-gray-500 max-w-3xl">
              Scout historical managers by achievement, squad-building, promotion record and expectation-beating. Click a manager name to open the full analytics report.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 whitespace-nowrap">
            Minimum seasons
            <select
              value={minimumSeasons}
              onChange={(event) => setMinimumSeasons(Number(event.target.value))}
              className="px-3 py-2 border-2 border-gray-200 rounded-lg bg-white focus:ring-4 focus:ring-purple-100 focus:border-purple-500"
            >
              {[1, 3, 5, 10, 15, 20].map((limit) => (
                <option key={limit} value={limit}>
                  {limit}+ matched
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <div className="text-xs font-black uppercase tracking-wide text-gray-500 mb-2">Preset views</div>
          <div className="flex flex-wrap gap-2">
            {RECRUITMENT_PRESETS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActivePreset(item.id)}
                className={`px-3 py-2 rounded-full text-sm font-bold border transition-all ${
                  activePreset === item.id
                    ? "bg-purple-600 border-purple-600 text-white shadow"
                    : "bg-white border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_280px] gap-4 items-start">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-gray-500 mb-2">
              <SlidersHorizontal className="w-4 h-4" /> Filter chips
            </div>
            <div className="flex flex-wrap gap-2">
              {RECRUITMENT_FILTERS.map((filter) => {
                const active = activeFilters.includes(filter.id);
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => toggleFilter(filter.id)}
                    className={`px-3 py-2 rounded-full text-sm font-semibold border transition-all ${
                      active
                        ? "bg-gray-900 border-gray-900 text-white"
                        : "bg-white border-gray-200 text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search shortlist…"
              className="w-full pl-10 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-purple-100 focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      <div className="px-5 pb-4 text-sm text-gray-500">
        Showing <strong className="text-gray-900">{Math.min(shortlist.length, 50)}</strong> of <strong className="text-gray-900">{shortlist.length}</strong> managers for <strong>{preset.label}</strong>.
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left py-3 px-3">Rank</th>
              <th className="text-left py-3 px-3">Manager</th>
              <th className="text-right py-3 px-3">Seasons</th>
              <th className="text-right py-3 px-3">Clubs</th>
              <th className="text-right py-3 px-3">{preset.metricLabel}</th>
              <th className="text-right py-3 px-3">Avg PVA</th>
              <th className="text-right py-3 px-3">Net ETOT</th>
              <th className="text-right py-3 px-3">Titles</th>
              <th className="text-left py-3 px-3">Profile</th>
            </tr>
          </thead>
          <tbody>
            {shortlist.slice(0, 50).map((row, index) => {
              const metricValue = row[preset.metricKey];
              return (
                <tr key={row.manager} className="border-t hover:bg-purple-50/40">
                  <td className="py-3 px-3 font-bold">#{index + 1}</td>
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => onSelectManager?.(row.manager)}
                      className="font-black text-purple-700 hover:text-purple-900 hover:underline"
                    >
                      {row.manager}
                    </button>
                    {row.bestFiveSeasonRun && activePreset === "best-five-season-run" && (
                      <div className="text-xs text-gray-500">
                        S{row.bestFiveSeasonRun.fromSeason}–S{row.bestFiveSeasonRun.toSeason}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">{row.statsMatched}/{row.seasons}</td>
                  <td className="py-3 px-3 text-right">{row.clubsManaged}</td>
                  <td className={`py-3 px-3 text-right font-black ${getMetricClass(metricValue)}`}>
                    {fmt(metricValue, preset.digits, preset.metricKey.includes("Improvement") || preset.metricKey.includes("Gain") || preset.metricKey.includes("PVA") || preset.metricKey.includes("Score") ? "signed" : "")}
                  </td>
                  <td className={`py-3 px-3 text-right font-semibold ${getMetricClass(row.averagePVA)}`}>
                    {fmt(row.averagePVA, 3, "signed")}
                  </td>
                  <td className={`py-3 px-3 text-right font-semibold ${getMetricClass(row.netStrengthGain)}`}>
                    {fmt(row.netStrengthGain, 2, "signed")}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold">{row.titles}</td>
                  <td className="py-3 px-3 min-w-[180px]"><ManagerBadges row={row} /></td>
                </tr>
              );
            })}
            {!shortlist.length && (
              <tr>
                <td colSpan="9" className="py-8 px-3 text-center text-gray-500">
                  No managers match those recruitment filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecruitmentAnalyticsPanel;
