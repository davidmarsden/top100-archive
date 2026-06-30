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
  return denominator ? round(numerator / denominator, 3) : null;
};

const getSeason = (row) => String(row.season || "").trim();
const getDivision = (row) => toNumberOrNull(row.division);
const getPosition = (row) => toNumberOrNull(row.position ?? row.finalPositionFromStats ?? row.finalPosition);
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

const pct = (part, total) => (total ? round((part / total) * 100, 1) : null);

const etotBand = (etot, width = 10) => {
  const n = toNumberOrNull(etot);
  if (n === null) return "Unknown";
  const start = Math.floor(n / width) * width;
  return `${start}-${start + width - 1}`;
};

const bandSortValue = (band) => {
  if (band === "Unknown") return 9999;
  return Number(String(band).split("-")[0]) || 0;
};

const competitionFamily = (competition = "") => {
  const key = normalise(competition);

  if (key.includes("youth")) return "Youth";
  if (key.includes("smfa") || key.includes("champions cup") || key.includes("champions league")) return "European";
  if (key.includes("world club")) return "World";
  if (key.includes("top 100") && (key.includes("cup") || key.includes("shield"))) return "Domestic";
  if (key.includes("play") && key.includes("off")) return "Playoff";
  if (key.includes("division") || key.includes("league") || key.includes("title")) return "League";
  if (key.includes("cup") || key.includes("shield")) return "Other Cups";
  return "Other";
};

const competitionType = (competition = "") => {
  const key = normalise(competition);
  if (key.includes("shield")) return "Shield";
  if (key.includes("cup")) return "Cup";
  if (key.includes("play") && key.includes("off")) return "Playoff";
  if (key.includes("division") || key.includes("league") || key.includes("title")) return "League";
  return "Other";
};

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
        family: competitionFamily(competition),
        type: competitionType(competition),
        [winnerKey]: String(value || "").trim(),
      }));
  });

const buildHonoursLookup = (clubHonours = [], managerHonours = []) => {
  const clubLong = buildHonoursLong(clubHonours, "club");
  const managerLong = buildHonoursLong(managerHonours, "manager");

  const clubBySeasonClub = new Map();
  clubLong.forEach((honour) => {
    const key = `${honour.season}|${normalise(honour.club)}`;
    if (!clubBySeasonClub.has(key)) clubBySeasonClub.set(key, []);
    clubBySeasonClub.get(key).push(honour);
  });

  const managerBySeasonManager = new Map();
  managerLong.forEach((honour) => {
    const key = `${honour.season}|${normalise(honour.manager)}`;
    if (!managerBySeasonManager.has(key)) managerBySeasonManager.set(key, []);
    managerBySeasonManager.get(key).push(honour);
  });

  return { clubLong, managerLong, clubBySeasonClub, managerBySeasonManager };
};

const addHonoursToRows = (joinedRows = [], honoursLookup) =>
  joinedRows.map((row) => {
    const season = getSeason(row);
    const clubHonours = honoursLookup.clubBySeasonClub.get(`${season}|${normalise(getClub(row))}`) || [];
    const managerHonours = String(row.manager || "")
      .split("/")
      .map(normalise)
      .filter(Boolean)
      .flatMap((manager) => honoursLookup.managerBySeasonManager.get(`${season}|${manager}`) || []);

    const honours = [...clubHonours, ...managerHonours];
    const honourFamilies = [...new Set(honours.map((honour) => honour.family))];

    return {
      ...row,
      honours,
      honourFamilies,
      hasHonour: honours.length > 0,
      hasEuropeanHonour: honourFamilies.includes("European"),
      hasWorldHonour: honourFamilies.includes("World"),
      hasDomesticHonour: honourFamilies.includes("Domestic"),
      hasYouthHonour: honourFamilies.includes("Youth"),
      hasCupHonour: honourFamilies.some((family) => ["European", "World", "Domestic", "Youth", "Other Cups"].includes(family)),
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
        finishes: [],
        titles: 0,
        topFour: 0,
        promotionContenders: 0,
        relegations: 0,
        sackings: 0,
        europeanHonours: 0,
        worldHonours: 0,
        domesticHonours: 0,
        youthHonours: 0,
      });
    }

    const entry = byBand.get(band);
    entry.samples += 1;
    entry.etots.push(etot);
    entry.finishes.push(getPosition(row));
    if (isChampion(row)) entry.titles += 1;
    if (isTopFour(row)) entry.topFour += 1;
    if (isPromotionContender(row)) entry.promotionContenders += 1;
    if (isRelegated(row)) entry.relegations += 1;
    if (isAutoSacked(row)) entry.sackings += 1;
    if (row.hasEuropeanHonour) entry.europeanHonours += 1;
    if (row.hasWorldHonour) entry.worldHonours += 1;
    if (row.hasDomesticHonour) entry.domesticHonours += 1;
    if (row.hasYouthHonour) entry.youthHonours += 1;
  });

  return [...byBand.values()]
    .map((entry) => ({
      ...entry,
      averageETOT: round(average(entry.etots), 2),
      averageFinish: round(average(entry.finishes), 2),
      titleRate: pct(entry.titles, entry.samples),
      topFourRate: pct(entry.topFour, entry.samples),
      promotionRate: pct(entry.promotionContenders, entry.samples),
      relegationRate: pct(entry.relegations, entry.samples),
      sackingRate: pct(entry.sackings, entry.samples),
      europeanRate: pct(entry.europeanHonours, entry.samples),
      worldRate: pct(entry.worldHonours, entry.samples),
      domesticRate: pct(entry.domesticHonours, entry.samples),
      youthRate: pct(entry.youthHonours, entry.samples),
    }))
    .sort((a, b) => bandSortValue(a.band) - bandSortValue(b.band));
};

const honourWeight = (honour) => {
  if (honour.family === "League") return 3;
  if (honour.family === "European") return 3;
  if (honour.family === "World") return 3;
  if (honour.family === "Domestic") return 2;
  if (honour.family === "Youth") return 1;
  if (honour.family === "Other Cups") return 1;
  return 0;
};

const summarizeTrophyConversion = (rows = []) => {
  const byManager = new Map();

  rows.forEach((row) => {
    String(row.manager || "")
      .split("/")
      .map((name) => String(name || "").trim())
      .filter(Boolean)
      .forEach((manager) => {
        if (!byManager.has(manager)) {
          byManager.set(manager, {
            manager,
            seasons: 0,
            etots: [],
            pvas: [],
            leagueTitles: 0,
            european: 0,
            world: 0,
            domestic: 0,
            youth: 0,
            otherCups: 0,
            honourScore: 0,
          });
        }

        const entry = byManager.get(manager);
        entry.seasons += 1;
        entry.etots.push(getEtot(row));
        entry.pvas.push(getPva(row));
        if (isChampion(row)) {
          entry.leagueTitles += 1;
          entry.honourScore += 3;
        }
        (row.honours || []).forEach((honour) => {
          if (honour.family === "European") entry.european += 1;
          if (honour.family === "World") entry.world += 1;
          if (honour.family === "Domestic") entry.domestic += 1;
          if (honour.family === "Youth") entry.youth += 1;
          if (honour.family === "Other Cups") entry.otherCups += 1;
          entry.honourScore += honourWeight(honour);
        });
      });
  });

  return [...byManager.values()]
    .map((entry) => {
      const averageETOT = round(average(entry.etots), 2);
      const scorePerSeason = entry.seasons ? round(entry.honourScore / entry.seasons, 3) : null;
      return {
        ...entry,
        averageETOT,
        averagePVA: round(average(entry.pvas), 3),
        scorePerSeason,
        trophyConversion: averageETOT ? round(scorePerSeason / averageETOT, 5) : null,
      };
    })
    .filter((entry) => entry.seasons >= 3)
    .sort((a, b) => b.trophyConversion - a.trophyConversion || b.honourScore - a.honourScore);
};

const summarizeCupFamilies = (rows = []) => {
  const byManager = new Map();

  rows.forEach((row) => {
    String(row.manager || "")
      .split("/")
      .map((name) => String(name || "").trim())
      .filter(Boolean)
      .forEach((manager) => {
        if (!byManager.has(manager)) {
          byManager.set(manager, { manager, european: 0, world: 0, domestic: 0, youth: 0, otherCups: 0 });
        }
        const entry = byManager.get(manager);
        (row.honours || []).forEach((honour) => {
          if (honour.family === "European") entry.european += 1;
          if (honour.family === "World") entry.world += 1;
          if (honour.family === "Domestic") entry.domestic += 1;
          if (honour.family === "Youth") entry.youth += 1;
          if (honour.family === "Other Cups") entry.otherCups += 1;
        });
      });
  });

  return [...byManager.values()]
    .map((entry) => ({ ...entry, total: entry.european + entry.world + entry.domestic + entry.youth + entry.otherCups }))
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total || b.youth - a.youth || a.manager.localeCompare(b.manager));
};

const summarizeHonoursCoverage = (honoursLookup) => {
  const all = [...honoursLookup.clubLong, ...honoursLookup.managerLong];
  const byFamily = new Map();

  all.forEach((honour) => {
    if (!byFamily.has(honour.family)) byFamily.set(honour.family, { family: honour.family, records: 0, seasons: new Set() });
    const entry = byFamily.get(honour.family);
    entry.records += 1;
    entry.seasons.add(honour.season);
  });

  return [...byFamily.values()]
    .map((entry) => ({ ...entry, seasons: entry.seasons.size }))
    .sort((a, b) => b.records - a.records || a.family.localeCompare(b.family));
};

export const buildSuccessEvidence = (archiveRows = [], statsRows = [], honours = {}) => {
  const { joinedRows } = joinArchiveRowsToStats(archiveRows, statsRows);
  const honoursLookup = buildHonoursLookup(honours.clubHonours || [], honours.managerHonours || []);
  const evidenceRows = addHonoursToRows(joinedRows, honoursLookup);
  const matchedRows = evidenceRows.filter((row) => getEtot(row) !== null);

  const titleRows = matchedRows.filter(isChampion);
  const cupRows = matchedRows.filter((row) => row.hasCupHonour);
  const youthRows = matchedRows.filter((row) => row.hasYouthHonour);

  return {
    rowCount: evidenceRows.length,
    matchedRowCount: matchedRows.length,
    honoursRowCount: honoursLookup.clubLong.length + honoursLookup.managerLong.length,
    correlations: [
      {
        id: "etot-finish",
        label: "ETOT vs divisional finish",
        value: pearson(matchedRows.map((row) => [getEtot(row), getPosition(row)])),
        note: "Negative means stronger squads tend to finish nearer 1st within their own division.",
      },
      {
        id: "pva-finish",
        label: "PVA vs divisional finish",
        value: pearson(matchedRows.map((row) => [getPva(row), getPosition(row)])),
        note: "Shows whether expectation-beating seasons translate into better league finishes.",
      },
      {
        id: "va-finish",
        label: "VA vs divisional finish",
        value: pearson(matchedRows.map((row) => [getVa(row), getPosition(row)])),
        note: "Value added against divisional placing, avoiding the pyramid-structure distortion.",
      },
      {
        id: "etot-pva",
        label: "ETOT vs PVA",
        value: pearson(matchedRows.map((row) => [getEtot(row), getPva(row)])),
        note: "Near zero is useful: it suggests PVA is not simply rewarding stronger squads.",
      },
    ],
    outcomeBands: summarizeOutcomeBands(matchedRows),
    trophyConversion: summarizeTrophyConversion(matchedRows),
    cupFamilies: summarizeCupFamilies(matchedRows),
    honoursCoverage: summarizeHonoursCoverage(honoursLookup),
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
