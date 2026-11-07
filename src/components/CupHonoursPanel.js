import React from "react";
import { summariseCups } from "../data/cupHonours";

// Cup honours (Top 100, SMFA, World Club, Youth and other cups) on a club or
// manager profile. `honours`: [{ season, competition, club? | manager? }].
// `withName`: "club" shows the club for each win (manager profiles), "manager"
// the manager (club profiles).
const CupHonoursPanel = ({ honours, withName }) => {
  if (!Array.isArray(honours)) return null;
  const summary = summariseCups(honours);
  const sorted = [...honours].sort((a, b) => b.season - a.season || a.competition.localeCompare(b.competition));
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <h4 className="text-lg font-bold">🏆 Cups and trophies ({honours.length})</h4>
      {honours.length === 0 ? (
        <p className="text-sm text-gray-600 mt-1">No cup wins recorded.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mt-2">
            {summary.map((entry) => (
              <span key={entry.competition} className="px-2 py-1 rounded-lg border border-amber-300 bg-white text-sm font-semibold text-amber-900">
                {entry.competition} ×{entry.count}
              </span>
            ))}
          </div>
          <ul className="mt-3 text-sm text-gray-700 space-y-0.5">
            {sorted.map((honour) => {
              const other = withName === "club" ? honour.club : withName === "manager" ? honour.manager : "";
              return (
                <li key={`${honour.season}-${honour.competition}`}>
                  <span className="font-semibold">S{honour.season}</span> {honour.competition}
                  {other ? <span className="text-gray-500"> ({other})</span> : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
};

export default CupHonoursPanel;
