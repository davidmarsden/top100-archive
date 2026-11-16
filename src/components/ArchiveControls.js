import React, { useEffect, useRef } from "react";
import { Search, Download } from "lucide-react";
import { toFullHistoryCsv } from "../data/liveSeason";

const ArchiveControls = ({
  activeTab,
  searchTerm,
  setSearchTerm,
  dataLoaded,
  availableSeasons,
  selectedSeason,
  setSelectedSeason,
  availableDivisions,
  selectedDivision,
  setSelectedDivision,
  allPositionData = [],
  worldSlug = "top-100",
}) => {
  // The whole archive as a Full History sheet: for the sheet, or to keep.
  const downloadFullHistory = () => {
    const url = URL.createObjectURL(new Blob([toFullHistoryCsv(allPositionData)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${worldSlug}-full-history.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const hasInitialisedSeason = useRef(false);

  useEffect(() => {
    if (hasInitialisedSeason.current || availableSeasons.length === 0) return;

    const latestSeason = [...availableSeasons].sort(
      (a, b) => Number(b) - Number(a)
    )[0];

    if (latestSeason) {
      setSelectedSeason(latestSeason);
    }
    hasInitialisedSeason.current = true;
  }, [availableSeasons, setSelectedSeason]);

  return (
    <>
      {activeTab === "search" && (
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search teams or managers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
              disabled={!dataLoaded}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === "tables" && availableSeasons.length > 0 && (
        <div className="mb-6 flex gap-3 flex-wrap">
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white"
          >
            {availableSeasons.map((season) => (
              <option key={season} value={season}>
                Season {season}
              </option>
            ))}
          </select>
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white"
          >
            {availableDivisions.map((div) => (
              <option key={div} value={div}>
                Division {div}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={downloadFullHistory}
            disabled={!allPositionData.length}
            className="ml-auto inline-flex items-center gap-2 px-4 py-3 text-base border-2 border-gray-200 rounded-xl bg-white hover:border-blue-400 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Download full history (CSV)
          </button>
        </div>
      )}
    </>
  );
};

export default ArchiveControls;
