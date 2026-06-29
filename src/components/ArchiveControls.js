import React from "react";
import { Search } from "lucide-react";

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
}) => (
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
      </div>
    )}
  </>
);

export default ArchiveControls;
