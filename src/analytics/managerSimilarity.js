const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

const closeness = (a, b, scale) => clamp(1 - Math.abs(toNumber(a) - toNumber(b)) / scale);

const buildVector = (summary = {}) => ({
  averagePVA: toNumber(summary.averagePVA),
  averageVA: toNumber(summary.averageVA),
  netStrengthGain: toNumber(summary.netStrengthGain),
  averageFinish: toNumber(summary.averageFinish, 20),
  titles: toNumber(summary.titles),
  promotions: toNumber(summary.autoPromotions) + toNumber(summary.playoffFinishes),
  relegations: toNumber(summary.relegations),
  autoSackings: toNumber(summary.autoSackings),
  seasons: toNumber(summary.seasons),
  clubsManaged: toNumber(summary.clubsManaged),
});

export const calculateManagerSimilarity = (a, b) => {
  const left = buildVector(a);
  const right = buildVector(b);

  const weightedScores = [
    { weight: 24, score: closeness(left.averagePVA, right.averagePVA, 2.5) },
    { weight: 14, score: closeness(left.averageVA, right.averageVA, 7) },
    { weight: 20, score: closeness(left.netStrengthGain, right.netStrengthGain, 18) },
    { weight: 10, score: closeness(left.averageFinish, right.averageFinish, 10) },
    { weight: 8, score: closeness(left.titles, right.titles, 5) },
    { weight: 8, score: closeness(left.promotions, right.promotions, 8) },
    { weight: 6, score: closeness(left.relegations, right.relegations, 8) },
    { weight: 4, score: closeness(left.autoSackings, right.autoSackings, 6) },
    { weight: 4, score: closeness(left.seasons, right.seasons, 20) },
    { weight: 2, score: closeness(left.clubsManaged, right.clubsManaged, 8) },
  ];

  const totalWeight = weightedScores.reduce((sum, item) => sum + item.weight, 0);
  const score = weightedScores.reduce((sum, item) => sum + item.weight * item.score, 0) / totalWeight;

  return Math.round(score * 100);
};

export const getSimilarManagers = ({ targetSummary, allSummaries = [], limit = 5, minSeasons = 3 }) => {
  if (!targetSummary?.manager) return [];
  const targetName = String(targetSummary.manager).trim().toLowerCase();

  return allSummaries
    .filter((summary) => summary?.manager && String(summary.manager).trim().toLowerCase() !== targetName)
    .filter((summary) => toNumber(summary.seasons) >= minSeasons)
    .map((summary) => ({
      ...summary,
      similarity: calculateManagerSimilarity(targetSummary, summary),
    }))
    .sort((a, b) => b.similarity - a.similarity || b.seasons - a.seasons)
    .slice(0, limit);
};
