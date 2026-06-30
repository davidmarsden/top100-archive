const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const round = (value, digits = 2) => {
  const n = toFiniteNumber(value);
  if (n === null) return null;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
};

const average = (values = []) => {
  const nums = values.map(toFiniteNumber).filter((value) => value !== null);
  if (!nums.length) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
};

const getSeason = (row = {}) => toFiniteNumber(row.season) || 0;
const getEtot = (row = {}) => {
  const etot = toFiniteNumber(row.etot);
  return etot !== null && etot > 0 ? etot : null;
};
const getPva = (row = {}) => toFiniteNumber(row.pva);
const getVa = (row = {}) => toFiniteNumber(row.valueAdded);

const sortCareerRows = (rows = []) =>
  [...rows].sort((a, b) => getSeason(a) - getSeason(b) || Number(a.division || 0) - Number(b.division || 0));

const calculatePeakEtot = (careerRows = []) => {
  const values = careerRows.map(getEtot).filter((value) => value !== null);
  return values.length ? round(Math.max(...values), 2) : null;
};

const calculateCareerEtotImprovement = (careerRows = []) => {
  const matched = sortCareerRows(careerRows).filter((row) => getEtot(row) !== null);
  if (matched.length < 2) return null;
  return round(getEtot(matched[matched.length - 1]) - getEtot(matched[0]), 2);
};

const calculateBestFiveSeasonRun = (careerRows = []) => {
  const rows = sortCareerRows(careerRows).filter((row) => getPva(row) !== null);
  if (rows.length < 5) return null;

  let best = null;
  for (let index = 0; index <= rows.length - 5; index += 1) {
    const slice = rows.slice(index, index + 5);
    const value = average(slice.map(getPva));
    if (value === null) continue;

    if (!best || value > best.value) {
      best = {
        value,
        fromSeason: slice[0]?.season || null,
        toSeason: slice[slice.length - 1]?.season || null,
      };
    }
  }

  return best ? { ...best, value: round(best.value, 3) } : null;
};

const calculateWeakSquadSuccess = (careerRows = [], weakSquadThreshold) => {
  const weakRows = careerRows.filter((row) => {
    const etot = getEtot(row);
    const pva = getPva(row);
    return etot !== null && pva !== null && etot <= weakSquadThreshold;
  });

  if (!weakRows.length) {
    return {
      weakSquadSeasons: 0,
      weakSquadAveragePVA: null,
      weakSquadSuccessScore: null,
      weakSquadWins: 0,
    };
  }

  const weakSquadAveragePVA = round(average(weakRows.map(getPva)), 3);
  const weakSquadWins = weakRows.filter((row) => getVa(row) !== null && getVa(row) > 0).length;

  return {
    weakSquadSeasons: weakRows.length,
    weakSquadAveragePVA,
    weakSquadSuccessScore: round((weakSquadAveragePVA || 0) * Math.sqrt(weakRows.length), 3),
    weakSquadWins,
  };
};

const getGlobalWeakSquadThreshold = (summaries = []) => {
  const etots = summaries
    .flatMap((summary) => summary.careerRows || [])
    .map(getEtot)
    .filter((value) => value !== null)
    .sort((a, b) => a - b);

  if (!etots.length) return 0;
  return etots[Math.floor(etots.length * 0.4)] || etots[0];
};

export const RECRUITMENT_PRESETS = [
  { id: "overachievers", label: "Top Overachievers", metricLabel: "Avg PVA", metricKey: "averagePVA", digits: 3 },
  { id: "builders", label: "Top Builders", metricLabel: "Net ETOT", metricKey: "netStrengthGain", digits: 2 },
  { id: "winners", label: "Winners", metricLabel: "Titles", metricKey: "titles", digits: 0 },
  { id: "promotion-specialists", label: "Promotion Specialists", metricLabel: "Promotions", metricKey: "promotionCount", digits: 0 },
  { id: "one-club", label: "Best One-Club Managers", metricLabel: "Avg PVA", metricKey: "averagePVA", digits: 3 },
  { id: "journeymen", label: "Best Journeymen", metricLabel: "Avg PVA", metricKey: "averagePVA", digits: 3 },
  { id: "peak-etot", label: "Highest Peak ETOT", metricLabel: "Peak ETOT", metricKey: "peakETOT", digits: 2 },
  { id: "career-improvement", label: "Biggest Career Improvement", metricLabel: "ETOT Improvement", metricKey: "careerETOTImprovement", digits: 2 },
  { id: "weak-squad-success", label: "Wins With Weaker Squads", metricLabel: "Weak-Squad Score", metricKey: "weakSquadSuccessScore", digits: 3 },
  { id: "best-five-season-run", label: "Best Five-Season Run", metricLabel: "Best 5yr PVA", metricKey: "bestFiveSeasonRunValue", digits: 3 },
];

export const RECRUITMENT_FILTERS = [
  { id: "positive-pva", label: "Positive average PVA" },
  { id: "positive-etot", label: "Positive net ETOT" },
  { id: "one-club", label: "One-club managers" },
  { id: "journeymen", label: "Journeymen" },
  { id: "builders", label: "Builders" },
  { id: "winners", label: "Winners" },
  { id: "multiple-titles", label: "Multiple titles" },
  { id: "promotion-specialists", label: "Promotion specialists" },
];

export const buildRecruitmentAnalyticsRows = (summaries = []) => {
  const weakSquadThreshold = getGlobalWeakSquadThreshold(summaries);

  return summaries.map((summary) => {
    const careerRows = summary.careerRows || [];
    const promotionCount = Number(summary.autoPromotions || 0) + Number(summary.playoffFinishes || 0);
    const bestFiveSeasonRun = calculateBestFiveSeasonRun(careerRows);
    const weakSquad = calculateWeakSquadSuccess(careerRows, weakSquadThreshold);
    const clubsManaged = Number(summary.clubsManaged || 0);
    const netStrengthGain = toFiniteNumber(summary.netStrengthGain);
    const averagePVA = toFiniteNumber(summary.averagePVA);
    const titles = Number(summary.titles || 0);

    return {
      ...summary,
      manager: summary.manager,
      seasons: Number(summary.seasons || 0),
      statsMatched: Number(summary.statsMatched || 0),
      clubsManaged,
      averagePVA,
      averageVA: toFiniteNumber(summary.averageVA),
      averageETOT: toFiniteNumber(summary.averageETOT),
      netStrengthGain,
      peakETOT: calculatePeakEtot(careerRows),
      careerETOTImprovement: calculateCareerEtotImprovement(careerRows),
      promotionCount,
      titles,
      multipleTitles: titles >= 2,
      bestFiveSeasonRun,
      bestFiveSeasonRunValue: bestFiveSeasonRun?.value ?? null,
      oneClubManager: clubsManaged === 1,
      journeyman: clubsManaged >= 4,
      builder: netStrengthGain !== null && netStrengthGain > 0 && averagePVA !== null && averagePVA > 0,
      winner: titles > 0,
      promotionSpecialist: promotionCount >= 2,
      weakSquadThreshold,
      ...weakSquad,
    };
  });
};

export const applyRecruitmentFilters = (rows = [], options = {}) => {
  const {
    activePreset = "overachievers",
    activeFilters = [],
    minimumSeasons = 5,
    searchQuery = "",
  } = options;

  const filters = new Set(activeFilters);
  const preset = RECRUITMENT_PRESETS.find((item) => item.id === activePreset) || RECRUITMENT_PRESETS[0];
  const query = String(searchQuery || "").trim().toLowerCase();

  return rows
    .filter((row) => row.statsMatched >= minimumSeasons)
    .filter((row) => {
      if (query && !String(row.manager || "").toLowerCase().includes(query)) return false;
      if (activePreset === "builders" && !row.builder) return false;
      if (activePreset === "winners" && !row.winner) return false;
      if (activePreset === "promotion-specialists" && row.promotionCount <= 0) return false;
      if (activePreset === "one-club" && !row.oneClubManager) return false;
      if (activePreset === "journeymen" && !row.journeyman) return false;
      if (activePreset === "career-improvement" && row.careerETOTImprovement === null) return false;
      if (activePreset === "weak-squad-success" && row.weakSquadSuccessScore === null) return false;
      if (activePreset === "best-five-season-run" && row.bestFiveSeasonRunValue === null) return false;

      if (filters.has("positive-pva") && !(row.averagePVA > 0)) return false;
      if (filters.has("positive-etot") && !(row.netStrengthGain > 0)) return false;
      if (filters.has("one-club") && !row.oneClubManager) return false;
      if (filters.has("journeymen") && !row.journeyman) return false;
      if (filters.has("builders") && !row.builder) return false;
      if (filters.has("winners") && !row.winner) return false;
      if (filters.has("multiple-titles") && !row.multipleTitles) return false;
      if (filters.has("promotion-specialists") && !row.promotionSpecialist) return false;

      return true;
    })
    .sort((a, b) => {
      const aMetric = toFiniteNumber(a[preset.metricKey]);
      const bMetric = toFiniteNumber(b[preset.metricKey]);
      if (aMetric !== null || bMetric !== null) return (bMetric ?? -Infinity) - (aMetric ?? -Infinity);
      return (b.averagePVA ?? -Infinity) - (a.averagePVA ?? -Infinity);
    });
};
