import React from "react";
import { toSheetCsv } from "../data/liveSeason";

// Shown while the current season comes from Soccer Manager Sync rather than the sheet.
export default function LiveSeasonBanner({ rows = [] }) {
  if (!rows.length) return null;

  const season = rows[0].season;
  const played = Math.min(...rows.map((row) => Number(row.played) || 0));
  const observed = rows.map((row) => row.observedAt).filter(Boolean).sort().pop();
  const updated = observed
    ? new Date(observed).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;
  const inProgress = rows.some((row) => row.inProgress);

  const download = () => {
    const url = URL.createObjectURL(new Blob([toSheetCsv(rows)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `top100-s${season}-full-history-rows.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  return (
    <div className="mb-6 rounded-xl border-2 border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900 flex flex-wrap items-center gap-3">
      <span>
        <strong>S{season} is live from Soccer Manager Sync</strong>
        {inProgress ? ` (${played} of 38 games played` : " (final table"}
        {updated ? `, updated ${updated})` : ")"}.
        {inProgress ? " Titles, promotions and sackings count once the season is complete." : " Add it to the Full History sheet to make it permanent."}
      </span>
      <button
        type="button"
        onClick={download}
        className="ml-auto px-3 py-2 rounded-lg border-2 border-blue-200 bg-white hover:border-blue-400"
      >
        Download S{season} rows for the sheet
      </button>
    </div>
  );
}
