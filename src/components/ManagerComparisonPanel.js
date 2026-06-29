import React, { useMemo } from "react";
import { Users } from "lucide-react";
import { getManagerCareerSummary } from "../analytics/managerAnalytics";

const fmt = (value, digits = 2, prefix = "") => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  const sign = prefix === "signed" && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}`;
};

const ManagerComparisonPanel = ({
  managerOptions = [],
  comparisonManagers = [],
  setComparisonManagers,
  archiveRows = [],
  statsRows = [],
}) => {
  const summaries = useMemo(
    () =>
      comparisonManagers
        .filter(Boolean)
        .map((manager) => getManagerCareerSummary(manager, archiveRows, statsRows))
        .filter((summary) => summary.seasons > 0),
    [comparisonManagers, archiveRows, statsRows]
  );

  const setManagerAt = (index, value) => {
    const next = [...comparisonManagers];
    next[index] = value;
    setComparisonManagers(next);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-700" /> Manager comparison
        </h3>
        <p className="text-sm text-gray-500">
          First-pass recruitment comparison using the core career metrics. Full overlay charts can build on this next.
        </p>
      </div>

      <div className="p-4 grid md:grid-cols-2 gap-3">
        {[0, 1].map((index) => (
          <select
            key={index}
            value={comparisonManagers[index] || ""}
            onChange={(event) => setManagerAt(index, event.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 bg-white transition-all"
          >
            <option value="">Select comparison manager {index + 1}…</option>
            {managerOptions.map((option) => (
              <option key={`${index}-${option.manager}`} value={option.manager}>
                {option.manager} ({option.seasons} seasons)
              </option>
            ))}
          </select>
        ))}
      </div>

      {summaries.length > 0 && (
        <div className="overflow-x-auto border-t">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left py-3 px-3">Manager</th>
                <th className="text-right py-3 px-3">Seasons</th>
                <th className="text-right py-3 px-3">Clubs</th>
                <th className="text-right py-3 px-3">Avg VA</th>
                <th className="text-right py-3 px-3">Avg PVA</th>
                <th className="text-right py-3 px-3">Avg ETOT</th>
                <th className="text-right py-3 px-3">Net strength</th>
                <th className="text-right py-3 px-3">Titles</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => (
                <tr key={summary.manager} className="border-t">
                  <td className="py-3 px-3 font-semibold">{summary.manager}</td>
                  <td className="py-3 px-3 text-right">{summary.seasons}</td>
                  <td className="py-3 px-3 text-right">{summary.clubsManaged}</td>
                  <td className="py-3 px-3 text-right">{fmt(summary.averageVA, 2, "signed")}</td>
                  <td className="py-3 px-3 text-right">{fmt(summary.averagePVA, 3, "signed")}</td>
                  <td className="py-3 px-3 text-right">{fmt(summary.averageETOT, 2)}</td>
                  <td className="py-3 px-3 text-right">{fmt(summary.netStrengthGain, 2, "signed")}</td>
                  <td className="py-3 px-3 text-right">{summary.titles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ManagerComparisonPanel;
