import { joinArchiveRowsToStats, toNumberOrNull } from "./statsJoinUtils";

const normalise = (value = "") =>
  String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const round = (value, digits = 2) => {
  const n = toNumberOrNull(value);
  if (n === null) return null;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
};

const average = (values = []) => {
  const nums = values.map(toNumberOrNull).filter((value) => value !== null);
  if (!nums.length) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
};

const pearson = (pairs = []) => {
  const cleaned = pairs
    .map(([x, y]) => [toNumberOrNull(x), toNumberOrNull(y)])
    .filter(([x, y]) => x !== null && y !== null);

  if (cleaned.length < 3) return null;

  const meanX = average(cleaned.map(([x]) => x));
  const meanY = average(cleaned.map(([, y]) => y));
  let numerator = 0;
  let xSq = 0;
  let ySq = 0;

  cleaned.forEach(([x, y]) => {
    const dx = x - meanX;
    const dy = y - meanY;
    numerator += dx * dy;
    xSq += dx * dx;
    ySq += dy * dy;
  });

  const denominator = Math.sqrt(xSq * ySq);
  if (!denominator) return null;

  return round(numerator / denominator, 3);
};

const getSeason = (row) => String(row.season || "").trim();
const getDivision = (row) => toNumberOrNull(row.division);
const getPosition = (row) => toNumberOrNull(row.position ?? row.finalPositionFromStats ?? row.finalPosition);
const getGlobalRank = (row) => {
  const division = getDivision(row);
  const position = getPosition(row);
  if (division === null || position === null) return null;
  return (division - 1) * 20 + position;
};
const getEtot = (row) => {
  const etot = toNumberOrNull(row.etot);
  return etot !== null && etot > 0 ? etot : null;
};
const getPva = (row) => toNumberOrNull(row.pva);
const getVa = (row) => toNumberOrNull(row.valueAdded);
const getClub = (row) => row.canonicalClub || row.team || row.club || "";

const isChampion = (row) => getPosition(row) === 1;
const isTopFour = (row) => getDivision(row) === 1 && getPosition(row) >= 1 && getPosition(row) <= 4;
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
const isPromotionContender = (row) => isAutoPromoted(row) || isPlayoffBand(row);
const isRelegated = (row) => {
  const division = getDivision(row);
  const position = getPosition(row);
  return division >= 1 && division <= 4 && position >= 17 && position <= 20;
};
const isAutoSacked = (row) => {
  const position = getPosition(row);
  return position >= 18 && position <= 20;
};

const etotBand = (etot) => {
  const n = toNumberOrNull(etot);
  if (n === null) return "Unknown";
  if (n < 84) return "<84";
  if (n >= 94) return "94+";
  const start = Math.floor(n / 2) * 2;
  return `${start}–${start + 1.99}`;
};

const bandSortValue = (band) => {
  if (band === "Unknown") return 999;
  if (band === "<84") return 0;
  if (band === "94+") return 94;
  return Number(String(band).split("–")[0]) || 0;
};

const pct = (part, total) => (total ? round((part / total) * 100, 1) : null);

const buildHonoursLong = (rows = [], winnerKey) =>
  rows.flatMap((row) => {
    const season = String(row.season || row.seas || row.s || "").trim();
    if (!season) return [];

    return Object.entries(row)
      .filter(([key, value]) => {
        const k = normalise(key);
        return value && k && k !== "season" && k !== "seas" && k !== "s";
      })
      .map(([competition, value]) => ({
        season,
        competition,
        competitionKey: normalise(competition),
        [winnerKey]: String(value || "").trim(),
      }));
  });

const classifyCompetition = (competition = "") => {
  const key = normalise(competition);
  if (key.includes("youth") && key.includes("shield")) return "Youth Shield";
  if (key.includes("youth") && key.includes("cup")) return "Youth Cup";
  if (key.includes("shield")) return "Shield";
  if (key.includes("cup")) return "Cup";
  if (key.includes("play") && key.includes("off")) return "Playoff";
  if (key.includes("division") || key.includes("league") || key.includes("title")) return "League";
  return competition || "Other";
};

const buildHonoursLookup = (clubHonours = [], managerHonours = []) => {
  const clubLong = buildHonoursLong(clubHonours, "club");
  const managerLong = buildHonoursLong(managerHonours, "manager");

  const clubBySeasonClub = new Map();
  clubLong.forEach((honour) => {
    const key = `${honour.season}|${normalise(honour.club)}`;
    if (!clubBySeasonClub.has(key)) clubBySeasonClub.set(key, []);
    clubBySeasonClub.get(key).push({
      ...honour,
      type: classifyCompetition(honour.competition),
    });
  });

  const managerBySeasonManager = new Map();
  managerLong.forEach((honour) => {
    const key = `${honour.season}|${normalise(honour.manager)}`;
    if (!managerBySeasonManager.has(key)) managerBySeasonManager.set(key, []);
    managerBySeasonManager.get(key).push({
      ...honour,
      type: classifyCompetition(honour.competition),
    });
  });

  return {
    clubLong,
    managerLong,
    clubBySeasonClub,
    managerBySeasonManager,
  };
};

const addHonoursToRows = (joinedRows = [], honoursLookup) =>
  joinedRows.map((row) => {
    const season = getSeason(row);
    const club = normalise(getClub(row));
    const clubHonours = honoursLookup.clubBySeasonClub.get(`${season}|${club}`) || [];
    const managerNames = String(row.manager || "")
      .split("/")
      .map(normalise)
      .filter(Boolean);
    const managerHonours = managerNames.flatMap(
      (manager) => honoursLookup.managerBySeasonManager.get(`${season}|${manager}`) || []
    );
    const honours = [...clubHonours, ...managerHonours];
    const honourTypes = [...new Set(honours.map((honour) => honour.type))];

    return {
      ...row,
      honours,
      honourTypes,
      hasHonour: honours.length > 0,
      hasCupHonour: honourTypes.some((type) => ["Cup", "Shield", "Youth Cup", "Youth Shield"].includes(type)),
      hasYouthHonour: honourTypes.some((type) => type.includes("Youth")),
    };
  });

const summarizeOutcomeBands = (rows = []) => {
  const byBand = new Map();

  rows.forEach((row) => {
    const etot = getEtot(row);
    if (etot === null) return;
    const band = etotBand(etot);
    if (!byBand.has(band)) {
      byBand.set(band, {
        band,
        samples: 0,
        etots: [],
        ranks: [],
        finishes: [],
        titles: 0,
        topFour: 0,
        promotionContenders: 0,
        relegations: 0,
        sackings: 0,
        cupHonours: 0,
        youthHonours: 0,
      });
    }

    const entry = byBand.get(band);
    entry.samples += 1;
    entry.etots.push(etot);
    entry.ranks.push(getGlobalRank(row));
    entry.finishes.push(getPosition(row));
    if (isChampion(row)) entry.titles += 1;
    if (isTopFour(row)) entry.topFour += 1;
    if (isPromotionContender(row)) entry.promotionContenders += 1;
    if (isRelegated(row)) entry.relegations += 1;
    if (isAutoSacked(row)) entry.sackings += 1;
    if (row.hasCupHonour) entry.cupHonours += 1;
    if (row.hasYouthHonour) entry.youthHonours += 1;
  });

  return [...byBand.values()]
    .map((entry) => ({
      ...entry,
      averageETOT: round(average(entry.etots), 2),
      averageRank: round(average(entry.ranks), 2),
      averageFinish: round(average(entry.finishes), 2),
      titleRate: pct(entry.titles, entry.samples),
      topFourRate: pct(entry.topFour, entry.samples),
      promotionRate: pct(entry.promotionContenders, entry.samples),
      relegationRate: pct(entry.relegations, entry.samples),
      sackingRate: pct(entry.sackings, entry.samples),
      cupHonourRate: pct(entry.cupHonours, entry.samples),
      youthHonourRate: pct(entry.youthHonours, entry.samples),
    }))
    .sort((a, b) => bandSortValue(a.band) - bandSortValue(b.band));
};

const summarizeTrophyEfficiency = (rows = []) => {
  const byManager = new Map();

  rows.forEach((row) => {
    const managers = String(row.manager || "")
      .split("/")
      .map((name) => String(name || "").trim())
      .filter(Boolean);
    if (!managers.length) return;

    managers.forEach((manager) => {
      if (!byManager.has(manager)) {
        byManager.set(manager, {
          manager,
          seasons: 0,
          etots: [],
          pvas: [],
          titles: 0,
          cupHonours: 0,
          youthHonours: 0,
          totalHonours: 0,
        });
      }

      const entry = byManager.get(manager);
      entry.seasons += 1;
      entry.etots.push(getEtot(row));
      entry.pvas.push(getPva(row));
      if (isChampion(row)) entry.titles += 1;
      if (row.hasCupHonour) entry.cupHonours += 1;
      if (row.hasYouthHonour) entry.youthHonours += 1;
      entry.totalHonours += row.honours?.length || 0;
    });
  });

  return [...byManager.values()]
    .map((entry) => {
      const avgETOT = round(average(entry.etots), 2);
      const avgPVA = round(average(entry.pvas), 3);
      const honourScore = entry.titles * 3 + entry.cupHonours * 2 + entry.youthHonours;
      return {
        ...entry,
        averageETOT: avgETOT,
        averagePVA: avgPVA,
        honourScore,
        honoursPerSeason: round(entry.totalHonours / entry.seasons, 3),
        trophyEfficiency: avgETOT ? round((honourScore / entry.seasons) / avgETOT, 4) : null,
      };
    })
    .filter((entry) => entry.seasons >= 3 && entry.honourScore > 0)
    .sort((a, b) => b.trophyEfficiency - a.trophyEfficiency || b.honourScore - a.honourScore)
    .slice(0, 20);
};

const summarizeCupSpecialists = (rows = []) => {
  const byManager = new Map();

  rows.forEach((row) => {
    const managers = String(row.manager || "")
      .split("/")
      .map((name) => String(name || "").trim())
      .filter(Boolean);
    if (!managers.length) return;

    managers.forEach((manager) => {
      if (!byManager.has(manager)) {
        byManager.set(manager, {
          manager,
          seasons: 0,
          leagueTitles: 0,
          cup: 0,
          shield: 0,
          youthCup: 0,
          youthShield: 0,
        });
      }

      const entry = byManager.get(manager);
      entry.seasons += 1;
      if (isChampion(row)) entry.leagueTitles += 1;
      (row.honourTypes || []).forEach((type) => {
        if (type === "Cup") entry.cup += 1;
        if (type === "Shield") entry.shield += 1;
        if (type === "Youth Cup") entry.youthCup += 1;
        if (type === "Youth Shield") entry.youthShield += 1;
      });
    });
  });

  return [...byManager.values()]
    .map((entry) => ({
      ...entry,
      cupTotal: entry.cup + entry.shield + entry.youthCup + entry.youthShield,
      youthTotal: entry.youthCup + entry.youthShield,
    }))
    .filter((entry) => entry.cupTotal > 0)
    .sort((a, b) => b.cupTotal - a.cupTotal || b.youthTotal - a.youthTotal || a.manager.localeCompare(b.manager))
    .slice(0, 20);
};

const summarizeCupHonoursByCompetition = (honoursLookup) => {
  const all = [...honoursLookup.clubLong, ...honoursLookup.managerLong].map((honour) => ({
    ...honour,
    type: classifyCompetition(honour.competition),
  }));
  const byType = new Map();

  all.forEach((honour) => {
    if (!byType.has(honour.type)) {
      byType.set(honour.type, { type: honour.type, honours: 0, seasons: new Set() });
    }
    const entry = byType.get(honour.type);
    entry.honours += 1;
    entry.seasons.add(honour.season);
  });

  return [...byType.values()]
    .map((entry) => ({ ...entry, seasons: entry.seasons.size }))
    .sort((a, b) => b.honours - a.honours || a.type.localeCompare(b.type));
};

export const buildSuccessEvidence = (archiveRows = [], statsRows = [], honours = {}) => {
  const { joinedRows } = joinArchiveRowsToStats(archiveRows, statsRows);
  const honoursLookup = buildHonoursLookup(honours.clubHonours || [], honours.managerHonours || []);
  const evidenceRows = addHonoursToRows(joinedRows, honoursLookup);
  const matchedRows = evidenceRows.filter((row) => getEtot(row) !== null);

  const correlations = [
    {
      id: "etot-rank",
      label: "ETOT vs global rank",
      value: pearson(matchedRows.map((row) => [getEtot(row), getGlobalRank(row)])),
      note: "Negative means stronger squads tend to finish higher in the whole Top 100 pyramid.",
    },
    {
      id: "etot-finish",
      label: "ETOT vs divisional finish",
      value: pearson(matchedRows.map((row) => [getEtot(row), getPosition(row)])),
      note: "Negative means stronger squads tend to finish nearer 1st within their division.",
    },
    {
      id: "etot-pva",
      label: "ETOT vs PVA",
      value: pearson(matchedRows.map((row) => [getEtot(row), getPva(row)])),
      note: "Shows whether strong squads also overperform, or whether PVA is spread across squad strengths.",
    },
    {
      id: "pva-rank",
      label: "PVA vs global rank",
      value: pearson(matchedRows.map((row) => [getPva(row), getGlobalRank(row)])),
      note: "Negative should be expected: better-than-expected seasons usually land higher.",
    },
    {
      id: "va-rank",
      label: "VA vs global rank",
      value: pearson(matchedRows.map((row) => [getVa(row), getGlobalRank(row)])),
      note: "Value added expressed against finishing rank rather than PVA weighting.",
    },
  ];

  const titleRows = matchedRows.filter(isChampion);
  const cupRows = matchedRows.filter((row) => row.hasCupHonour);
  const youthRows = matchedRows.filter((row) => row.hasYouthHonour);

  return {
    rowCount: evidenceRows.length,
    matchedRowCount: matchedRows.length,
    honoursRowCount: honoursLookup.clubLong.length + honoursLookup.managerLong.length,
    correlations,
    outcomeBands: summarizeOutcomeBands(matchedRows),
    trophyEfficiency: summarizeTrophyEfficiency(matchedRows),
    cupSpecialists: summarizeCupSpecialists(matchedRows),
    cupHonoursByCompetition: summarizeCupHonoursByCompetition(honoursLookup),
    headlineAverages: {
      allAverageETOT: round(average(matchedRows.map(getEtot)), 2),
      titleAverageETOT: round(average(titleRows.map(getEtot)), 2),
      cupAverageETOT: round(average(cupRows.map(getEtot)), 2),
      youthAverageETOT: round(average(youthRows.map(getEtot)), 2),
      allAveragePVA: round(average(matchedRows.map(getPva)), 3),
      titleAveragePVA: round(average(titleRows.map(getPva)), 3),
      cupAveragePVA: round(average(cupRows.map(getPva)), 3),
      youthAveragePVA: round(average(youthRows.map(getPva)), 3),
    },
  };
};
