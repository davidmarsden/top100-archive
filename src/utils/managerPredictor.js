// src/utils/managerPredictor.js

const norm = (value) =>
  (value ?? "")
    .toString()
    .normalize("NFKC")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const num = (value, fallback = null) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (value, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));

const round = (value, places = 1) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const getDivisionNumber = (row) => {
  const raw = row.division ?? row.Division ?? row.div ?? row.Div ?? "";
  const match = raw.toString().match(/\d+/);
  return match ? Number(match[0]) : null;
};

const getPositionNumber = (row) =>
  num(row.position ?? row.Position ?? row.pos ?? row.Pos ?? row.rank ?? row.Rank, null);

const getManagerName = (row) =>
  row.manager ?? row.Manager ?? row.managerName ?? row.ManagerName ?? "";

const getClubName = (row) =>
  row.club ?? row.Club ?? row.team ?? row.Team ?? "";

const getSeasonNumber = (row) => {
  const raw = row.season ?? row.Season ?? row.seasonNumber ?? row.SeasonNumber ?? "";
  const match = raw.toString().match(/\d+/);
  return match ? Number(match[0]) : null;
};

const splitManagers = (raw) => {
  const s = String(raw || "").trim();
  if (!s) return ["???"];
  const parts = s.split("/").map((x) => x.trim()).filter(Boolean);
  return parts.length > 1 ? [...parts, s] : parts;
};

const isPromotion = (row) => {
  const division = getDivisionNumber(row);
  const position = getPositionNumber(row);
  return division >= 2 && division <= 5 && position >= 1 && position <= 3;
};

const isRelegation = (row) => {
  const division = getDivisionNumber(row);
  const position = getPositionNumber(row);
  return division >= 1 && division <= 4 && position >= 17 && position <= 20;
};

const isTitle = (row) => getPositionNumber(row) === 1;

const isTopHalf = (row) => {
  const position = getPositionNumber(row);
  return position !== null && position <= 10;
};

const isBottomHalf = (row) => {
  const position = getPositionNumber(row);
  return position !== null && position >= 11;
};

const isMidTable = (row) => {
  const position = getPositionNumber(row);
  return position !== null && position >= 6 && position <= 15;
};

const isTitleContender = (row) => {
  const division = getDivisionNumber(row);
  const position = getPositionNumber(row);

  if (!position) return false;

  if (division === 1) return position >= 1 && position <= 3;
  return division >= 2 && division <= 5 && position >= 1 && position <= 3;
};

const isTopFourChallenger = (row) => {
  const division = getDivisionNumber(row);
  const position = getPositionNumber(row);

  if (!position) return false;

  if (division === 1) return position >= 1 && position <= 4;
  return division >= 2 && division <= 5 && position >= 4 && position <= 7;
};

const isComfortableTopTen = (row) => {
  const division = getDivisionNumber(row);
  const position = getPositionNumber(row);

  return division === 1 && position >= 5 && position <= 10;
};

const rate = (count, total) => (total ? (count / total) * 100 : 0);

const average = (values) => {
  const valid = values.filter((v) => Number.isFinite(v));
  if (!valid.length) return null;
  return valid.reduce((sum, v) => sum + v, 0) / valid.length;
};

const sortBySeason = (rows) =>
  [...rows].sort((a, b) => {
    const seasonA = getSeasonNumber(a) ?? 0;
    const seasonB = getSeasonNumber(b) ?? 0;
    return seasonA - seasonB;
  });

const getOutcomeLabel = (row) => {
  if (isTitle(row)) return "Title";
  if (isPromotion(row)) return "Promotion";
  if (isRelegation(row)) return "Relegation";
  if (isMidTable(row)) return "Mid-table";
  if (isTopHalf(row)) return "Top half";
  if (isBottomHalf(row)) return "Bottom half";
  return "Unknown";
};

const getBaselineRows = (allRows, latestRow) => {
  const division = getDivisionNumber(latestRow);
  const position = getPositionNumber(latestRow);

  if (!division || !position) return [];

  return allRows.filter((row) => {
    const rowDivision = getDivisionNumber(row);
    const rowPosition = getPositionNumber(row);

    return (
      rowDivision === division &&
      rowPosition !== null &&
      Math.abs(rowPosition - position) <= 3
    );
  });
};

const getOutcomeRates = (rows) => {
  const total = rows.length;

  return {
  total,
  promotion: rate(rows.filter(isPromotion).length, total),
  relegation: rate(rows.filter(isRelegation).length, total),
  title: rate(rows.filter(isTitle).length, total),
  titleContender: rate(rows.filter(isTitleContender).length, total),
  topFourChallenger: rate(rows.filter(isTopFourChallenger).length, total),
  comfortableTopTen: rate(rows.filter(isComfortableTopTen).length, total),
  topHalf: rate(rows.filter(isTopHalf).length, total),
  bottomHalf: rate(rows.filter(isBottomHalf).length, total),
  midTable: rate(rows.filter(isMidTable).length, total),
};
};

const getRecentFormScore = (rows) => {
  const recent = sortBySeason(rows).slice(-3);
  if (!recent.length) return 50;

  const scores = recent.map((row) => {
    const pos = getPositionNumber(row);
    if (!pos) return 50;
    return clamp(105 - pos * 5, 0, 100);
  });

  return average(scores) ?? 50;
};

const getAchievementBandScore = (row) => {
  const division = getDivisionNumber(row);
  const position = getPositionNumber(row);

  if (!division || !position) return 50;

  if (division === 1) {
    if (position === 1) return 100;
    if (position >= 2 && position <= 4) return 90;
    if (position >= 5 && position <= 8) return 80;
    if (position >= 9 && position <= 12) return 70;
    if (position >= 13 && position <= 16) return 55;
    if (position >= 17) return 15;
  }

  if (division >= 2 && division <= 5) {
    if (position === 1) return 95;
    if (position >= 2 && position <= 3) return 85;
    if (position >= 4 && position <= 7) return 75;
    if (position >= 8 && position <= 12) return 55;
    if (position >= 13 && position <= 16) return 35;
    if (position >= 17) return 10;
  }

  return 50;
};

const getTrendScore = (rows) => {
  const recent = sortBySeason(rows).slice(-5);
  if (recent.length < 4) return 0;

  const scored = recent.map(getAchievementBandScore);

  const early = average(scored.slice(0, 2));
  const late = average(scored.slice(-2));

  if (!Number.isFinite(early) || !Number.isFinite(late)) return 0;

  return clamp(late - early, -30, 30);
};


const getManagerDNA = (managerRows) => {
  const total = managerRows.length;
  const clubs = new Set(managerRows.map(getClubName).filter(Boolean));

  const promotions = managerRows.filter(isPromotion).length;
  const relegations = managerRows.filter(isRelegation).length;
  const titles = managerRows.filter(isTitle).length;
  const topHalf = managerRows.filter(isTopHalf).length;
  const midTable = managerRows.filter(isMidTable).length;

  const avgPosition = average(managerRows.map(getPositionNumber));

  const longestClubSpell = (() => {
    const sorted = sortBySeason(managerRows);
    let longest = 0;
    let current = 0;
    let previousClub = null;

    sorted.forEach((row) => {
      const club = getClubName(row);
      if (club && club === previousClub) {
        current += 1;
      } else {
        current = 1;
        previousClub = club;
      }
      longest = Math.max(longest, current);
    });

    return longest;
  })();

  return {
    trophyWinning: round(clamp(rate(titles, total), 0, 50) / 5),
    promotionAbility: round(clamp(rate(promotions, total), 0, 50) / 5),
    survivalInstinct: round(clamp(100 - rate(relegations, total), 0, 100) / 10),
    consistency: round(clamp(rate(midTable, total), 0, 100) / 10),
    overachievement: avgPosition ? round(clamp(12 - avgPosition, 0, 10)) : 0,
    loyalty: round(clamp(longestClubSpell, 0, 10)),
    cupSpecialist: 0,
    elitePerformance: round(clamp(rate(topHalf, total), 0, 100) / 10),
    clubsManaged: clubs.size,
  };
};

const getArchetype = (summary, dna) => {
  if (summary.titles >= 4) return "Dynasty Builder";
  if (dna.promotionAbility >= 7 && summary.promotions >= 3) return "Promotion Specialist";
  if (summary.promotions >= 2 && summary.relegations >= 2) return "Yo-Yo Manager";
  if (dna.survivalInstinct >= 8 && summary.relegations === 0) return "Survival Expert";
  if (dna.loyalty >= 7) return "Loyalist";
  if (summary.clubsManaged >= 6) return "Journeyman";
  if (summary.midTableRate >= 45) return "Mid-table Banker";
  if (summary.relegations >= 3) return "Chaos Merchant";
  if (dna.elitePerformance >= 8) return "Elite Operator";
  return "Balanced Operator";
};

const normalisePrediction = (prediction) => {
  const total =
    prediction.titleOrPromotion +
    prediction.playoffOrTopFour +
    prediction.midTable +
    prediction.relegationDanger;

  if (!total) {
    return {
      titleOrPromotion: 25,
      playoffOrTopFour: 25,
      midTable: 25,
      relegationDanger: 25,
    };
  }

  return {
    titleOrPromotion: round((prediction.titleOrPromotion / total) * 100),
    playoffOrTopFour: round((prediction.playoffOrTopFour / total) * 100),
    midTable: round((prediction.midTable / total) * 100),
    relegationDanger: round((prediction.relegationDanger / total) * 100),
  };
};

const buildManagerPrediction = (allRows, managerName) => {
  const target = norm(managerName);

  const managerRows = sortBySeason(
    allRows.filter((row) =>
      splitManagers(getManagerName(row)).some((manager) => norm(manager) === target)
    )
  );

  if (!managerRows.length) return null;

  const latestRow = managerRows[managerRows.length - 1];
  const baselineRows = getBaselineRows(allRows, latestRow);

  const managerRates = getOutcomeRates(managerRows);
  const baselineRates = getOutcomeRates(baselineRows);
  const recentForm = getRecentFormScore(managerRows);
  const trendScore = getTrendScore(managerRows);

  const clubs = new Set(managerRows.map(getClubName).filter(Boolean));
  const divisions = managerRows.map(getDivisionNumber).filter(Boolean);
  const positions = managerRows.map(getPositionNumber).filter(Boolean);

  const summary = {
    seasons: managerRows.length,
    clubsManaged: clubs.size,
    averageDivision: round(average(divisions) ?? 0),
    averagePosition: round(average(positions) ?? 0),
    bestFinish: positions.length ? Math.min(...positions) : null,
    worstFinish: positions.length ? Math.max(...positions) : null,
    promotions: managerRows.filter(isPromotion).length,
    relegations: managerRows.filter(isRelegation).length,
    titles: managerRows.filter(isTitle).length,
    promotionRate: round(managerRates.promotion),
    relegationRate: round(managerRates.relegation),
    titleRate: round(managerRates.title),
    topHalfRate: round(managerRates.topHalf),
    bottomHalfRate: round(managerRates.bottomHalf),
    midTableRate: round(managerRates.midTable),
  };

const legacyScore = clamp(
  summary.titles * 10 +
    summary.promotions * 4 +
    summary.seasons * 0.5 -
    summary.relegations * 3,
  0,
  100
);

const managerStatus = (() => {
  if (legacyScore >= 80) return "Legend";
  if (legacyScore >= 60) return "Elite";
  if (legacyScore >= 40) return "Top Level";
  if (legacyScore >= 20) return "Veteran";
  return "Progressive";
})();

const recentRates = getOutcomeRates(sortBySeason(managerRows).slice(-5));
const upwardTrend = Math.max(trendScore, 0);
const downwardTrend = Math.max(-trendScore, 0);

const rawPrediction = {
  titleOrPromotion:
  recentRates.titleContender * 0.55 +
  baselineRates.titleContender * 0.2 +
  managerRates.titleContender * 0.15 +
  upwardTrend * 0.1,

playoffOrTopFour:
  recentRates.topFourChallenger * 0.45 +
  recentRates.comfortableTopTen * 0.15 +
  baselineRates.topFourChallenger * 0.2 +
  managerRates.topFourChallenger * 0.1 +
  upwardTrend * 0.1,

  midTable:
    recentRates.midTable * 0.45 +
    baselineRates.midTable * 0.25 +
    managerRates.midTable * 0.2 +
    downwardTrend * 0.1,

  relegationDanger:
    recentRates.relegation * 0.45 +
    baselineRates.relegation * 0.25 +
    managerRates.relegation * 0.2 +
    downwardTrend * 0.1,
};
  const prediction = normalisePrediction(rawPrediction);
  const dna = getManagerDNA(managerRows);
  const archetype = getArchetype(summary, dna);

const summarySentence = (() => {
  const {
    titleOrPromotion,
    playoffOrTopFour,
    midTable,
    relegationDanger,
  } = prediction;

  if (managerStatus === "Legend" && recentForm < 70) {
    return `${managerName}'s recent form is mixed, but his long-term record marks him out as one of the great managers in Top 100 history. He remains dangerous despite the wobble.`;
  }

  if (managerStatus === "Elite" && recentForm < 70) {
    return `${managerName}'s recent results are uneven, but his wider record is too strong to dismiss. The model still sees a proven manager with upside.`;
  }

  if (titleOrPromotion >= 25) {
    return `${managerName} profiles as a genuine title contender, with recent results suggesting a serious challenge at the top end of the table.`;
  }

  if (playoffOrTopFour >= 25) {
    return `${managerName} profiles as a strong top-ten manager with realistic top-four upside.`;
  }

  if (playoffOrTopFour >= 18 && midTable >= 45) {
    return `${managerName} looks more like a comfortable top-ten candidate than a relegation risk, with an outside chance of pushing towards the top four.`;
  }

  if (midTable >= 50) {
    return `${managerName} currently profiles as a steady mid-table performer, unlikely to struggle but needing a jump to threaten the top four.`;
  }

  if (relegationDanger >= 35) {
    return `${managerName} carries a significant relegation risk based on recent and historical performance patterns.`;
  }

  return `${managerName} is difficult to predict, with several outcomes appearing plausible.`;
})();

  const receipts = managerRows.map((row) => ({
    season: getSeasonNumber(row),
    club: getClubName(row),
    division: getDivisionNumber(row),
    position: getPositionNumber(row),
    outcome: getOutcomeLabel(row),
  }));

  return {
    managerName,
    latest: {
      season: getSeasonNumber(latestRow),
      club: getClubName(latestRow),
      division: getDivisionNumber(latestRow),
      position: getPositionNumber(latestRow),
    },
    summary,
    managerRates,
    baselineRates,
    recentForm: round(recentForm),
    trendScore: round(trendScore),
legacyScore: round(legacyScore),
managerStatus,
    prediction,
    dna,
    archetype,
    summarySentence,
    receipts,
  };
};

export { buildManagerPrediction };