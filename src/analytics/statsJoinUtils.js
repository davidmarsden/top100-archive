import { buildCanonicalClubMap, canonicalClubName, normaliseClub } from "../data/clubNameUtils";
import { getEtotWithSource } from "./etotUtils";

export const toNumberOrNull = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export const normaliseSeason = (season) => {
  const match = String(season || "").match(/\d+/);
  return match ? Number(match[0]) : null;
};

export const normaliseDivision = (division) => {
  const match = String(division || "").match(/\d+/);
  return match ? Number(match[0]) : null;
};

export const buildArchiveClubNameMap = (archiveRows = []) => {
  const names = archiveRows
    .map((row) => row.team || row.club)
    .filter(Boolean);

  return buildCanonicalClubMap(names);
};

export const buildStatsRowKey = ({ season, division, club, team }, canonicalNameMap = null) => {
  const s = normaliseSeason(season);
  const d = normaliseDivision(division);
  const clubName = canonicalClubName(club || team || "", canonicalNameMap);
  const c = normaliseClub(clubName);

  if (!s || !d || !c) return "";
  return `${s}|${d}|${c}`;
};

export const buildStatsLookup = (statsRows = [], canonicalNameMap = null) => {
  const lookup = new Map();
  const duplicates = [];

  statsRows.forEach((row) => {
    const key = buildStatsRowKey(row, canonicalNameMap);
    if (!key) return;

    if (lookup.has(key)) duplicates.push({ key, existing: lookup.get(key), duplicate: row });
    lookup.set(key, row);
  });

  return { lookup, duplicates };
};

export const joinArchiveRowsToStats = (archiveRows = [], statsRows = []) => {
  const canonicalNameMap = buildArchiveClubNameMap(archiveRows);
  const { lookup, duplicates } = buildStatsLookup(statsRows, canonicalNameMap);

  const joinedRows = archiveRows.map((archiveRow) => {
    const key = buildStatsRowKey(archiveRow, canonicalNameMap);
    const statsRow = key ? lookup.get(key) || null : null;
    const { etot, etotSource, reconstructedEtot } = getEtotWithSource(statsRow || {});

    return {
      ...archiveRow,
      canonicalClub: canonicalClubName(archiveRow.team || archiveRow.club || "", canonicalNameMap),
      stats: statsRow,
      statsMatched: Boolean(statsRow),
      predictedPosition: toNumberOrNull(statsRow?.predictedPosition),
      finalPositionFromStats: toNumberOrNull(statsRow?.finalPosition),
      valueAdded: toNumberOrNull(statsRow?.valueAdded),
      pva: toNumberOrNull(statsRow?.pva),
      etot,
      etotSource,
      reconstructedEtot,
      gk: toNumberOrNull(statsRow?.gk),
      def: toNumberOrNull(statsRow?.def),
      mid: toNumberOrNull(statsRow?.mid),
      att: toNumberOrNull(statsRow?.att),
      average: toNumberOrNull(statsRow?.average),
      top18: toNumberOrNull(statsRow?.top18),
    };
  });

  const matchedCount = joinedRows.filter((row) => row.statsMatched).length;
  const unmatchedArchiveRows = joinedRows.filter((row) => !row.statsMatched);
  const reconstructedEtotCount = joinedRows.filter((row) => row.etotSource === "reconstructed").length;
  const publishedEtotCount = joinedRows.filter((row) => row.etotSource === "published").length;

  return {
    joinedRows,
    matchedCount,
    unmatchedArchiveRows,
    duplicateStatsRows: duplicates,
    matchRate: joinedRows.length ? matchedCount / joinedRows.length : 0,
    reconstructedEtotCount,
    publishedEtotCount,
  };
};
