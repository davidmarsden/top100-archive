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

export const splitManagerNames = (manager = "") =>
  String(manager || "")
    .split("/")
    .map(cleanName)
    .filter(Boolean);

const rowHasManager = (row, managerName) => {
  const managerKey = normaliseName(managerName);
  return splitManagerNames(row.manager).some((name) => normaliseName(name) === managerKey);
};

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
const getSeason = (row) => normaliseSeason(row.season);
const getClub = (row) => row.canonicalClub || row.team || row.club || "Unknown";
const getKnownStrength = (row) => {
  const etot = toNumberOrNull(row.etot);
  return etot !== null && etot > 0 ? etot : null;
};

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

const sortCareerRows = (rows = []) =>
  [...rows].sort((a, b) => {
    const seasonDiff = getSeason(a) - getSeason(b);
    if (seasonDiff !== 0) return seasonDiff;
    return getDivision(a) - getDivision(b);
  });

export const getManagerCareerRows = (managerName, archiveRows = [], statsRows = []) => {
  const managerKey = normaliseName(managerName);
  if (!managerKey) return [];

  const { joinedRows } = joinArchiveRowsToStats(archiveRows, statsRows);

  return sortCareerRows(joinedRows.filter((row) => rowHasManager(row, managerName)));
};

const canContinueSpell = (spell, row) => {
  const season = getSeason(row);
  if (!season || !spell.lastSeasonNumber) return false;
  return season <= spell.lastSeasonNumber + 1;
};

const buildClubSpells = (careerRows = []) => {
  const spells = [];

  sortCareerRows(careerRows).forEach((row) => {
    const club = getClub(row);
    const season = getSeason(row);
    const existingSpell = [...spells]
      .reverse()
      .find((spell) => spell.club === club && canContinueSpell(spell, row));

    if (existingSpell) {
      existingSpell.rows.push(row);
      existingSpell.lastSeasonNumber = Math.max(existingSpell.lastSeasonNumber || season, season || 0);
    } else {
      spells.push({ club, rows: [row], lastSeasonNumber: season || null });
    }
  });

  return spells
    .map((spell) => {
      const rows = sortCareerRows(spell.rows);
      const matchedRows = rows.filter((row) => getKnownStrength(row) !== null);
      const first = matchedRows[0] || null;
      const last = matchedRows[matchedRows.length - 1] || null;
      const inheritedStrength = first ? getKnownStrength(first) : null;
      const lastStrength = last ? getKnownStrength(last) : null;

      return {
        club: spell.club,
        seasons: rows.length,
        firstSeason: rows[0]?.season || null,
        lastSeason: rows[rows.length - 1]?.season || null,
        firstKnownStrengthSeason: first?.season || null,
        lastKnownStrengthSeason: last?.season || null,
        rows,
        inheritedStrength,
        lastStrength,
        netStrengthGain:
          inheritedStrength !== null && lastStrength !== null ? round(lastStrength - inheritedStrength, 2) : null,
        highestStrength: round(
          matchedRows.reduce((max, row) => Math.max(max, getKnownStrength(row)), Number.NEGATIVE_INFINITY),
          2
        ),
      };
    })
    .map((spell) => ({
      ...spell,
      highestStrength: Number.isFinite(spell.highestStrength) ? spell.highestStrength : null,
    }))
    .sort((a, b) => normaliseSeason(a.firstSeason) - normaliseSeason(b.firstSeason));
};

export const getManagerCareerSummary = (managerName, archiveRows = [], statsRows = []) => {
  const careerRows = getManagerCareerRows(managerName, archiveRows, statsRows);
  const clubs = [...new Set(careerRows.map(getClub).filter(Boolean))];
  const statsRowsMatched = careerRows.filter((row) => row.statsMatched);
  const clubSpells = buildClubSpells(careerRows);
  const strengthGains = clubSpells
    .map((spell) => spell.netStrengthGain)
    .filter((value) => value !== null);

  return {
    manager: cleanName(managerName),
    seasons: careerRows.length,
    clubsManaged: clubs.length,
    clubs,
    careerRows,
    clubSpells,
    statsMatched: statsRowsMatched.length,
    statsMatchRate: careerRows.length ? statsRowsMatched.length / careerRows.length : 0,
    averageFinish: round(average(careerRows.map(getPosition)), 2),
    averageDivision: round(average(careerRows.map(getDivision)), 2),
    averageVA: round(average(careerRows.map((row) => row.valueAdded)), 2),
    averagePVA: round(average(careerRows.map((row) => row.pva)), 3),
    averageETOT: round(average(careerRows.map(getKnownStrength)), 2),
    averageTop18: round(average(careerRows.map((row) => row.top18)), 2),
    netStrengthGain: strengthGains.length
      ? round(strengthGains.reduce((sum, value) => sum + value, 0), 2)
      : null,
    averageSpellStrengthGain: round(average(strengthGains), 2),
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

export const getManagerValueAddedTable = (archiveRows = [], statsRows = [], options = {}) => {
  const { minMatchedSeasons = 5 } = options;
  const { joinedRows } = joinArchiveRowsToStats(archiveRows, statsRows);
  const byManager = new Map();

  joinedRows.forEach((row) => {
    splitManagerNames(row.manager).forEach((manager) => {
      if (!byManager.has(manager)) byManager.set(manager, []);
      byManager.get(manager).push(row);
    });
  });

  return [...byManager.entries()]
    .map(([manager, rows]) => {
      const sortedRows = sortCareerRows(rows);
      const matchedRows = sortedRows.filter((row) => row.statsMatched && toNumberOrNull(row.valueAdded) !== null);
      const clubSpells = buildClubSpells(sortedRows);
      const strengthGains = clubSpells
        .map((spell) => spell.netStrengthGain)
        .filter((value) => value !== null);

      return {
        manager,
        seasons: sortedRows.length,
        statsMatched: matchedRows.length,
        clubsManaged: new Set(sortedRows.map(getClub).filter(Boolean)).size,
        totalVA: round(
          matchedRows.reduce((sum, row) => sum + toNumberOrNull(row.valueAdded), 0),
          2
        ),
        averageVA: round(average(matchedRows.map((row) => row.valueAdded)), 2),
        averagePVA: round(average(matchedRows.map((row) => row.pva)), 3),
        averageETOT: round(average(matchedRows.map(getKnownStrength)), 2),
        netStrengthGain: strengthGains.length
          ? round(strengthGains.reduce((sum, value) => sum + value, 0), 2)
          : null,
        titles: countWhere(sortedRows, isChampion),
        promotions: countWhere(sortedRows, (row) => isAutoPromoted(row) || isPlayoffBand(row)),
        relegations: countWhere(sortedRows, isRelegated),
      };
    })
    .filter((row) => row.statsMatched >= minMatchedSeasons)
    .sort((a, b) => b.averageVA - a.averageVA || b.totalVA - a.totalVA);
};

export const getManagerOptions = (archiveRows = []) => {
  const byManager = new Map();

  archiveRows.forEach((row) => {
    splitManagerNames(row.manager).forEach((manager) => {
      if (!byManager.has(manager)) byManager.set(manager, { manager, seasons: 0, clubs: new Set() });
      const entry = byManager.get(manager);
      entry.seasons += 1;
      if (row.team || row.club) entry.clubs.add(row.team || row.club);
    });
  });

  return [...byManager.values()]
    .map((entry) => ({
      manager: entry.manager,
      seasons: entry.seasons,
      clubsManaged: entry.clubs.size,
    }))
    .sort((a, b) => a.manager.localeCompare(b.manager));
};
