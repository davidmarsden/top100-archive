import React from "react";

// Shown while a season is being played: its table is live, so titles, promotions and
// sackings wait until every club has played 38. A finished season needs no banner: it
// stands as the record (from the sheet, or from Sync when the sheet does not have it).
export default function LiveSeasonBanner({ rows = [] }) {
  const live = rows.filter((row) => row.inProgress);
  if (!live.length) return null;

  const season = live[0].season;
  const played = Math.min(...live.map((row) => Number(row.played) || 0));

  return (
    <div className="mb-6 rounded-xl border-2 border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
      <strong>S{season} live table from Soccer Manager</strong> ({played} of 38 games played). Titles, promotions and
      sackings count once the season is complete.
    </div>
  );
}
