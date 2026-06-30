import React, { useMemo, useState } from "react";
import { Filter, Search, SlidersHorizontal } from "lucide-react";
import {
  enrichRecruitmentSummary,
  getNestedMetric,
  RECRUITMENT_PRESETS,
} from "../analytics/recruitmentAnalytics";

const fmt = (value, digits = 2, signed = false) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const sign = signed && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}`;
};

const FILTERS = [
  { id: "positivePVA", label: "Positive average PVA", predicate: (row) => row.hasPositivePVA },
  { id: "positiveEtot", label: "Positive net ETOT", predicate: (row) => row.hasPositiveNetEtot },
  { id: "oneClub", label: "One-club managers", predicate: (row) => row.isOneClubManager },
  { id: "journeymen", label: "Journeymen", predicate: (row) => row.isJourneyman },
  { id: "builders", label: "Builders", predicate: (row) => row.isBuilder },
  { id: "winners", label: "Winners", predicate: (row) => row.isWinner },
  { id: "multipleTitles", label: "Multiple titles", predicate: (row) => row.hasMultipleTitles },
  { id: "promotion", label: "Promotion specialists", predicate: (row) => row.isPromotionSpecialist },
];

const RecruitmentAnalyticsPanel = ({ allSummaries = [], onSelectManager }) => {
  const [presetId, setPresetId] = useState("overachievers");
  const [minSeasons, setMinSeasons] = useState(5);
  const [activeFilters, setActiveFilters] = useState([]);
  const [query, setQuery] = useState("");

  const enrichedRows = useMemo(
    () => allSummaries.map(enrichRecruitmentSummary),
    [allSummaries]
  );

  const selectedPreset = RECRUITMENT_PRESETS.find((preset) => preset.id === presetId) || RECRUITMENT_PRESETS[0];

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const activeFilterDefs = FILTERS.filter((filter) => activeFilters.includes(filter.id));

    return enrichedRows
      .filter((row) => Number(row.seasons) >= minSeasons)
      .filter((row) => (q ? row.manager.toLowerCase().includes(q) : true))
      .filter((row) => (selectedPreset.filter ? selectedPreset.filter(row) : true))
      .filter((row) => activeFilterDefs.every((filter) => filter.predicate(row)))
      .sort(selectedPreset.sort)
      .slice(0, 50);
  }, [enrichedRows, minSeasons, query, selectedPreset, activeFilters]);

  const toggleFilter = (filterId) => {
    setActiveFilters((current) =>
      current.includes(filterId)
        ? current.filter((id) => id !== filterId)
        : [...current, filterId]
    );
  };

  const clearFilters = () => {
    setActiveFilters([]);
    setQuery("");
    setMinSeasons(5);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-purple-700" /> Recruitment analytics
        </h3>
        <p className="text-sm text-gray-500">
          Preset scouting views and filters for shortlisting managers by role, risk profile and career evidence.
        </p>
      </div>

      <div className="p-4 space-y-4 border-b bg-gray-50">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          {RECRUITMENT_PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.id}
              onClick={() => setPresetId(preset.id)}
              className={`text-left rounded-xl border p-3 transition-all ${
                presetId === preset.id
                  ? "bg-purple-700 text-white border-purple-700 shadow"
                  : "bg-white text-gray-800 border-gray-200 hover:border-purple-300 hover:bg-purple-50"
              }`}
            >
              <div className="font-black">{preset.label}</div>
              <div className={`text-xs mt-1 ${presetId === preset.id ? "text-purple-100" : "text-gray-500"}`}>
                {preset.description}
              </div>
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search within shortlist..."
              className="w-full pl-10 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-purple-100 focus:border-purple-500"
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            Minimum seasons
            <select
              value={minSeasons}
              onChange={(event) => setMinSeasons(Number(event.target.value))}
              className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg bg-white focus:ring-4 focus:ring-purple-100 focus:border-purple-500"
            >
              {[1, 3, 5, 10, 15, 20].map((limit) => (
                <option key={limit} value={limit}>{limit}+</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={clearFilters}
            className="px-3 py-2 rounded-lg bg-gray-200 text-gray-800 text-sm font-semibold hover:bg-gray-300"
          >
            Clear filters
          </button>
        </div>

        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
            <Filter className="w-4 h-4" /> Filter chips
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => {
              const active = activeFilters.includes(filter.id);
              return (
                <button
                  type="button"
                  key={filter.id}
                  onClick={() => toggleFilter(filter.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                    active
                      ? "bg-purple-700 text-white border-purple-700"
                      : "bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left py-3 px-3">Rank</th>
              <th className="text-left py-3 px-3">Manager</th>
              <th className="text-right py-3 px-3">Seasons</th>
              <th className="text-right py-3 px-3">Clubs</th>
              <th className="text-right py-3 px-3">{selectedPreset.metricLabel}</th>
              <th className="text-right py-3 px-3">Avg PVA</th>
              <th className="text-right py-3 px-3">Net ETOT</th>
              <th className="text-right py-3 px-3">Titles</th>
              <th className="text-right py-3 px-3">Promotions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => {
              const metric = getNestedMetric(row, selectedPreset.metricKey);
              return (
                <tr key={row.manager} className="border-t hover:bg-purple-50">
                  <td className="py-3 px-3 font-bold">#{index + 1}</td>
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => onSelectManager?.(row.manager)}
                      className="font-black text-purple-700 hover:text-purple-900 hover:underline"
                    >
                      {row.manager}
                    </button>
                    {row.bestFiveSeasonRun && selectedPreset.id === "fiveSeasonRun" && (
                      <div className="text-xs text-gray-500">
                        S{row.bestFiveSeasonRun.fromSeason}–S{row.bestFiveSeasonRun.toSeason}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">{row.seasons}</td>
                  <td className="py-3 px-3 text-right">{row.clubsManaged}</td>
                  <td className="py-3 px-3 text-right font-black text-purple-700">
                    {fmt(metric, selectedPreset.metricDigits, selectedPreset.signed)}
                  </td>
                  <td className="py-3 px-3 text-right">{fmt(row.averagePVA, 3, true)}</td>
                  <td className="py-3 px-3 text-right">{fmt(row.netStrengthGain, 2, true)}</td>
                  <td className="py-3 px-3 text-right">{row.titles}</td>
                  <td className="py-3 px-3 text-right">{row.promotions}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredRows.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No managers match this recruitment view yet.
        </div>
      )}
    </div>
  );
};

export default RecruitmentAnalyticsPanel;
