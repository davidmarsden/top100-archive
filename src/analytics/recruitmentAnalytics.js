const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const valueOrNull = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const positiveNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const average = (values = []) => {
  const nums = values.map(Number).filter(Number.isFinite);
  if (!nums.length) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
};

const getPeakEtot = (summary = {}) => {
  const strengths = (summary.careerRows || [])
    .map((row) => positiveNumber(row.etot))
    .filter((value) => value !== null);
  return strengths.length ? Math.max(...strengths) : null;
};

const getBestSpellGain = (summary = {}) => {
  const gains = (summary.clubSpells || [])
    .map((spell) => valueOrNull(spell.netStrengthGain))
    .filter((value) => value !== null);
  return gains.length ? Math.max(...gains) : null;
};

const getCareerImprovement = (summary = {}) => {
  const rows = (summary.careerRows || []).filter((row) => positiveNumber(row.etot) !== null);
  if (rows.length < 2) return null;
  return positiveNumber(rows[rows.length - 1].etot) - positiveNumber(rows[0].etot);
};

const getBestFiveSeasonRun = (summary = {}) => {
  const rows = (summary.careerRows || []).filter((row) => Number.isFinite(Number(row.pva)));
  if (rows.length < 5) return null;

  let best = null;
  for (let i = 0; i <= rows.length - 5; i += 1) {
    const window = rows.slice(i, i + 5);
    const avgPva = average(window.map((row) => row.pva));
    if (avgPva === null) continue;
    if (!best || avgPva > best.avgPva) {
      best = {
        avgPva,
        fromSeason: window[0]?.season,
        toSeason: window[window.length - 1]?.season,
      };
    }
  }
  return best;
};

const getWeakSquadSuccessScore = (summary = {}) => {
  const rows = (summary.careerRows || []).filter(
    (row) => Number.isFinite(Number(row.pva)) && Number.isFinite(Number(row.etot))
  );
  const weakRows = rows.filter((row) => Number(row.etot) < 220);
  if (!weakRows.length) return null;
  return average(weakRows.map((row) => row.pva));
};

export const getPromotionCount = (summary = {}) => {
  // Clean Phase 3A rule: playoff qualifications are not promotions.
  // Playoff wins can be added later when Analytics is wired directly to honours data.
  return toNumber(summary.totalPromotions, toNumber(summary.autoPromotions));
};

export const enrichRecruitmentSummary = (summary = {}) => {
  const peakEtot = getPeakEtot(summary);
  const bestSpellGain = getBestSpellGain(summary);
  const careerImprovement = getCareerImprovement(summary);
  const bestFiveSeasonRun = getBestFiveSeasonRun(summary);
  const weakSquadSuccess = getWeakSquadSuccessScore(summary);
  const promotions = getPromotionCount(summary);

  return {
    ...summary,
    peakEtot,
    bestSpellGain,
    careerImprovement,
    bestFiveSeasonRun,
    weakSquadSuccess,
    promotions,
    isOneClubManager: toNumber(summary.clubsManaged) === 1,
    isJourneyman: toNumber(summary.clubsManaged) >= 4,
    isBuilder: toNumber(summary.netStrengthGain) > 0,
    isWinner: toNumber(summary.titles) > 0,
    isPromotionSpecialist: promotions >= 3,
    hasPositivePVA: toNumber(summary.averagePVA) > 0,
    hasPositiveNetEtot: toNumber(summary.netStrengthGain) > 0,
    hasMultipleTitles: toNumber(summary.titles) >= 2,
  };
};

export const RECRUITMENT_PRESETS = [
  {
    id: "overachievers",
    label: "Top Overachievers",
    description: "Who consistently beats expectations?",
    metricLabel: "Avg PVA",
    metricKey: "averagePVA",
    metricDigits: 3,
    signed: true,
    sort: (a, b) => toNumber(b.averagePVA) - toNumber(a.averagePVA),
  },
  {
    id: "builders",
    label: "Top Builders",
    description: "Who leaves clubs stronger?",
    metricLabel: "Net ETOT",
    metricKey: "netStrengthGain",
    metricDigits: 2,
    signed: true,
    filter: (row) => toNumber(row.netStrengthGain) > 0,
    sort: (a, b) => toNumber(b.netStrengthGain) - toNumber(a.netStrengthGain),
  },
  {
    id: "winners",
    label: "Winners",
    description: "Who turns squads into trophies?",
    metricLabel: "Titles",
    metricKey: "titles",
    metricDigits: 0,
    filter: (row) => toNumber(row.titles) > 0,
    sort: (a, b) => toNumber(b.titles) - toNumber(a.titles) || toNumber(b.averagePVA) - toNumber(a.averagePVA),
  },
  {
    id: "promotion",
    label: "Promotion Specialists",
    description: "Who moves clubs upward?",
    metricLabel: "Promotions",
    metricKey: "promotions",
    metricDigits: 0,
    filter: (row) => toNumber(row.promotions) > 0,
    sort: (a, b) => toNumber(b.promotions) - toNumber(a.promotions) || toNumber(b.averagePVA) - toNumber(a.averagePVA),
  },
  {
    id: "oneClub",
    label: "Best One-Club Managers",
    description: "Single-club specialists, ranked by PVA.",
    metricLabel: "Avg PVA",
    metricKey: "averagePVA",
    metricDigits: 3,
    signed: true,
    filter: (row) => row.isOneClubManager,
    sort: (a, b) => toNumber(b.averagePVA) - toNumber(a.averagePVA),
  },
  {
    id: "journeymen",
    label: "Best Journeymen",
    description: "Managers with four or more clubs.",
    metricLabel: "Avg PVA",
    metricKey: "averagePVA",
    metricDigits: 3,
    signed: true,
    filter: (row) => row.isJourneyman,
    sort: (a, b) => toNumber(b.averagePVA) - toNumber(a.averagePVA),
  },
  {
    id: "peakEtot",
    label: "Highest Peak ETOT",
    description: "Who built or managed the strongest squads?",
    metricLabel: "Peak ETOT",
    metricKey: "peakEtot",
    metricDigits: 2,
    filter: (row) => row.peakEtot !== null,
    sort: (a, b) => toNumber(b.peakEtot) - toNumber(a.peakEtot),
  },
  {
    id: "careerImprovement",
    label: "Biggest Career Improvement",
    description: "First known ETOT to latest known ETOT.",
    metricLabel: "Career ETOT",
    metricKey: "careerImprovement",
    metricDigits: 2,
    signed: true,
    filter: (row) => row.careerImprovement !== null,
    sort: (a, b) => toNumber(b.careerImprovement) - toNumber(a.careerImprovement),
  },
  {
    id: "weakSquads",
    label: "Wins With Weaker Squads",
    description: "Best PVA when ETOT is below 220.",
    metricLabel: "Weak-squad PVA",
    metricKey: "weakSquadSuccess",
    metricDigits: 3,
    signed: true,
    filter: (row) => row.weakSquadSuccess !== null,
    sort: (a, b) => toNumber(b.weakSquadSuccess) - toNumber(a.weakSquadSuccess),
  },
  {
    id: "fiveSeasonRun",
    label: "Best Five-Season Run",
    description: "Highest average PVA over any five-season stretch.",
    metricLabel: "5-season PVA",
    metricKey: "bestFiveSeasonRun.avgPva",
    metricDigits: 3,
    signed: true,
    filter: (row) => row.bestFiveSeasonRun?.avgPva !== undefined,
    sort: (a, b) => toNumber(b.bestFiveSeasonRun?.avgPva) - toNumber(a.bestFiveSeasonRun?.avgPva),
  },
];

export const getNestedMetric = (row, key) => {
  if (!key.includes(".")) return row[key];
  return key.split(".").reduce((value, part) => (value == null ? undefined : value[part]), row);
};
