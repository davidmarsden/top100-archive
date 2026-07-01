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

const parseSeasonValue = (value) => {
  if (value && typeof value === "object") return parseSeasonValue(value.season);
  const direct = toFiniteNumber(value);
  if (direct !== null) return direct;
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const getSeason = (row = {}) => parseSeasonValue(row?.season ?? row);
const getPosition = (row = {}) => toFiniteNumber(row.position ?? row.finalPositionFromStats ?? row.finalPosition);
const getDivision = (row = {}) => toFiniteNumber(row.division);
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

const getCurrentSpell = (summary = {}) => {
  const spells = summary.clubSpells || [];
  if (!spells.length) return null;
  return [...spells].sort((a, b) => parseSeasonValue(b.lastSeason) - parseSeasonValue(a.lastSeason))[0] || null;
};

const calculateCurrentClubTrend = (spell) => {
  const rows = sortCareerRows(spell?.rows || []);
  if (!rows.length) return null;
  const first = rows[0];
  const last = rows[rows.length - 1];
  const firstPosition = getPosition(first);
  const lastPosition = getPosition(last);
  const firstDivision = getDivision(first);
  const lastDivision = getDivision(last);
  const firstRank = firstDivision && firstPosition ? (firstDivision - 1) * 20 + firstPosition : null;
  const lastRank = lastDivision && lastPosition ? (lastDivision - 1) * 20 + lastPosition : null;

  return {
    firstSeason: first?.season || null,
    lastSeason: last?.season || null,
    firstPosition,
    lastPosition,
    firstDivision,
    lastDivision,
    rankImprovement: firstRank !== null && lastRank !== null ? round(firstRank - lastRank, 2) : null,
    averagePVA: round(average(rows.map(getPva)), 3),
    averageVA: round(average(rows.map(getVa)), 2),
  };
};

const calculateEliteClubSeasons = (careerRows = []) =>
  careerRows.filter((row) => getDivision(row) === 1 || (getEtot(row) !== null && getEtot(row) >= 230)).length;

const scaled = (value, max, fallback = 0) => {
  const n = toFiniteNumber(value);
  if (n === null) return fallback;
  return Math.max(0, Math.min(100, (n / max) * 100));
};

const recommendationLabel = (score, eligible) => {
  if (!eligible) return "Not currently eligible";
  if (score >= 78) return "Strong recommendation";
  if (score >= 65) return "Recommended";
  if (score >= 50) return "Worth interviewing";
  if (score >= 35) return "Outside shortlist";
  return "Not recommended";
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

export const VACANCY_TYPES = [
  { id: "balanced", label: "Balanced appointment" },
  { id: "title", label: "Title challenge" },
  { id: "promotion", label: "Promotion push" },
  { id: "rebuild", label: "Rebuild / squad building" },
  { id: "survival", label: "Survival / stabilise" },
  { id: "cups", label: "Cup pedigree" },
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
    const currentSpell = getCurrentSpell(summary);
    const currentClubTrend = calculateCurrentClubTrend(currentSpell);
    const currentClubSeasons = Number(currentSpell?.seasons || 0);
    const currentClubProgress = toFiniteNumber(currentClubTrend?.rankImprovement);
    const eliteClubSeasons = calculateEliteClubSeasons(careerRows);

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
      currentClub: currentSpell?.club || null,
      currentClubSeasons,
      currentClubProgress,
      currentClubAveragePVA: currentClubTrend?.averagePVA ?? null,
      currentClubAverageVA: currentClubTrend?.averageVA ?? null,
      eliteClubSeasons,
      relegations: Number(summary.relegations || 0),
      autoSackings: Number(summary.autoSackings || 0),
      ...weakSquad,
    };
  });
};

export const buildRecruitmentReport = (row = {}, vacancyType = "balanced") => {
  const qualified = {
    currentSuccess: scaled((row.currentClubProgress || 0) + Math.max(0, (row.currentClubAveragePVA || 0) * 5), 35),
    expectationBeating: scaled(Math.max(0, row.averagePVA || 0), 2),
    squadBuilding: scaled(Math.max(0, row.netStrengthGain || 0), 15),
    promotions: scaled(row.promotionCount || 0, 5),
    trophies: scaled(row.titles || 0, 5),
    youthDevelopment: 0,
    weakSquadSuccess: scaled(Math.max(0, row.weakSquadSuccessScore || 0), 5),
  };

  const deserving = {
    currentClubTenure: scaled(row.currentClubSeasons || 0, 4),
    loyalty: scaled(Math.max(0, 5 - (row.clubsManaged || 0)), 5),
    experience: scaled(row.seasons || 0, 20),
    topClubExperience: scaled(row.eliteClubSeasons || 0, 8),
    cleanRecordProxy: Math.max(0, 100 - (row.autoSackings || 0) * 18 - (row.relegations || 0) * 8),
  };

  const manual = {
    transferMarket: null,
    newsfeed: null,
    blog: null,
    community: null,
    responsiveness: null,
    discipline: null,
  };

  const contextWeights = {
    balanced: { q: 0.6, d: 0.4, current: 1, trophies: 1, promotions: 1, building: 1, weak: 1 },
    title: { q: 0.7, d: 0.3, current: 1, trophies: 1.8, promotions: 0.6, building: 0.8, weak: 0.6 },
    promotion: { q: 0.65, d: 0.35, current: 1.1, trophies: 0.5, promotions: 1.8, building: 1, weak: 1.2 },
    rebuild: { q: 0.65, d: 0.35, current: 1.2, trophies: 0.4, promotions: 0.8, building: 2, weak: 1.2 },
    survival: { q: 0.55, d: 0.45, current: 1.2, trophies: 0.3, promotions: 0.8, building: 0.8, weak: 2 },
    cups: { q: 0.65, d: 0.35, current: 0.8, trophies: 2, promotions: 0.4, building: 0.7, weak: 0.8 },
  };

  const weights = contextWeights[vacancyType] || contextWeights.balanced;
  const qualifiedScore = round(
    average([
      qualified.currentSuccess * weights.current,
      qualified.expectationBeating,
      qualified.squadBuilding * weights.building,
      qualified.promotions * weights.promotions,
      qualified.trophies * weights.trophies,
      qualified.weakSquadSuccess * weights.weak,
    ]),
    1
  );
  const deservingScore = round(average(Object.values(deserving)), 1);
  const evidenceScore = round((qualifiedScore || 0) * weights.q + (deservingScore || 0) * weights.d, 1);
  const eligible = (row.currentClubSeasons || 0) > 1;

  return {
    manager: row.manager,
    currentClub: row.currentClub,
    currentClubSeasons: row.currentClubSeasons,
    eligible,
    recommendation: recommendationLabel(evidenceScore, eligible),
    evidenceScore,
    qualifiedScore,
    deservingScore,
    qualified,
    deserving,
    manual,
    notes: [
      eligible ? "Meets the usual current-club tenure threshold." : "Usually below shortlist threshold: one full season or less at current club.",
      row.autoSackings ? `${row.autoSackings} auto-sacking season(s) on record.` : "No auto-sacking seasons in the archive record.",
      row.relegations ? `${row.relegations} relegation-zone finish(es) on record.` : "No relegation-zone finishes in the archive record.",
      "Manual checks still needed for activity, responsiveness, transfer conduct and disciplinary issues.",
    ],
  };
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
