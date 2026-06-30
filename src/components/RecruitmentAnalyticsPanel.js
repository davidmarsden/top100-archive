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
        <span key={badge} className={badgeClass}>{badge}</span>
      ))}
    </div>
  );
};

const VACANCY_TYPES = [
  { id: "balanced", label: "Balanced appointment" },
  { id: "title", label: "Title challenge" },
  { id: "promotion", label: "Promotion push" },
  { id: "rebuild", label: "Rebuild / squad building" },
  { id: "survival", label: "Survival / stabilise" },
  { id: "cups", label: "Cup pedigree" },
];

const suitabilityScore = (row, type) => {
  const pva = Math.max(0, Number(row.averagePVA || 0));
  const etot = Math.max(0, Number(row.netStrengthGain || 0));
  const titles = Number(row.titles || 0);
  const promotions = Number(row.promotionCount || 0);
  const weak = Math.max(0, Number(row.weakSquadSuccessScore || 0));
  const peak = Math.max(0, Number(row.peakETOT || 0) - 220) / 10;
  const run = Math.max(0, Number(row.bestFiveSeasonRunValue || 0));
  const seasons = Math.min(20, Number(row.statsMatched || row.seasons || 0)) / 20;

  const weights = {
    balanced: pva * 30 + etot * 2 + titles * 5 + promotions * 4 + run * 8 + seasons * 10,
    title: titles * 12 + peak * 8 + pva * 18 + run * 10 + seasons * 6,
    promotion: promotions * 12 + pva * 20 + weak * 8 + etot * 1.5 + seasons * 5,
    rebuild: etot * 5 + pva * 15 + weak * 6 + seasons * 8,
    survival: weak * 12 + pva * 20 + seasons * 6,
    cups: titles * 6 + peak * 4 + pva * 12 + run * 8 + seasons * 5,
  };

  return Math.round(Math.max(0, weights[type] ?? weights.balanced));
};

const RecruitmentAnalyticsPanel = ({ allSummaries = [], onSelectManager }) => {
  const [activePreset, setActivePreset] = useState("overachievers");
  const [activeFilters, setActiveFilters] = useState([]);
  const [minimumSeasons, setMinimumSeasons] = useState(5);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [selectedManagers, setSelectedManagers] = useState([]);
  const [vacancyType, setVacancyType] = useState("balanced");

  const rows = useMemo(() => buildRecruitmentAnalyticsRows(allSummaries), [allSummaries]);

  const shortlist = useMemo(
    () => applyRecruitmentFilters(rows, { activePreset, activeFilters, minimumSeasons, searchQuery }),
    [rows, activePreset, activeFilters, minimumSeasons, searchQuery]
  );

  const preset = getPreset(activePreset);
  const visibleRows = showAll ? shortlist.slice(0, 50) : shortlist.slice(0, 5);
  const selectedRows = selectedManagers
    .map((manager) => rows.find((row) => row.manager === manager))
    .filter(Boolean)
    .sort((a, b) => suitabilityScore(b, vacancyType) - suitabilityScore(a, vacancyType));

  const toggleFilter = (filterId) => {
    setActiveFilters((current) =>
      current.includes(filterId) ? current.filter((item) => item !== filterId) : [...current, filterId]
    );
  };

  const toggleManager = (manager) => {
    setSelectedManagers((current) => {
      if (current.includes(manager)) return current.filter((item) => item !== manager);
      return [...current, manager].slice(0, 5);
    });
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
              Scout managers for vacancies. Default view shows the top five; tick up to five managers to compare applicants.
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
                <option key={limit} value={limit}>{limit}+ matched</option>
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
                onClick={() => {
                  setActivePreset(item.id);
                  setShowAll(false);
                }}
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

      <div className="px-5 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm text-gray-500">
        <div>
          Showing <strong className="text-gray-900">{visibleRows.length}</strong> of <strong className="text-gray-900">{shortlist.length}</strong> managers for <strong>{preset.label}</strong>.
        </div>
        {shortlist.length > 5 && (
          <button type="button" onClick={() => setShowAll((value) => !value)} className="px-3 py-2 rounded-lg bg-purple-50 text-purple-700 font-bold">
            {showAll ? "Show top five" : "View more"}
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left py-3 px-3">Compare</th>
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
            {visibleRows.map((row, index) => {
              const metricValue = row[preset.metricKey];
              const selected = selectedManagers.includes(row.manager);
              return (
                <tr key={row.manager} className="border-t hover:bg-purple-50/40">
                  <td className="py-3 px-3">
                    <input type="checkbox" checked={selected} onChange={() => toggleManager(row.manager)} />
                  </td>
                  <td className="py-3 px-3 font-bold">#{index + 1}</td>
                  <td className="py-3 px-3">
                    <button type="button" onClick={() => onSelectManager?.(row.manager)} className="font-black text-purple-700 hover:text-purple-900 hover:underline">
                      {row.manager}
                    </button>
                    {row.bestFiveSeasonRun && activePreset === "best-five-season-run" && (
                      <div className="text-xs text-gray-500">S{row.bestFiveSeasonRun.fromSeason}–S{row.bestFiveSeasonRun.toSeason}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">{row.statsMatched}/{row.seasons}</td>
                  <td className="py-3 px-3 text-right">{row.clubsManaged}</td>
                  <td className={`py-3 px-3 text-right font-black ${getMetricClass(metricValue)}`}>
                    {fmt(metricValue, preset.digits, preset.metricKey.includes("Improvement") || preset.metricKey.includes("Gain") || preset.metricKey.includes("PVA") || preset.metricKey.includes("Score") ? "signed" : "")}
                  </td>
                  <td className={`py-3 px-3 text-right font-semibold ${getMetricClass(row.averagePVA)}`}>{fmt(row.averagePVA, 3, "signed")}</td>
                  <td className={`py-3 px-3 text-right font-semibold ${getMetricClass(row.netStrengthGain)}`}>{fmt(row.netStrengthGain, 2, "signed")}</td>
                  <td className="py-3 px-3 text-right font-semibold">{row.titles}</td>
                  <td className="py-3 px-3 min-w-[180px]"><ManagerBadges row={row} /></td>
                </tr>
              );
            })}
            {!shortlist.length && (
              <tr><td colSpan="10" className="py-8 px-3 text-center text-gray-500">No managers match those recruitment filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-5 border-t bg-gray-50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h4 className="text-lg font-black text-gray-900">Vacancy comparison</h4>
            <p className="text-sm text-gray-500">Select up to five applicants above and compare their suitability for a job type.</p>
          </div>
          <select value={vacancyType} onChange={(event) => setVacancyType(event.target.value)} className="px-3 py-2 border-2 border-gray-200 rounded-lg bg-white">
            {VACANCY_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left py-3 px-3">Manager</th>
                <th className="text-right py-3 px-3">Suitability</th>
                <th className="text-right py-3 px-3">Avg PVA</th>
                <th className="text-right py-3 px-3">Net ETOT</th>
                <th className="text-right py-3 px-3">Titles</th>
                <th className="text-right py-3 px-3">Promotions</th>
                <th className="text-right py-3 px-3">Weak-squad score</th>
                <th className="text-right py-3 px-3">Best 5yr PVA</th>
              </tr>
            </thead>
            <tbody>
              {selectedRows.map((row) => (
                <tr key={row.manager} className="border-t">
                  <td className="py-3 px-3 font-black text-purple-700">{row.manager}</td>
                  <td className="py-3 px-3 text-right font-black">{suitabilityScore(row, vacancyType)}</td>
                  <td className={`py-3 px-3 text-right ${getMetricClass(row.averagePVA)}`}>{fmt(row.averagePVA, 3, "signed")}</td>
                  <td className={`py-3 px-3 text-right ${getMetricClass(row.netStrengthGain)}`}>{fmt(row.netStrengthGain, 2, "signed")}</td>
                  <td className="py-3 px-3 text-right">{row.titles}</td>
                  <td className="py-3 px-3 text-right">{row.promotionCount}</td>
                  <td className="py-3 px-3 text-right">{fmt(row.weakSquadSuccessScore, 3, "signed")}</td>
                  <td className="py-3 px-3 text-right">{fmt(row.bestFiveSeasonRunValue, 3, "signed")}</td>
                </tr>
              ))}
              {!selectedRows.length && (
                <tr><td colSpan="8" className="py-8 text-center text-gray-500">Tick managers in the shortlist above to compare applicants.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecruitmentAnalyticsPanel;
