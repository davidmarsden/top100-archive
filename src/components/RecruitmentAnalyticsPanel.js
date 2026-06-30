import React, { useMemo, useState } from "react";
import { Search, SlidersHorizontal, Users } from "lucide-react";
import {
  applyRecruitmentFilters,
  buildRecruitmentAnalyticsRows,
  buildRecruitmentReport,
  RECRUITMENT_FILTERS,
  RECRUITMENT_PRESETS,
  VACANCY_TYPES,
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

const scoreClass = (score) => {
  if (score >= 78) return "text-green-700";
  if (score >= 65) return "text-emerald-700";
  if (score >= 50) return "text-amber-700";
  if (score >= 35) return "text-orange-700";
  return "text-red-700";
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
  const selectedReports = selectedManagers
    .map((manager) => rows.find((row) => row.manager === manager))
    .filter(Boolean)
    .map((row) => ({ row, report: buildRecruitmentReport(row, vacancyType) }))
    .sort((a, b) => b.report.evidenceScore - a.report.evidenceScore);

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
              Scout managers for vacancies. Default view shows the top five; tick up to five managers to produce a recruitment report.
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
              <th className="text-right py-3 px-3">Current club</th>
              <th className="text-right py-3 px-3">Tenure</th>
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
                  <td className="py-3 px-3"><input type="checkbox" checked={selected} onChange={() => toggleManager(row.manager)} /></td>
                  <td className="py-3 px-3 font-bold">#{index + 1}</td>
                  <td className="py-3 px-3">
                    <button type="button" onClick={() => onSelectManager?.(row.manager)} className="font-black text-purple-700 hover:text-purple-900 hover:underline">
                      {row.manager}
                    </button>
                    {row.bestFiveSeasonRun && activePreset === "best-five-season-run" && (
                      <div className="text-xs text-gray-500">S{row.bestFiveSeasonRun.fromSeason}–S{row.bestFiveSeasonRun.toSeason}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">{row.currentClub || "—"}</td>
                  <td className="py-3 px-3 text-right">{row.currentClubSeasons || 0}</td>
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
            <h4 className="text-lg font-black text-gray-900">Recruitment report</h4>
            <p className="text-sm text-gray-500">
              Evidence-based qualified/deserving report. Community activity and disciplinary checks remain manual admin judgement.
            </p>
          </div>
          <select value={vacancyType} onChange={(event) => setVacancyType(event.target.value)} className="px-3 py-2 border-2 border-gray-200 rounded-lg bg-white">
            {VACANCY_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left py-3 px-3">Manager</th>
                <th className="text-left py-3 px-3">Recommendation</th>
                <th className="text-right py-3 px-3">Evidence</th>
                <th className="text-right py-3 px-3">Qualified</th>
                <th className="text-right py-3 px-3">Deserving</th>
                <th className="text-right py-3 px-3">Current club</th>
                <th className="text-right py-3 px-3">Tenure</th>
                <th className="text-right py-3 px-3">Current progress</th>
              </tr>
            </thead>
            <tbody>
              {selectedReports.map(({ row, report }) => (
                <tr key={row.manager} className="border-t">
                  <td className="py-3 px-3 font-black text-purple-700">{row.manager}</td>
                  <td className={`py-3 px-3 font-black ${scoreClass(report.evidenceScore)}`}>{report.recommendation}</td>
                  <td className={`py-3 px-3 text-right font-black ${scoreClass(report.evidenceScore)}`}>{fmt(report.evidenceScore, 1)}</td>
                  <td className="py-3 px-3 text-right">{fmt(report.qualifiedScore, 1)}</td>
                  <td className="py-3 px-3 text-right">{fmt(report.deservingScore, 1)}</td>
                  <td className="py-3 px-3 text-right">{report.currentClub || "—"}</td>
                  <td className="py-3 px-3 text-right">{report.currentClubSeasons}</td>
                  <td className="py-3 px-3 text-right">{fmt(row.currentClubProgress, 0, "signed")}</td>
                </tr>
              ))}
              {!selectedReports.length && (
                <tr><td colSpan="8" className="py-8 text-center text-gray-500">Tick managers in the shortlist above to compare applicants.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedReports.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-4">
            {selectedReports.map(({ row, report }) => (
              <div key={row.manager} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h5 className="text-lg font-black text-gray-900">{row.manager}</h5>
                    <p className="text-sm text-gray-500">{report.currentClub || "Current club unknown"} · {report.currentClubSeasons} season(s)</p>
                  </div>
                  <div className={`text-right font-black ${scoreClass(report.evidenceScore)}`}>{report.recommendation}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div><strong>Avg PVA:</strong> {fmt(row.averagePVA, 3, "signed")}</div>
                  <div><strong>Current PVA:</strong> {fmt(row.currentClubAveragePVA, 3, "signed")}</div>
                  <div><strong>Net ETOT:</strong> {fmt(row.netStrengthGain, 2, "signed")}</div>
                  <div><strong>Promotions:</strong> {row.promotionCount}</div>
                  <div><strong>Titles:</strong> {row.titles}</div>
                  <div><strong>Elite seasons:</strong> {row.eliteClubSeasons}</div>
                  <div><strong>Auto-sackings:</strong> {row.autoSackings}</div>
                  <div><strong>Relegations:</strong> {row.relegations}</div>
                </div>

                <div className="text-xs font-black uppercase tracking-wide text-gray-500 mb-2">Manual admin checks still required</div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {Object.keys(report.manual).map((key) => (
                    <span key={key} className="px-2 py-1 rounded-full bg-amber-50 text-amber-800 font-semibold text-xs">
                      {key.replace(/([A-Z])/g, " $1")}
                    </span>
                  ))}
                </div>

                <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
                  {report.notes.map((note) => <li key={note}>{note}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecruitmentAnalyticsPanel;
