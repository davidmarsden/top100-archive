// The archive behind appointment scores and bottom-three reviews (rulebook 3.1 and
// 3.2), built from the "Full History" sheet, the stats archive (value added and
// squad strength) and the live season. Shared by the report scripts and the
// appointment-scores Netlify function, which the Top 100 admin appointments page calls.
import { allocateVacancies, eligibility, managerCareer, managerSupply, reviewSackedManager, scoreApplicant } from "../analytics/appointmentScoring.js";
import { CLUB_ALIASES } from "./clubAliases.js";
import { buildLiveSeasonRows, resolveManagerName } from "./liveSeason.js";

// Sheet rows from a table whose first row is the header (Season, Div, Pos, Team, Pts, Manager...).
export const parseSheetTable = (table = []) => {
  const [header = [], ...lines] = table;
  const columns = header.map((name) => String(name || "").trim().toLowerCase());
  const col = (...names) => columns.findIndex((name) => names.includes(name));
  const at = { season: col("season"), division: col("div", "division"), position: col("pos", "position"), team: col("team", "club"), points: col("pts", "points"), manager: col("manager") };
  return lines
    .map((cells) => Object.fromEntries(Object.entries(at).map(([key, index]) => [key, String((index < 0 ? "" : cells[index]) ?? "").trim()])))
    .filter((row) => row.season && row.team);
};

// Value added (predicted - actual) for completed seasons, from the stats archive,
// matching club names the way src/data/clubNameUtils.js does ("Wolfsburg" = "VfL Wolfsburg").
const normaliseClub = (name) =>
  String(name || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\b(fc|cf|afc|sc|sk|jk|kv|ud|ec|bc|cfc|hsc|sv|club|vfl|vfb)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const canonicalClub = (name) => normaliseClub(CLUB_ALIASES.get(normaliseClub(name)) || name);
const statsKey = (season, division, club) => `${Number(season)}|${Number(division)}|${canonicalClub(club)}`;

export const sameClub = (a, b) => canonicalClub(a) === canonicalClub(b);

// sheetRows: from parseSheetTable; statsRows: statsArchive.json rows; liveRows: public_league_season_rows.
export const buildArchive = ({ sheetRows = [], statsRows = [], liveRows = [] }) => {
  const valueAdded = new Map();
  // Squad-strength rank (1 = strongest of the 100) for each club-season, from ETOT.
  const strengthRank = new Map();
  statsRows.forEach((row) => {
    if (row.valueAdded !== null && row.valueAdded !== undefined) valueAdded.set(statsKey(row.season, row.division, row.club), row.valueAdded);
  });
  const bySeason = new Map();
  statsRows.filter((row) => Number(row.etot) > 0).forEach((row) => {
    if (!bySeason.has(row.season)) bySeason.set(row.season, []);
    bySeason.get(row.season).push(row);
  });
  bySeason.forEach((seasonRows, season) =>
    [...seasonRows].sort((a, b) => b.etot - a.etot).forEach((row, i) => strengthRank.set(`${Number(season)}|${canonicalClub(row.club)}`, i + 1))
  );
  const history = sheetRows.map((row) => ({ ...row, valueAdded: valueAdded.get(statsKey(row.season, row.division, row.team)) ?? null }));

  const liveSeason = buildLiveSeasonRows(liveRows, sheetRows).map((row, i) => {
    const raw = liveRows[i].predicted_position;
    const predicted = raw === null || raw === undefined || raw === "" ? NaN : Number(raw);
    return { ...row, valueAdded: Number.isFinite(predicted) ? predicted - Number(row.position) : null };
  });

  const rows = [...history, ...liveSeason];

  // Places climbed in the squad-strength ranking between the first and latest archived
  // season of the manager's current spell (null when there are not two seasons to compare).
  const squadRankGain = (name) => {
    const career = managerCareer(name, rows);
    const current = career[career.length - 1];
    if (!current) return null;
    const spell = [];
    for (let i = career.length - 1; i >= 0 && career[i].team === current.team; i -= 1) spell.unshift(career[i]);
    const ranked = spell
      .map((row) => strengthRank.get(`${row.season}|${canonicalClub(row.team)}`))
      .filter((rank) => rank !== undefined);
    return ranked.length >= 2 ? ranked[0] - ranked[ranked.length - 1] : null;
  };

  // The archive's name for a manager ("Mister TRX" -> "TRX"): the live season's resolved
  // name for their club while it is live, otherwise resolved against the sheet (once the
  // sheet has the season, the live rows are dropped), otherwise the name as given.
  const archiveName = ({ name, club }) => {
    const live = club ? liveSeason.find((row) => sameClub(row.team, club)) : null;
    if (live?.manager) return live.manager;
    const sheetTeam = club ? sheetRows.find((row) => sameClub(row.team, club))?.team : null;
    return name ? resolveManagerName(name, sheetTeam || club || "", sheetRows) : name;
  };

  return { rows, sheetRows, liveSeason, squadRankGain, archiveName };
};

const keyed = (list, archiveName) => Object.fromEntries(list.map((entry) => [entry.key ?? entry.name, archiveName(entry)]));

// config: { currentSeason, vacancies: [{ club, division }], applicants: [{ key, name, club, display, seasonClub? }],
//           preferences: { key: [club, ...] }, discipline: { key: {...} }, activity: { key: {...} } }
// Results are keyed by each applicant's key (or name).
export const scoreVacancies = (archive, config) => {
  const { rows, squadRankGain, archiveName } = archive;
  const names = keyed(config.applicants, archiveName);
  const discipline = config.discipline || {};
  // An applicant with seasonClub (a vacancy's outgoing manager, scored for comparison) who has no
  // current-season row of their own, having left during the season, is credited with that club's
  // season so far, including any caretaker's games.
  const rowsByKey = Object.fromEntries(config.applicants.map((entry) => {
    const key = entry.key ?? entry.name;
    if (!entry.seasonClub || managerCareer(names[key], rows).some((row) => row.season === config.currentSeason)) return [key, rows];
    const clubRow = rows.find((row) => Number(row.season) === config.currentSeason && sameClub(row.team, entry.seasonClub));
    return [key, clubRow ? [...rows, { ...clubRow, manager: names[key] }] : rows];
  }));
  const scoreFor = (key, level) =>
    scoreApplicant({
      manager: names[key],
      currentSeason: config.currentSeason,
      rows: rowsByKey[key],
      discipline: discipline[key],
      activity: { squadRankGain: squadRankGain(names[key]), ...((config.activity || {})[key] || {}) },
      level,
    });
  // Each applicant is scored once per vacancy: the "record at the level" part depends on its division.
  const scoresByManager = Object.fromEntries(
    Object.keys(names).map((key) => [key, Object.fromEntries(config.vacancies.map((vacancy) => [vacancy.club, scoreFor(key, vacancy.division)]))])
  );
  const allocation = allocateVacancies(scoresByManager, config.vacancies, config.preferences || {}, discipline);
  return {
    currentSeason: config.currentSeason,
    vacancies: config.vacancies,
    applicants: config.applicants.map((applicant) => {
      const key = applicant.key ?? applicant.name;
      return {
        key,
        manager: names[key],
        display: applicant.display || applicant.name,
        byVacancy: Object.fromEntries(
          config.vacancies.map((vacancy) => {
            const scored = scoresByManager[key][vacancy.club];
            return [vacancy.club, { ...scored, eligibility: eligibility(scored, vacancy, discipline[key]) }];
          })
        ),
      };
    }),
    allocation,
  };
};

// config: { currentSeason, managers: [{ key, name, club, display, ...review options }],
//           supply: { newcomers: [names], leavers: [names] }, discipline: { key }, activity: { key } }
export const reviewBottomThree = (archive, config) => {
  const { rows, squadRankGain, archiveName } = archive;
  const reviews = config.managers.map((entry) => {
    const key = entry.key ?? entry.name;
    const manager = archiveName(entry);
    return {
      key,
      display: entry.display || entry.name,
      ...reviewSackedManager({
        manager,
        currentSeason: config.currentSeason,
        rows,
        discipline: (config.discipline || {})[key],
        activity: { squadRankGain: squadRankGain(manager), ...((config.activity || {})[key] || {}) },
        options: entry,
      }),
    };
  });
  const supply = config.supply || {};
  const balance = managerSupply(reviews, { newcomers: (supply.newcomers || []).length, leavers: (supply.leavers || []).length });
  return { currentSeason: config.currentSeason, supply, balance, reviews };
};
