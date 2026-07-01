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
const managerNames = (row) =>
  String(row.manager || "")
    .split("/")
    .map((name) => String(name || "").trim())
    .filter(Boolean);

const isChampion = (row) => getPosition(row) === 1;
const isD1TopFour = (row) => getDivision(row) === 1 && getPosition(row) >= 1 && getPosition(row) <= 4;
const isD1TopTen = (row) => getDivision(row) === 1 && getPosition(row) >= 1 && getPosition(row) <= 10;
const isPromoted = (row) => {
  const division = getDivision(row);
  const position = getPosition(row);
  return division >= 2 && division <= 5 && position >= 1 && position <= 3;
};
const isPlayoffBand = (row) => {
  const division = getDivision(row);
  const position = getPosition(row);
  return division >= 2 && division <= 5 && position >= 4 && position <= 7;
};
const isBottomFourRelegationZone = (row) => {
  const division = getDivision(row);
  const position = getPosition(row);
  return division >= 1 && division <= 4 && position >= 17 && position <= 20;
};
const isBottomThreeAutoSackZone = (row) => {
  const position = getPosition(row);
  return position >= 18 && position <= 20;
};

const pct = (part, total) => (total ? round((part / total) * 100, 1) : null);

const ETOT_BANDS = [
  { label: "≤214", min: -Infinity, max: 214.999, sort: 214 },
  { label: "215-216", min: 215, max: 216.999, sort: 215 },
  { label: "217-218", min: 217, max: 218.999, sort: 217 },
  { label: "219-220", min: 219, max: 220.999, sort: 219 },
  { label: "221-222", min: 221, max: 222.999, sort: 221 },
  { label: "223-224", min: 223, max: 224.999, sort: 223 },
  { label: "225-226", min: 225, max: 226.999, sort: 225 },
  { label: "227-228", min: 227, max: 228.999, sort: 227 },
  { label: "229-230", min: 229, max: 230.999, sort: 229 },
  { label: "231-232", min: 231, max: 232.999, sort: 231 },
  { label: "233-234", min: 233, max: 234.999, sort: 233 },
  { label: "≥235", min: 235, max: Infinity, sort: 235 },
];

const etotBand = (etot) => {
  const n = toNumberOrNull(etot);
  if (n === null) return "Unknown";
  return ETOT_BANDS.find((band) => n >= band.min && n <= band.max)?.label || "Unknown";
};

const bandSortValue = (band) => {
  if (band === "Unknown") return 9999;
  return ETOT_BANDS.find((item) => item.label === band)?.sort ?? 9999;
};

export const COMPETITION_FAMILIES = [
  { id: "all", label: "All silverware" },
  { id: "SMFA", label: "SMFA comps" },
  { id: "World Club", label: "World Club cups" },
  { id: "Top 100", label: "Top 100 cups" },
  { id: "Youth", label: "Youth cups" },
  { id: "Other Cups", label: "Other cups" },
];

const competitionFamily = (competition = "") => {
  const key = normalise(competition);
  if (key.includes("youth")) return "Youth";
  if (key.includes("world club") || key === "wcc" || key === "wcs") return "World Club";
  if (key.includes("top 100")) return "Top 100";
  if (key.includes("smfa") || key.includes("champions cup") || key.includes("champions league") || key === "shield") return "SMFA";
  if (key.includes("play") && key.includes("off")) return "Playoff";
  if (key.includes("division") || key.includes("league") || key.includes("title")) return "League";
  if (key.includes("cup") || key.includes("shield")) return "Other Cups";
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
        family: competitionFamily(competition),
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
    const managerHonours = managerNames(row)
      .map(normalise)
      .flatMap((manager) => honoursLookup.managerBySeasonManager.get(`${season}|${manager}`) || []);
    const honours = [...clubHonours, ...managerHonours];
    const honourFamilies = [...new Set(honours.map((honour) => honour.family))];

    return {
      ...row,
      honours,
      honourFamilies,
      hasHonour: honours.length > 0,
      hasSMFAHonour: honourFamilies.includes("SMFA"),
      hasWorldClubHonour: honourFamilies.includes("World Club"),
      hasTop100Honour: honourFamilies.includes("Top 100"),
      hasYouthHonour: honourFamilies.includes("Youth"),
    };
  });

const rowMatchesScope = (row, scope = {}) => {
  const { division = "all", club = "", manager = "" } = scope;
  if (division !== "all" && String(getDivision(row)) !== String(division)) return false;
  if (club && !normalise(getClub(row)).includes(normalise(club))) return false;
  if (manager && !managerNames(row).some((name) => normalise(name).includes(normalise(manager)))) return false;
  return true;
};

const honourMatchesFamily = (honour, family = "all") => family === "all" || honour.family === family;

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
        d1TopFour: 0,
        d1TopTen: 0,
        promoted: 0,
        playoffs: 0,
        bottomFour: 0,
        bottomThree: 0,
        smfaHonours: 0,
        worldClubHonours: 0,
        top100Honours: 0,
        youthHonours: 0,
      });
    }

    const entry = byBand.get(band);
    entry.samples += 1;
    entry.etots.push(etot);
    entry.finishes.push(getPosition(row));
    if (isChampion(row)) entry.titles += 1;
    if (isD1TopFour(row)) entry.d1TopFour += 1;
    if (isD1TopTen(row)) entry.d1TopTen += 1;
    if (isPromoted(row)) entry.promoted += 1;
    if (isPlayoffBand(row)) entry.playoffs += 1;
    if (isBottomFourRelegationZone(row)) entry.bottomFour += 1;
    if (isBottomThreeAutoSackZone(row)) entry.bottomThree += 1;
    if (row.hasSMFAHonour) entry.smfaHonours += 1;
    if (row.hasWorldClubHonour) entry.worldClubHonours += 1;
    if (row.hasTop100Honour) entry.top100Honours += 1;
    if (row.hasYouthHonour) entry.youthHonours += 1;
  });

  return [...byBand.values()]
    .map((entry) => ({
      ...entry,
      averageETOT: round(average(entry.etots), 2),
      averageFinish: round(average(entry.finishes), 2),
      titleRate: pct(entry.titles, entry.samples),
      d1TopFourRate: pct(entry.d1TopFour, entry.samples),
      d1TopTenRate: pct(entry.d1TopTen, entry.samples),
      promotedRate: pct(entry.promoted, entry.samples),
      playoffRate: pct(entry.playoffs, entry.samples),
      bottomFourRate: pct(entry.bottomFour, entry.samples),
      bottomThreeRate: pct(entry.bottomThree, entry.samples),
      smfaRate: pct(entry.smfaHonours, entry.samples),
      worldClubRate: pct(entry.worldClubHonours, entry.samples),
      top100Rate: pct(entry.top100Honours, entry.samples),
      youthRate: pct(entry.youthHonours, entry.samples),
    }))
    .sort((a, b) => bandSortValue(a.band) - bandSortValue(b.band));
};

const honourWeight = (honour) => {
  if (honour.family === "League") return 3;
  if (honour.family === "SMFA") return 3;
  if (honour.family === "World Club") return 3;
  if (honour.family === "Top 100") return 2;
  if (honour.family === "Youth") return 1;
  if (honour.family === "Other Cups") return 1;
  return 0;
};

const summarizeSilverwareConversion = (rows = [], family = "all") => {
  const byManager = new Map();

  rows.forEach((row) => {
    managerNames(row).forEach((manager) => {
      if (!byManager.has(manager)) {
        byManager.set(manager, {
          manager,
          seasons: 0,
          etots: [],
          pvas: [],
          leagueTitles: 0,
          smfa: 0,
          worldClub: 0,
          top100: 0,
          youth: 0,
          otherCups: 0,
          honourScore: 0,
        });
      }

      const entry = byManager.get(manager);
      entry.seasons += 1;
      entry.etots.push(getEtot(row));
      entry.pvas.push(getPva(row));

      if ((family === "all" || family === "League") && isChampion(row)) {
        entry.leagueTitles += 1;
        entry.honourScore += 3;
      }

      (row.honours || []).filter((honour) => honourMatchesFamily(honour, family)).forEach((honour) => {
        if (honour.family === "SMFA") entry.smfa += 1;
        if (honour.family === "World Club") entry.worldClub += 1;
        if (honour.family === "Top 100") entry.top100 += 1;
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
        silverwareConversion: averageETOT ? round(scorePerSeason / averageETOT, 5) : null,
      };
    })
    .filter((entry) => entry.seasons >= 3)
    .sort((a, b) => b.silverwareConversion - a.silverwareConversion || b.honourScore - a.honourScore);
};

const summarizeCupFamilies = (rows = [], family = "all") => {
  const byManager = new Map();

  rows.forEach((row) => {
    managerNames(row).forEach((manager) => {
      if (!byManager.has(manager)) {
        byManager.set(manager, { manager, smfa: 0, worldClub: 0, top100: 0, youth: 0, otherCups: 0 });
      }
      const entry = byManager.get(manager);
      (row.honours || []).filter((honour) => honourMatchesFamily(honour, family)).forEach((honour) => {
        if (honour.family === "SMFA") entry.smfa += 1;
        if (honour.family === "World Club") entry.worldClub += 1;
        if (honour.family === "Top 100") entry.top100 += 1;
        if (honour.family === "Youth") entry.youth += 1;
        if (honour.family === "Other Cups") entry.otherCups += 1;
      });
    });
  });

  return [...byManager.values()]
    .map((entry) => ({ ...entry, total: entry.smfa + entry.worldClub + entry.top100 + entry.youth + entry.otherCups }))
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

export const buildSuccessEvidence = (archiveRows = [], statsRows = [], honours = {}, options = {}) => {
  const { joinedRows } = joinArchiveRowsToStats(archiveRows, statsRows);
  const honoursLookup = buildHonoursLookup(honours.clubHonours || [], honours.managerHonours || []);
  const evidenceRows = addHonoursToRows(joinedRows, honoursLookup);
  const scopedRows = evidenceRows.filter((row) => rowMatchesScope(row, options));
  const matchedRows = scopedRows.filter((row) => getEtot(row) !== null);
  const family = options.competitionFamily || "all";

  return {
    rowCount: scopedRows.length,
    matchedRowCount: matchedRows.length,
    honoursRowCount: honoursLookup.clubLong.length + honoursLookup.managerLong.length,
    availableDivisions: [...new Set(evidenceRows.map((row) => getDivision(row)).filter((value) => value !== null))].sort((a, b) => a - b),
    correlations: [
      {
        id: "etot-finish",
        label: "ETOT vs divisional finish",
        value: pearson(matchedRows.map((row) => [getEtot(row), getPosition(row)])),
        note: "Negative means stronger squads tend to finish nearer 1st within the selected scope.",
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
        note: "Value added against divisional placing, avoiding pyramid-structure distortion.",
      },
      {
        id: "etot-pva",
        label: "ETOT vs PVA",
        value: pearson(matchedRows.map((row) => [getEtot(row), getPva(row)])),
        note: "Near zero is useful: it suggests PVA is not simply rewarding stronger squads.",
      },
    ],
    outcomeBands: summarizeOutcomeBands(matchedRows),
    silverwareConversion: summarizeSilverwareConversion(matchedRows, family),
    cupFamilies: summarizeCupFamilies(matchedRows, family),
    honoursCoverage: summarizeHonoursCoverage(honoursLookup),
    headlineAverages: {
      allAverageETOT: round(average(matchedRows.map(getEtot)), 2),
      allAveragePVA: round(average(matchedRows.map(getPva)), 3),
    },
  };
};
