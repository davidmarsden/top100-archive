import { joinArchiveRowsToStats, normaliseSeason, toNumberOrNull } from "./statsJoinUtils";

const cleanName = (name = "") => String(name || "").trim();

const normaliseName = (name = "") =>
  cleanName(name)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const average = (values = []) => {
  const nums = values.map(toNumberOrNull).filter((value) => value !== null);
  if (!nums.length) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
};

const round = (value, digits = 2) => {
  const n = toNumberOrNull(value);
  if (n === null) return null;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
};

const countWhere = (rows = [], predicate) => rows.filter(predicate).length;

const getPosition = (row) => toNumberOrNull(row.position ?? row.finalPositionFromStats ?? row.finalPosition);
const getDivision = (row) => toNumberOrNull(row.division);

const isChampion = (row) => getPosition(row) === 1;
const isAutoPromoted = (row) => {
  const division = getDivision(row);
  const position = getPosition(row);
  return division >= 2 && division <= 5 && (position === 2 || position === 3);
};
const isPlayoffBand = (row) => {
  const division = getDivision(row);
  const position = getPosition(row);
  return division >= 2 && division <= 5 && position >= 4 && position <= 7;
};
const isRelegated = (row) => {
  const division = getDivision(row);
  const position = getPosition(row);
  return division >= 1 && division <= 4 && position >= 17 && position <= 20;
};
const isAutoSacked = (row) => {
  const position = getPosition(row);
  return position >= 18 && position <= 20;
};

export const getManagerCareerRows = (managerName, archiveRows = [], statsRows = []) => {
  const managerKey = normaliseName(managerName);
  if (!managerKey) return [];

  const { joinedRows } = joinArchiveRowsToStats(archiveRows, statsRows);

  return joinedRows
    .filter((row) => normaliseName(row.manager) === managerKey)
    .sort((a, b) => {
      const seasonDiff = normaliseSeason(a.season) - normaliseSeason(b.season);
      if (seasonDiff !== 0) return seasonDiff;
      return getDivision(a) - getDivision(b);
    });
};

export const getManagerCareerSummary = (managerName, archiveRows = [], statsRows = []) => {
  const careerRows = getManagerCareerRows(managerName, archiveRows, statsRows);
  const clubs = [...new Set(careerRows.map((row) => row.canonicalClub || row.team || row.club).filter(Boolean))];
  const statsRowsMatched = careerRows.filter((row) => row.statsMatched);

  const firstStrength = statsRowsMatched.length ? toNumberOrNull(statsRowsMatched[0].etot) : null;
  const lastStrength = statsRowsMatched.length ? toNumberOrNull(statsRowsMatched[statsRowsMatched.length - 1].etot) : null;

  return {
    manager: cleanName(managerName),
    seasons: careerRows.length,
    clubsManaged: clubs.length,
    clubs,
    careerRows,
    statsMatched: statsRowsMatched.length,
    statsMatchRate: careerRows.length ? statsRowsMatched.length / careerRows.length : 0,
    averageFinish: round(average(careerRows.map(getPosition)), 2),
    averageDivision: round(average(careerRows.map(getDivision)), 2),
    averageVA: round(average(careerRows.map((row) => row.valueAdded)), 2),
    averagePVA: round(average(careerRows.map((row) => row.pva)), 3),
    averageETOT: round(average(careerRows.map((row) => row.etot)), 2),
    averageTop18: round(average(careerRows.map((row) => row.top18)), 2),
    inheritedStrength: firstStrength,
    leftStrength: lastStrength,
    netStrengthGain:
      firstStrength !== null && lastStrength !== null ? round(lastStrength - firstStrength, 2) : null,
    titles: countWhere(careerRows, isChampion),
    autoPromotions: countWhere(careerRows, isAutoPromoted),
    playoffFinishes: countWhere(careerRows, isPlayoffBand),
    relegations: countWhere(careerRows, isRelegated),
    autoSackings: countWhere(careerRows, isAutoSacked),
    bestVA: careerRows.reduce((best, row) => {
      if (toNumberOrNull(row.valueAdded) === null) return best;
      if (!best || row.valueAdded > best.valueAdded) return row;
      return best;
    }, null),
    worstVA: careerRows.reduce((worst, row) => {
      if (toNumberOrNull(row.valueAdded) === null) return worst;
      if (!worst || row.valueAdded < worst.valueAdded) return row;
      return worst;
    }, null),
  };
};

export const getManagerValueAddedTable = (archiveRows = [], statsRows = []) => {
  const { joinedRows } = joinArchiveRowsToStats(archiveRows, statsRows);
  const byManager = new Map();

  joinedRows.forEach((row) => {
    const manager = cleanName(row.manager) || "Unknown";
    if (!byManager.has(manager)) byManager.set(manager, []);
    byManager.get(manager).push(row);
  });

  return [...byManager.entries()]
    .map(([manager, rows]) => {
      const matchedRows = rows.filter((row) => row.statsMatched && toNumberOrNull(row.valueAdded) !== null);
      return {
        manager,
        seasons: rows.length,
        statsMatched: matchedRows.length,
        clubsManaged: new Set(rows.map((row) => row.canonicalClub || row.team || row.club).filter(Boolean)).size,
        totalVA: round(
          matchedRows.reduce((sum, row) => sum + toNumberOrNull(row.valueAdded), 0),
          2
        ),
        averageVA: round(average(matchedRows.map((row) => row.valueAdded)), 2),
        averagePVA: round(average(matchedRows.map((row) => row.pva)), 3),
        averageETOT: round(average(matchedRows.map((row) => row.etot)), 2),
        titles: countWhere(rows, isChampion),
        promotions: countWhere(rows, (row) => isAutoPromoted(row) || isPlayoffBand(row)),
        relegations: countWhere(rows, isRelegated),
      };
    })
    .filter((row) => row.statsMatched > 0)
    .sort((a, b) => b.averageVA - a.averageVA || b.totalVA - a.totalVA);
};
