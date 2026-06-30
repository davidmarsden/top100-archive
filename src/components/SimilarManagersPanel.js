import React, { useMemo } from "react";
import { Users } from "lucide-react";
import { getSimilarManagers } from "../analytics/managerSimilarity";

const fmt = (value, digits = 2, prefix = "") => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const sign = prefix === "signed" && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}`;
};

const SimilarManagersPanel = ({ summary, allSummaries = [], onSelectManager }) => {
  const similarManagers = useMemo(
    () => getSimilarManagers({ targetSummary: summary, allSummaries, limit: 5, minSeasons: 3 }),
    [summary, allSummaries]
  );

  if (!summary?.manager || !similarManagers.length) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-700" /> Similar managers
        </h3>
        <p className="text-sm text-gray-500">
          Based on PVA, VA, ETOT building, honours, promotions, average finish, career length and club count.
        </p>
      </div>

      <div className="divide-y">
        {similarManagers.map((manager) => (
          <button
            type="button"
            key={manager.manager}
            onClick={() => onSelectManager?.(manager.manager)}
            className="w-full text-left p-4 hover:bg-purple-50 transition-colors flex items-center justify-between gap-4"
          >
            <div>
              <div className="font-black text-gray-900">{manager.manager}</div>
              <div className="text-xs text-gray-500">
                {manager.seasons} seasons · {manager.clubsManaged} club{manager.clubsManaged === 1 ? "" : "s"} · Avg PVA {fmt(manager.averagePVA, 3, "signed")} · Net ETOT {fmt(manager.netStrengthGain, 2, "signed")}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-black text-purple-700">{manager.similarity}%</div>
              <div className="text-xs text-gray-500">match</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SimilarManagersPanel;
