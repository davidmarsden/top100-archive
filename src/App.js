// src/App.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  BarChart3,
  Target,
  Trophy,
  Users,
  Loader,
  AlertCircle,
  Database,
} from "lucide-react";
import Charts from "./Charts";
import ManagerProfiles from "./ManagerProfiles";
import Winners from "./Winners";
import HistoryChartModal from "./components/HistoryChartModal";
import ArchiveNavigation from "./components/ArchiveNavigation";
import StatsImporter from "./StatsImporter";
import SearchTab from "./components/SearchTab";
import LeagueTableTab from "./components/LeagueTableTab";
import InsightsTab from "./components/InsightsTab";

/* =========================
   Helpers & Status Logic
   ========================= */
const numeric = (x) => (Number.isFinite(parseInt(x, 10)) ? parseInt(x, 10) : 0);

const isChampion = (pos) => parseInt(pos || 0, 10) === 1;
const isD1UCL = (div, pos) =>
  parseInt(div || 0, 10) === 1 && parseInt(pos || 0, 10) >= 2 && parseInt(pos || 0, 10) <= 4;
const isD1Shield = (div, pos) =>
  parseInt(div || 0, 10) === 1 && parseInt(pos || 0, 10) >= 5 && parseInt(pos || 0, 10) <= 10;
const isAutoPromo = (div, pos) => {
  const d = parseInt(div || 0, 10),
    p = parseInt(pos || 0, 10);
  return d >= 2 && d <= 5 && (p === 2 || p === 3);
};
const isPlayoffBand = (div, pos) => {
  const d = parseInt(div || 0, 10),
    p = parseInt(pos || 0, 10);
  return d >= 2 && d <= 5 && p >= 4 && p <= 7;
};
const isRelegated = (div, pos) => {
  const d = parseInt(div || 0, 10),
    p = parseInt(pos || 0, 10);
  return d >= 1 && d <= 4 && p >= 17 && p <= 20;
};
const isAutoSacked = (pos) => {
  const p = parseInt(pos || 0, 10);
  return p >= 18 && p <= 20;
};


const canonicalManagerName = (name) =>
  String(name || "").trim();  



  

// normalization for winners
const normDiv = (d) => {
  const m = String(d || "").match(/\d+/);
  return m ? m[0] : String(d || "").trim();
};
const normalizeName = (s) =>
  String(s || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(fc|cf|afc|sc|club)\b/gi, " ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const playoffWinnerKey = (season, division, team) =>
  `${String(season || "").trim()}|${normDiv(division)}|${normalizeName(team)}`;


// small UI helpers


const DataPlaceholder = () => (
  <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
    Loading data…
  </div>
);

// pill/tag helpers
const getTeamTags = (position, division, team, season, playoffWinnersSet) => {
  const tags = [];
  if (isChampion(position))
    tags.push({
      label: "Champions",
      style: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    });
  if (isD1UCL(division, position))
    tags.push({
      label: "SMFA Champions Cup",
      style: "bg-purple-100 text-purple-800 border border-purple-300",
    });
  if (isD1Shield(division, position))
    tags.push({
      label: "SMFA Shield",
      style: "bg-indigo-100 text-indigo-800 border border-indigo-300",
    });
  if (isAutoPromo(division, position))
    tags.push({
      label: "Auto-Promoted",
      style: "bg-green-100 text-green-800 border border-green-300",
    });
  if (isPlayoffBand(division, position))
    tags.push({
      label: "Playoffs",
      style: "bg-blue-100 text-blue-800 border border-blue-300",
    });
  if (isRelegated(division, position))
    tags.push({
      label: "Relegated",
      style: "bg-red-100 text-red-800 border border-red-300",
    });
  if (isAutoSacked(position))
    tags.push({
      label: "Auto-Sacked",
      style: "bg-rose-200 text-rose-900 border border-rose-400",
    });

  // playoff winner promoted (from winners sheet)
  if (playoffWinnersSet?.has(playoffWinnerKey(season, division, team))) {
    tags.push({
      label: "Playoff Winner (Promoted)",
      style: "bg-emerald-100 text-emerald-800 border border-emerald-300",
    });
  }

  return tags;
};

const getPositionBadge = (position, division, team, season, playoffWinnersSet) => {
  if (isAutoSacked(position)) return { bg: "bg-rose-600", text: "text-white", icon: "⛔" };
  if (isRelegated(division, position)) return { bg: "bg-red-600", text: "text-white", icon: "⬇️" };
  if (isChampion(position)) return { bg: "bg-yellow-500", text: "text-white", icon: "👑" };
  if (isAutoPromo(division, position)) return { bg: "bg-green-600", text: "text-white", icon: "⬆️" };
  if (isPlayoffBand(division, position) &&
    playoffWinnersSet?.has(playoffWinnerKey(season, division, team)))
    return { bg: "bg-green-600", text: "text-white", icon: "⬆️" };
  if (isD1UCL(division, position)) return { bg: "bg-purple-600", text: "text-white", icon: "🏆" };
  if (isD1Shield(division, position)) return { bg: "bg-indigo-600", text: "text-white", icon: "🛡️" };
  return { bg: "bg-gray-200", text: "text-gray-800", icon: "" };
};

const getRowStyling = (position, division) => {
  if (isChampion(position)) return "bg-yellow-50";
  if (isAutoPromo(division, position)) return "bg-green-50";
  if (isRelegated(division, position)) return "bg-red-50";
  if (isPlayoffBand(division, position)) return "bg-blue-50";
  if (isAutoSacked(position)) return "bg-rose-50";
  return "bg-white";
};

/* =========================
   Main component
   ========================= */
const Top100Archive = () => {
  // core UI state
  const [activeTab, setActiveTab] = useState("search");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("25");
  const [selectedDivision, setSelectedDivision] = useState("1");
  const [sortBy, setSortBy] = useState("position");
  const [allPositionData, setAllPositionData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showEventIcons, setShowEventIcons] = useState(true);
  const [historyChart, setHistoryChart] = useState(null);  
  const [comparisonManagers, setComparisonManagers] = useState([]);

  const buildClubTrajectory = (clubName) =>
  allPositionData
    .filter((r) => r.team === clubName)
    .sort((a, b) => Number(a.season) - Number(b.season))
    .map((r) => makeHistoryPoint(r));




        
  const openClubChart = (clubName) => {
    setHistoryChart({
      title: `${clubName} trajectory`,
      subtitle: "Overall Top 100 league rank by season",
      data: buildClubTrajectory(clubName),
    });
  };

const managerMatches = (rawManager, managerName) =>
  String(rawManager || "")
    .split("/")
    .map((m) => m.trim())
    .includes(managerName);

const buildManagerCareer = (managerName) => {
  let previousClub = null;

  return allPositionData
    .filter((r) => managerMatches(r.manager, managerName))
    .sort((a, b) => {
      const seasonDiff = Number(a.season) - Number(b.season);
      if (seasonDiff !== 0) return seasonDiff;

      const nextSeason = String(Number(a.season) + 1);

      const aContinuesNextSeason = allPositionData.some(
        (r2) =>
          String(r2.season) === nextSeason &&
          managerMatches(r2.manager, managerName) &&
          r2.team === a.team
      );

      const bContinuesNextSeason = allPositionData.some(
        (r2) =>
          String(r2.season) === nextSeason &&
          managerMatches(r2.manager, managerName) &&
          r2.team === b.team
      );

      if (aContinuesNextSeason && !bContinuesNextSeason) return 1;
      if (!aContinuesNextSeason && bContinuesNextSeason) return -1;

      return Number(a.division) - Number(b.division);
    })
    .map((r) => {
      const clubChanged = previousClub && previousClub !== r.team;
      

      previousClub = r.team;

      return makeHistoryPoint(r, {
  eventLabel: clubChanged ? r.team : "",
});
    });
};

const buildManagerSummary = (careerData) => {
  if (!careerData.length) return null;

  const clubs = [...new Set(careerData.map((r) => r.club))];
  const ranks = careerData.map((r) => r.globalRank).filter(Number.isFinite);

  return {
    seasons: careerData.length,
    clubs: clubs.length,
    clubList: clubs.join(", "),
    bestRank: Math.min(...ranks),
    worstRank: Math.max(...ranks),
    averageRank: Math.round(
      ranks.reduce((total, rank) => total + rank, 0) / ranks.length
    ),
    titles: careerData.filter((r) => r.labels.includes("Champions")).length,
    promotions: careerData.filter(
      (r) =>
        r.labels.includes("Auto-promoted") ||
        r.labels.includes("Playoff winners")
    ).length,
    relegations: careerData.filter((r) =>
      r.labels.includes("Relegated")
    ).length,
    sackings: careerData.filter((r) =>
      r.labels.includes("Auto-sacked")
    ).length,
  };
};

const openManagerChart = (managerName) => {
  const data = buildManagerCareer(managerName);

  setHistoryChart({
    title: `${managerName} career`,
    subtitle: "Manager career rank by season",
    data,
    summary: buildManagerSummary(data),
  });
};

const toggleComparisonManager = (managerName) => {
  setComparisonManagers((current) =>
    current.includes(managerName)
      ? current.filter((m) => m !== managerName)
      : [...current, managerName].slice(0, 4)
  );
};

const buildManagerComparison = (managerNames) => {
  const seasons = [...new Set(allPositionData.map((r) => `S${r.season}`))]
    .sort((a, b) => Number(a.replace("S", "")) - Number(b.replace("S", "")));

  return seasons.map((season) => {
    const row = { season };

    managerNames.forEach((managerName) => {
      const match = allPositionData.find(
        (r) =>
          managerMatches(r.manager, managerName) &&
          `S${r.season}` === season
      );

      if (match) {
        const rank =
          ((Number(match.division) - 1) * 20) + Number(match.position);

        row[managerName] = rank;
        row[`${managerName}_club`] = match.team;
        row[`${managerName}_division`] = Number(match.division);
        row[`${managerName}_position`] = Number(match.position);
        row[`${managerName}_points`] = Number(match.points);
        row[`${managerName}_labels`] = getHistoryLabels(match);
      }
    });

    return row;
  });
};

const openManagerComparisonChart = () => {
  setHistoryChart({
    title: "Manager comparison",
    subtitle: comparisonManagers.join(" vs "),
    data: buildManagerComparison(comparisonManagers),
    series: comparisonManagers.map((managerName) => ({
      dataKey: managerName,
      label: managerName,
    })),
  });
};



  // winners set
  const [playoffWinnersSet, setPlayoffWinnersSet] = useState(null);

const getHistoryLabels = (r) => {
  const labels = [];

  if (isChampion(r.position)) labels.push("Champions");
  if (isAutoPromo(r.division, r.position)) labels.push("Auto-promoted");

  if (
    isPlayoffBand(r.division, r.position) &&
    playoffWinnersSet?.has(playoffWinnerKey(r.season, r.division, r.team))
  ) {
    labels.push("Playoff winners");
  }

  if (isRelegated(r.division, r.position)) labels.push("Relegated");
  if (isAutoSacked(r.position)) labels.push("Auto-sacked");
  if (isD1UCL(r.division, r.position)) labels.push("SMFA Champions Cup");
  if (isD1Shield(r.division, r.position)) labels.push("SMFA Shield");

  return labels;
};

const makeHistoryPoint = (r, extra = {}) => ({
  season: `S${r.season}`,
  club: r.team,
  manager: r.manager,
  division: Number(r.division),
  position: Number(r.position),
  points: Number(r.points),
  played: Number(r.played),
  won: Number(r.won),
  drawn: Number(r.drawn),
  lost: Number(r.lost),
  goalDifference: Number(r.goal_difference),
  globalRank: ((Number(r.division) - 1) * 20) + Number(r.position),
  labels: getHistoryLabels(r),
  ...extra,
});


const buildMostClubsManaged = () => {
  const managerClubs = {};

  allPositionData.forEach((row) => {
    if (!row.manager || !row.team || !row.season) return;

    String(row.manager)
      .split("/")
      .map((name) => canonicalManagerName(name.trim()))
      .filter(Boolean)
      .forEach((managerName) => {
        if (!managerClubs[managerName]) {
          managerClubs[managerName] = {
            manager: managerName,
            clubs: new Set(),
            seasons: new Set(),
          };
        }

        managerClubs[managerName].clubs.add(row.team);
        managerClubs[managerName].seasons.add(String(row.season));
      });
  });

  return Object.values(managerClubs)
    .map((row) => ({
      manager: row.manager,
      clubCount: row.clubs.size,
      clubs: [...row.clubs].sort().join(", "),
      seasons: row.seasons.size,
    }))
    .sort((a, b) => {
      if (b.clubCount !== a.clubCount) return b.clubCount - a.clubCount;
      return b.seasons - a.seasons;
    });
};


  // hash -> tab sync
  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.replace("#", "");
      if (h) setActiveTab(h);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  // env
  const SHEET_ID = process.env.REACT_APP_SHEET_ID;
  const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
  const SHEET_RANGE = "Sorted by team!A:R";
  const WINNERS_SHEET_ID = process.env.REACT_APP_WINNERS_SHEET_ID;
  const WINNERS_CLUBS_RANGE = process.env.REACT_APP_WINNERS_CLUBS_RANGE || "Clubs!A:Z";
  const WINNERS_MANAGERS_RANGE =
  process.env.REACT_APP_WINNERS_MANAGERS_RANGE || "Managers!A:Z";

  /* =========================
     Load main league data
     ========================= */
  const loadFromGoogleSheets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        SHEET_ID
      )}/values/${encodeURIComponent(SHEET_RANGE)}?key=${encodeURIComponent(API_KEY)}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const data = await response.json();
      if (!data.values) throw new Error("No data returned");

// --- build a header index once
const [headerRow, ...rows] = data.values;
const H = headerRow.map(h => String(h || '').trim().toLowerCase());
const find = (...opts) => {
  for (const o of opts) {
    const i = H.indexOf(String(o).toLowerCase());
    if (i >= 0) return i;
  }
  return -1;
};
const get = (row, i) => (i == null || i < 0 ? '' : String(row[i] ?? '').trim());

// indices (robust to column shuffles / renames)
const iSeason     = find('season');
const iDivision   = find('division', 'div');
const iPosition   = find('position', 'pos');
const iTeam       = find('team', 'club');

const iPlayed     = find('p', 'played');
const iWon        = find('w', 'won');
const iDrawn      = find('d', 'drawn');
const iLost       = find('l', 'lost');
const iGF         = find('gf', 'goals for', 'goals_for');
const iGA         = find('ga', 'goals against', 'goals_against');
const iGD         = find('gd', 'goal difference', 'goal_difference');
const iPts        = find('pts', 'points');

// Start date split across two columns (month + year)
const iStartMonth = find('start month', 'month', 'start date (month)');
const iStartYear  = find('start year',  'year',  'start date (year)');

// Manager
const iManager    = find('manager', 'manager name');

const formatted = rows
  .filter(r => r && r.length)
  .map(row => {
    const startMonth = get(row, iStartMonth);
    const startYear  = get(row, iStartYear);
    const start_date = [startMonth, startYear].filter(Boolean).join(' '); // e.g., "Aug 15" or "Aug 2015"

    return {
      season:          get(row, iSeason),
      division:        get(row, iDivision),
      position:        get(row, iPosition),
      team:            get(row, iTeam),
      played:          get(row, iPlayed),
      won:             get(row, iWon),
      drawn:           get(row, iDrawn),
      lost:            get(row, iLost),
      goals_for:       get(row, iGF),
      goals_against:   get(row, iGA),
      goal_difference: get(row, iGD),
      points:          get(row, iPts),
      start_date,                        // ← composed from month + year
      manager:         get(row, iManager),
    };
  });

setAllPositionData(formatted);
setDataLoaded(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [API_KEY, SHEET_ID, SHEET_RANGE]);

  /* =========================
     Load playoff winners
     ========================= */
  const loadWinners = useCallback(async () => {
    if (!WINNERS_SHEET_ID || !API_KEY) return;
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        WINNERS_SHEET_ID
      )}/values/${encodeURIComponent(WINNERS_CLUBS_RANGE)}?key=${encodeURIComponent(API_KEY)}`;

      const res = await fetch(url);
      if (!res.ok) return;
      const json = await res.json();
      const values = json?.values || [];
      if (!values.length) return;

      const [headers, ...rows] = values;
      const hNorm = headers.map((h) => String(h || "").trim().toLowerCase());


      const ixSeason = hNorm.findIndex((h) => h === "season");
      if (ixSeason === -1) return;

      const playoffCols = hNorm
        .map((h, i) => ({ h, i }))
        .filter(({ h }) => /division\s*([2-5])\s*play-?off/.test(h));

      const set = new Set();
      for (const row of rows) {
        const season = row[ixSeason];
        if (!season) continue;
        for (const { h, i } of playoffCols) {
          const winner = row[i];
          if (!winner) continue;
          const m = /division\s*([2-5])\s*play-?off/.exec(h);
          const div = m ? m[1] : null;
          if (!div) continue;
          set.add(playoffWinnerKey(season, div, winner));
        }
      }
      setPlayoffWinnersSet(set);

const managersUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
  WINNERS_SHEET_ID
)}/values/${encodeURIComponent(WINNERS_MANAGERS_RANGE)}?key=${encodeURIComponent(API_KEY)}`;

const managersRes = await fetch(managersUrl);
if (managersRes.ok) {
  
  
}

    } catch {
      // fail-soft
    }
  }, [WINNERS_SHEET_ID, WINNERS_CLUBS_RANGE, WINNERS_MANAGERS_RANGE, API_KEY]);

  // kick off loads
  useEffect(() => {
    loadFromGoogleSheets();
    loadWinners();
  }, [loadFromGoogleSheets, loadWinners]);

/* =========================
     Derived lists & filters
     ========================= */
  const availableSeasons = useMemo(
    () =>
      [...new Set(allPositionData.map((r) => (r.season || "").trim()))]
        .filter(Boolean)
        .sort((a, b) => b.localeCompare(a)),
    [allPositionData]
  );

  const availableDivisions = useMemo(
    () =>
      [
        ...new Set(
          allPositionData
            .filter((r) => (r.season || "").trim() === (selectedSeason || "").trim())
            .map((r) => (r.division || "").trim())
        ),
      ]
        .filter(Boolean)
        .sort(),
    [allPositionData, selectedSeason]
  );

  const getFilteredData = useCallback(
    (season = null, division = null, sortOrder = "position") => {
      let filtered = [...allPositionData];
      if (season)
        filtered = filtered.filter((r) => (r.season || "").trim() === (season || "").trim());
      if (division)
        filtered = filtered.filter((r) => (r.division || "").trim() === (division || "").trim());

      switch (sortOrder) {
        case "points":
          return filtered.sort((a, b) => numeric(b.points) - numeric(a.points));
        case "team":
          return filtered.sort((a, b) => a.team.localeCompare(b.team));
        case "manager":
          return filtered.sort((a, b) => (a.manager || "").localeCompare(b.manager || ""));
        case "division":
          return filtered.sort((a, b) => {
            const d = parseInt(a.division || 0, 10) - parseInt(b.division || 0, 10);
            return d !== 0 ? d : parseInt(a.position || 0, 10) - parseInt(b.position || 0, 10);
          });
        case "position":
        default:
          return filtered.sort(
            (a, b) => parseInt(a.position || 0, 10) - parseInt(b.position || 0, 10)
          );
      }
    },
    [allPositionData]
  );

  /* =========================
     Leaders, Records, Thresholds
     ========================= */
  const countBy = (arr, keyGetter) => {
    const map = new Map();
    for (const item of arr) {
      const key = keyGetter(item);
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  };

  const leaders = useMemo(() => {
    const rowsTitles = allPositionData.filter((r) => isChampion(r.position));

    // promotions: auto + playoff winners
    const promos = [];
    for (const r of allPositionData) {
      if (isAutoPromo(r.division, r.position)) {
        promos.push(r);
        continue;
      }
      if (
        isPlayoffBand(r.division, r.position) &&
        playoffWinnersSet?.has(playoffWinnerKey(r.season, r.division, r.team))
      ) {
        promos.push(r);
      }
    }

    const rowsReleg = allPositionData.filter((r) => isRelegated(r.division, r.position));
    const rowsSack = allPositionData.filter((r) => isAutoSacked(r.position));

    const byTeam = {
      titles: countBy(rowsTitles, (r) => r.team),
      promotions: countBy(promos, (r) => r.team),
      relegations: countBy(rowsReleg, (r) => r.team),
      sackings: countBy(rowsSack, (r) => r.team),
    };
    const byManager = {
      titles: countBy(rowsTitles, (r) => r.manager),
      promotions: countBy(promos, (r) => r.manager),
      relegations: countBy(rowsReleg, (r) => r.manager),
      sackings: countBy(rowsSack, (r) => r.manager),
    };
    return { byTeam, byManager };
  }, [allPositionData, playoffWinnersSet]);

  const buildRecords = useCallback(
    (metric = "points", group = "team", order = "desc", seasonFilter, divisionFilter) => {
      const rows = getFilteredData(seasonFilter || null, divisionFilter || null, "position");
      const withMetric = rows.map((r) => ({
        ...r,
        value:
          metric === "points"
            ? numeric(r.points)
            : metric === "gf"
            ? numeric(r.goals_for)
            : metric === "ga"
            ? numeric(r.goals_against)
            : metric === "gd"
            ? numeric(r.goal_difference)
            : 0,
      }));
      withMetric.sort((a, b) => (order === "asc" ? a.value - b.value : b.value - a.value));

      const keyFn =
        group === "team"
          ? (r) => r.team
          : group === "manager"
          ? (r) => r.manager
          : group === "season"
          ? (r) => r.season
          : group === "division"
          ? (r) => r.division
          : group === "position"
          ? (r) => r.position
          : () => "";

      const seen = new Set();
      const result = [];
      for (const r of withMetric) {
        const k = keyFn(r);
        if (!k) continue;
        if (seen.has(k)) continue;
        seen.add(k);
        result.push(r);
        if (result.length >= 50) break;
      }
      return result;
    },
    [getFilteredData]
  );

  const computeThresholds = useMemo(() => {
    const bySeasonDiv = new Map();
    for (const r of allPositionData) {
      const season = (r.season || "").trim();
      const division = (r.division || "").trim();
      const key = `${season}|${division}`;
      if (!bySeasonDiv.has(key)) bySeasonDiv.set(key, []);
      bySeasonDiv.get(key).push(r);
    }

    const acc = {
      win: new Map(),
      autoPromo: new Map(),
      playoffs: new Map(),
      avoidReleg: new Map(),
      avoidSack: new Map(),
    };

    const push = (m, div, pts) => {
      const d = (div || "").trim();
      if (!d) return;
      const p = numeric(pts);
      if (!m.has(d)) m.set(d, []);
      m.get(d).push(p);
    };

    for (const [key, rows] of bySeasonDiv.entries()) {
      const [, div] = key.split("|");
      const d = parseInt(div || 0, 10);
      const byPos = new Map();
      for (const r of rows) byPos.set(parseInt(r.position || 0, 10), r);

      if (byPos.has(1)) push(acc.win, div, byPos.get(1).points);
      if (d >= 2 && d <= 5 && byPos.has(3)) push(acc.autoPromo, div, byPos.get(3).points);
      if (d >= 2 && d <= 5 && byPos.has(7)) push(acc.playoffs, div, byPos.get(7).points);
      if (d >= 1 && d <= 4 && byPos.has(16)) push(acc.avoidReleg, div, byPos.get(16).points);
      if (byPos.has(17)) push(acc.avoidSack, div, byPos.get(17).points);
    }

    const summarize = (m) => {
      const out = [];
      for (const [div, arr] of m.entries()) {
        if (!arr.length) continue;
        const min = Math.min(...arr);
        const max = Math.max(...arr);
        const avg = Math.round((arr.reduce((s, x) => s + x, 0) / arr.length) * 10) / 10;
        out.push({ division: div, min, avg, max, samples: arr.length });
      }
      return out.sort((a, b) => parseInt(a.division, 10) - parseInt(b.division, 10));
    };

    return {
      win: summarize(acc.win),
      autoPromo: summarize(acc.autoPromo),
      playoffs: summarize(acc.playoffs),
      avoidReleg: summarize(acc.avoidReleg),
      avoidSack: summarize(acc.avoidSack),
    };
  }, [allPositionData]);

  const thresholdHistory = useMemo(() => {
    const bySeasonDiv = new Map();
    for (const r of allPositionData) {
      const season = (r.season || "").trim();
      const division = (r.division || "").trim();
      if (!season || !division) continue;
      const key = `${season}|${division}`;
      if (!bySeasonDiv.has(key)) bySeasonDiv.set(key, []);
      bySeasonDiv.get(key).push(r);
    }
    const out = { win: [], autoPromo: [], playoffs: [], avoidReleg: [], avoidSack: [] };
    const push = (arr, season, division, posRow) => {
      if (!posRow) return;
      arr.push({ season, division, points: numeric(posRow.points) });
    };
    for (const [key, rows] of bySeasonDiv.entries()) {
      const [season, division] = key.split("|");
      const d = parseInt(division, 10);
      const byPos = new Map();
      rows.forEach((r) => byPos.set(parseInt(r.position || 0, 10), r));
      push(out.win, season, division, byPos.get(1));
      if (d >= 2 && d <= 5) push(out.autoPromo, season, division, byPos.get(3));
      if (d >= 2 && d <= 5) push(out.playoffs, season, division, byPos.get(7));
      if (d >= 1 && d <= 4) push(out.avoidReleg, season, division, byPos.get(16));
      push(out.avoidSack, season, division, byPos.get(17));
    }
    return out;
  }, [allPositionData]);

  /* =========================
     Inline UI Components
     ========================= */


  const [leadersView, setLeadersView] = useState("team");
  const [recordsMetric, setRecordsMetric] = useState("points");
  const [recordsGroup, setRecordsGroup] = useState("team");
  const [recordsOrder, setRecordsOrder] = useState("desc");
  const [recordsSeason, setRecordsSeason] = useState("");
  const [recordsDivision, setRecordsDivision] = useState("");

  const recordRows = useMemo(
    () =>
      buildRecords(
        recordsMetric,
        recordsGroup,
        recordsOrder,
        recordsSeason || null,
        recordsDivision || null
      ),
    [buildRecords, recordsMetric, recordsGroup, recordsOrder, recordsSeason, recordsDivision]
  );



  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-black text-pink-100 border-b-4 border-pink-300">
  <div className="absolute inset-0 bg-gradient-to-r from-black via-black to-[#e9a6ad]" />
  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_70%_40%,#f9a8d4_0,transparent_35%)]" />

  <div className="relative max-w-7xl mx-auto px-6 py-12">
    <div className="text-center">
      <div className="flex justify-center mb-6">
  <img
    src="https://anotherurl.wordpress.com/wp-content/uploads/2025/05/1000017272.png"
    alt="Top 100"
    className="h-28 md:h-36 drop-shadow-lg"
  />
</div>

<div
  className="absolute right-0 top-0 w-[700px] h-[700px] opacity-10"
  style={{
    backgroundImage: "url('/football-watermark.png')",
    backgroundRepeat: "no-repeat",
    backgroundSize: "contain",
  }}
/>

      <h1 className="text-5xl md:text-7xl font-black tracking-tight uppercase mb-6 text-[#f4c8d6]">
        FULL 27 SEASONS DATA ARCHIVE
      </h1>

      <div className="text-xl md:text-2xl text-[#f0b6be] mb-8">
  Soccer Manager Worlds Elite Community • Complete Historical Database
</div>

      {/* Status Indicator */}
      <div className="flex items-center justify-center gap-3 text-lg">
        {loading ? (
          <>
            <Loader className="w-5 h-5 animate-spin text-yellow-300" />
            <span className="text-pink-100">Loading historical data...</span>
          </>
        ) : error ? (
          <>
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-300">Database Error: {error}</span>
          </>
        ) : dataLoaded ? (
          <>
            <Database className="w-5 h-5 text-green-300" />
            <span className="text-green-300">✅ Live Database Connected</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-5 h-5 text-yellow-300" />
            <span className="text-yellow-300">⚙️ Setup Required</span>
          </>
        )}
      </div>
    </div>
  </div>
</div>

      {/* Navigation */}
<ArchiveNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

{/* Main Content */}
<div className="max-w-7xl mx-auto px-6 py-8">
  {/* Search input only on Search tab */}
  {activeTab === 'search' && (
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
            onClick={() => setSearchTerm('')}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )}

  {/* Season/Division selectors only on Tables tab */}
  {activeTab === 'tables' && availableSeasons.length > 0 && (
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


        {/* Content sections */}
        {activeTab === "search" &&
  (dataLoaded ? (
    <SearchTab
      allPositionData={allPositionData}
      searchTerm={searchTerm}
      numeric={numeric}
      getTeamTags={getTeamTags}
      getPositionBadge={getPositionBadge}
      getRowStyling={getRowStyling}
      playoffWinnersSet={playoffWinnersSet}
      comparisonManagers={comparisonManagers}
      openManagerComparisonChart={openManagerComparisonChart}
      setComparisonManagers={setComparisonManagers}
      openClubChart={openClubChart}
      openManagerChart={openManagerChart}
      toggleComparisonManager={toggleComparisonManager}
    />
  ) : (
    <DataPlaceholder />
  ))}
        {activeTab === "tables" &&
  (dataLoaded ? (
    <LeagueTableTab
      getFilteredData={getFilteredData}
      selectedSeason={selectedSeason}
      selectedDivision={selectedDivision}
      sortBy={sortBy}
      setSortBy={setSortBy}
      getTeamTags={getTeamTags}
      getPositionBadge={getPositionBadge}
      getRowStyling={getRowStyling}
      playoffWinnersSet={playoffWinnersSet}
      numeric={numeric}
    />
  ) : (
    <DataPlaceholder />
  ))}
        {activeTab === "insights" &&
  (dataLoaded ? (
    <InsightsTab
      buildMostClubsManaged={buildMostClubsManaged}
      leaders={leaders}
      leadersView={leadersView}
      setLeadersView={setLeadersView}
      recordsMetric={recordsMetric}
      setRecordsMetric={setRecordsMetric}
      recordsGroup={recordsGroup}
      setRecordsGroup={setRecordsGroup}
      recordsOrder={recordsOrder}
      setRecordsOrder={setRecordsOrder}
      recordsSeason={recordsSeason}
      setRecordsSeason={setRecordsSeason}
      recordsDivision={recordsDivision}
      setRecordsDivision={setRecordsDivision}
      availableSeasons={availableSeasons}
      recordRows={recordRows}
      computeThresholds={computeThresholds}
    />
  ) : (
    <DataPlaceholder />
  ))}
        {activeTab === "charts" &&
          (dataLoaded ? <Charts thresholdHistory={thresholdHistory} /> : <DataPlaceholder />)}
        {activeTab === "managers" &&
          (dataLoaded ? (
            <ManagerProfiles allPositionData={allPositionData} winnersSet={playoffWinnersSet} />
          ) : (
            <DataPlaceholder />
          ))}
      {activeTab === "honours" && <Winners />}
      {activeTab === "import" && <StatsImporter />}
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-slate-800 to-slate-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Trophy className="w-12 h-12 text-yellow-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">
              Soccer Manager Worlds Top 100
            </h3>
            <p className="text-gray-300 mb-6">
              Elite Community • Historical Database • 27 Seasons
            </p>
            <div className="mt-8 pt-6 border-t border-gray-700">
              <p className="text-sm text-gray-400">
                Built for the Soccer Manager Worlds Top 100 Community •
                <span className="text-blue-300">
                  {" "}
                  Professional Football Management
                </span>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>

    <HistoryChartModal
      isOpen={!!historyChart}
      onClose={() => setHistoryChart(null)}
      title={historyChart?.title}
      subtitle={historyChart?.subtitle}
      data={historyChart?.data || []}
      series={historyChart?.series}
      summary={historyChart?.summary}
      showEventIcons={showEventIcons}
      setShowEventIcons={setShowEventIcons}
    />
  </>
);
};

export default Top100Archive;