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

const getTrendScore = (rows) => {
  const recent = sortBySeason(rows)
    .slice(-5)
    .map((row) => getPositionNumber(row))
    .filter((pos) => Number.isFinite(pos));

  if (recent.length < 3) return 0;

  const firstHalf = average(recent.slice(0, Math.ceil(recent.length / 2)));
  const secondHalf = average(recent.slice(Math.floor(recent.length / 2)));

  if (!firstHalf || !secondHalf) return 0;

  // Positive means improving because lower league position is better.
  return clamp((firstHalf - secondHalf) * 10, -30, 30);
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

const recentRates = getOutcomeRates(sortBySeason(managerRows).slice(-5));

const rawPrediction = {
  titleOrPromotion:
    recentRates.promotion * 0.25 +
    baselineRates.promotion * 0.25 +
    managerRates.promotion * 0.15 +
    Math.max(trendScore, 0) * 0.35,

  playoffOrTopFour:
    recentRates.topHalf * 0.35 +
    baselineRates.topHalf * 0.25 +
    managerRates.topHalf * 0.15 +
    Math.max(trendScore, 0) * 0.25,

  midTable:
    recentRates.midTable * 0.45 +
    baselineRates.midTable * 0.25 +
    managerRates.midTable * 0.2 +
    Math.max(-trendScore, 0) * 0.1,

  relegationDanger:
    recentRates.relegation * 0.45 +
    baselineRates.relegation * 0.25 +
    managerRates.relegation * 0.2 +
    Math.max(-trendScore, 0) * 0.1,
};
  const prediction = normalisePrediction(rawPrediction);
  const dna = getManagerDNA(managerRows);
  const archetype = getArchetype(summary, dna);

  const summarySentence = (() => {
    const promotion = prediction.titleOrPromotion;
    const relegation = prediction.relegationDanger;
    const midTable = prediction.midTable;

    if (midTable > promotion && midTable > relegation) {
      return `Historical record suggests ${managerName} is more likely to record another mid-table season than win promotion or fall into serious relegation trouble.`;
    }

    if (relegation > promotion) {
      return `Historical record suggests ${managerName} carries more relegation risk than promotion momentum from this position.`;
    }

    if (promotion >= 35) {
      return `Historical record gives ${managerName} a credible promotion or title chance, although the model still expects a competitive season rather than a stroll.`;
    }

    return `Historical record suggests ${managerName} is difficult to call, with no single outcome dominating the profile.`;
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
    prediction,
    dna,
    archetype,
    summarySentence,
    receipts,
  };
};

export { buildManagerPrediction };