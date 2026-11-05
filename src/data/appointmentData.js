// The archive behind appointment scores and bottom-three reviews (rulebook 3.1 and
// 3.2), built from the "Full History" sheet, the stats archive (value added and
// squad strength) and the live season. Shared by the report scripts and the
// appointment-scores Netlify function, which the Top 100 admin appointments page calls.
import { allocateVacancies, eligibility, managerCareer, managerSupply, reviewSackedManager, scoreApplicant, splitManagers } from "../analytics/appointmentScoring.js";
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

// Appointment profiles for every manager in the current season: an approximate level, trajectory,
// strengths and weaknesses from the parts of the appointment score (3.2) that come from public
// records only. Activity (partly assessed by the administrators) and discipline are left out, so
// the profile is out of 80: this season 20, recent seasons 15, honours 15, level 10, stability 20.
export const PROFILE_PARTS = Object.freeze([
  ["current", "This season", 20],
  ["recent", "Recent seasons", 15],
  ["honours", "Honours", 15],
  ["level", "Level", 10],
  ["stability", "Stability", 20],
]);

const NOT_TO_WORK_ON = new Set(["level", "honours"]);
const round1 = (value) => Math.round(value * 10) / 10;
const publicScore = (scored) => PROFILE_PARTS.reduce((sum, [part]) => sum + (scored.breakdown[part] || 0), 0);
// Share of the others below this value, ties counted half (0-100).
const percentileOf = (value, values) => {
  if (values.length <= 1) return 50;
  const below = values.filter((other) => other < value).length;
  const equal = values.filter((other) => other === value).length - 1;
  return Math.round((100 * (below + equal / 2)) / (values.length - 1));
};
export const levelBand = (percentile) =>
  percentile >= 90 ? "Top 10%" : percentile >= 75 ? "Top 25%" : percentile >= 50 ? "Above average" : percentile >= 25 ? "Below average" : "Bottom 25%";

export const managerProfiles = (archive, { currentSeason }) => {
  const { rows, squadRankGain } = archive;
  // The manager who holds each club now: the last name of a shared "A / B" entry.
  const current = rows
    .filter((row) => Number(row.season) === currentSeason && row.manager)
    .map((row) => ({ ...row, manager: splitManagers(row.manager).pop() }))
    .filter((row) => row.manager);
  // Last season's score from the records as they stood then, so this season can't shape it.
  const earlierRows = rows.filter((row) => Number(row.season) <= currentSeason - 1);
  const seen = new Set();
  const scored = current
    .filter((row) => !seen.has(row.manager) && seen.add(row.manager))
    .map((row) => {
      const now = scoreApplicant({ manager: row.manager, currentSeason, rows, activity: { squadRankGain: squadRankGain(row.manager) } });
      const before = managerCareer(row.manager, earlierRows).some((r) => Number(r.season) === currentSeason - 1)
        ? scoreApplicant({ manager: row.manager, currentSeason: currentSeason - 1, rows: earlierRows })
        : null;
      return { row, now, total: round1(publicScore(now)), previous: before ? round1(publicScore(before)) : null };
    });
  const totals = scored.map((entry) => entry.total);
  const partValues = Object.fromEntries(PROFILE_PARTS.map(([part]) => [part, scored.map((entry) => entry.now.breakdown[part] || 0)]));
  return scored.map(({ row, now, total, previous }) => {
    const percentile = percentileOf(total, totals);
    const parts = PROFILE_PARTS.map(([part, label, max]) => ({
      part, label, max, score: now.breakdown[part] || 0, percentile: percentileOf(now.breakdown[part] || 0, partValues[part]),
    }));
    const change = previous === null ? null : round1(total - previous);
    return {
      manager: row.manager,
      club: row.team,
      division: Number(row.division),
      position: Number(row.position),
      score: total,
      outOf: 80,
      // Place among this season's managers (joint places share the higher one).
      rank: 1 + totals.filter((other) => other > total).length,
      percentile,
      level: levelBand(percentile),
      trajectory: change === null ? "new" : change >= 5 ? "rising" : change <= -5 ? "falling" : "steady",
      change,
      strengths: parts.filter((p) => p.percentile >= 65).sort((a, b) => b.percentile - a.percentile).slice(0, 2).map((p) => p.label),
      // Level and honours take time and chances to earn, so they're never listed as something to work on.
      weaknesses: parts.filter((p) => p.percentile <= 35 && !NOT_TO_WORK_ON.has(p.part)).sort((a, b) => a.percentile - b.percentile).slice(0, 2).map((p) => p.label),
      parts,
    };
  });
};

// Waiting-list applicants' Top 100 records (rulebook 3.3): for each { key, name }, the archive's
// name for them (if any), a summary of their Top 100 career (any archived season, this one included)
// and the public-record part of the appointment score (out of 80), scored as at the current season. An applicant with any archived
// season is a returning manager. The name match is the same as everywhere else in the archive
// ("Chris East" -> "East"), so the administrators should check it.
export const applicantHistory = (archive, { currentSeason, applicants = [] }) => {
  const { rows, archiveName } = archive;
  return applicants.map((applicant) => {
    const key = applicant.key ?? applicant.name;
    const name = archiveName({ name: String(applicant.name || "").slice(0, 120) });
    // Every archived season counts, including this one (someone who left part-way through it is returning).
    const career = name ? managerCareer(name, rows).filter((row) => row.season <= currentSeason) : [];
    if (!career.length) return { key, name: applicant.name, matched: null, returning: false, seasons: 0, score: 0, outOf: 80, parts: [], spells: [] };
    const scored = scoreApplicant({ manager: name, currentSeason, rows });
    // Consecutive seasons at the same club, as one spell.
    const spells = [];
    career.forEach((row) => {
      const last = spells[spells.length - 1];
      if (last && last.club === row.team && last.to === row.season - 1) {
        last.to = row.season;
        last.best = Math.min(last.best, row.division * 100 + row.position);
      } else spells.push({ club: row.team, from: row.season, to: row.season, best: row.division * 100 + row.position });
    });
    return {
      key,
      name: applicant.name,
      matched: name,
      returning: true,
      seasons: career.length,
      firstSeason: career[0].season,
      lastSeason: career[career.length - 1].season,
      titles: career.filter((row) => row.position === 1).length,
      score: round1(publicScore(scored)),
      outOf: 80,
      parts: PROFILE_PARTS.map(([part, label, max]) => ({ part, label, max, score: round1(scored.breakdown[part] || 0) })),
      spells: spells.map(({ best, ...spell }) => ({ ...spell, bestDivision: Math.floor(best / 100), bestPosition: best % 100 })),
    };
  });
};
