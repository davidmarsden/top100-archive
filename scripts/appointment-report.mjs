#!/usr/bin/env node
// Scores applicants for Top 100 club vacancies (see src/analytics/appointmentScoring.js).
//
//   node scripts/appointment-report.mjs --sheet full-history.csv --live live.json --config round.json \
//     [--stats public/data/statsArchive.json] [--json]
//
// --sheet   the "Full History" tab exported as CSV
// --live    current-season rows from the live-season function (/.netlify/functions/live-season)
//           or the public_league_season_rows RPC; predicted_position gives value added
// --config  { currentSeason, vacancies: [{ club, division, context }], applicants: [{ name, display }],
//             preferences: { name: [club, ...] }, discipline: { name: { sanctions, openSanction } },
//             activity: { name: { competitions: entries in the last two seasons, topManagerDeals: count,
//                                 community: 0-4 } } }  (squad building is measured from --stats)
//           "name" is the manager's name as the sheet writes it.
import fs from "node:fs";
import { allocateVacancies, eligibility, managerCareer, scoreApplicant } from "../src/analytics/appointmentScoring.js";
import { CLUB_ALIASES } from "../src/data/clubAliases.js";
import { buildLiveSeasonRows } from "../src/data/liveSeason.js";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith("--")) pairs.push([arg.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? true : all[i + 1]]);
    return pairs;
  }, [])
);
if (!args.sheet || !args.live || !args.config) {
  console.error("Usage: --sheet full-history.csv --live live.json --config round.json [--stats statsArchive.json] [--json]");
  process.exit(1);
}

const parseCsvLine = (line) => {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else cell += ch;
  }
  cells.push(cell);
  return cells;
};

const [header, ...lines] = fs.readFileSync(args.sheet, "utf8").trim().split(/\r?\n/);
const columns = parseCsvLine(header).map((name) => name.trim().toLowerCase());
const col = (...names) => columns.findIndex((name) => names.includes(name));
const at = { season: col("season"), division: col("div", "division"), position: col("pos", "position"), team: col("team", "club"), points: col("pts", "points"), manager: col("manager") };
const sheetRows = lines.map(parseCsvLine).map((cells) =>
  Object.fromEntries(Object.entries(at).map(([key, index]) => [key, (cells[index] || "").trim()]))
);

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
const valueAdded = new Map();
// Squad-strength rank (1 = strongest of the 100) for each club-season, from ETOT.
const strengthRank = new Map();
if (args.stats) {
  const stats = JSON.parse(fs.readFileSync(args.stats, "utf8"));
  const statsRows = stats.rows || stats;
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
}
const history = sheetRows.map((row) => ({ ...row, valueAdded: valueAdded.get(statsKey(row.season, row.division, row.team)) ?? null }));

const liveSource = JSON.parse(fs.readFileSync(args.live, "utf8"));
const liveRows = Array.isArray(liveSource) ? liveSource : liveSource.rows || [];
const live = buildLiveSeasonRows(liveRows, sheetRows).map((row, i) => {
  const predicted = Number(liveRows[i].predicted_position);
  return { ...row, valueAdded: Number.isFinite(predicted) ? predicted - Number(row.position) : null };
});

const config = JSON.parse(fs.readFileSync(args.config, "utf8"));
const rows = [...history, ...live];
const discipline = config.discipline || {};
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

const scoreFor = (applicant, level) =>
  scoreApplicant({
    manager: applicant.name,
    currentSeason: config.currentSeason,
    rows,
    discipline: discipline[applicant.name],
    activity: { squadRankGain: squadRankGain(applicant.name), ...((config.activity || {})[applicant.name] || {}) },
    level,
  });
// Each applicant is scored once per vacancy: the "record at the level" part depends on its division.
const scoresByManager = Object.fromEntries(
  config.applicants.map((applicant) => [
    applicant.name,
    Object.fromEntries(config.vacancies.map((vacancy) => [vacancy.club, scoreFor(applicant, vacancy.division)])),
  ])
);
const display = Object.fromEntries(config.applicants.map((applicant) => [applicant.name, applicant.display || applicant.name]));
const allocation = allocateVacancies(scoresByManager, config.vacancies, config.preferences || {}, discipline);
const result = {
  currentSeason: config.currentSeason,
  vacancies: config.vacancies,
  applicants: config.applicants.map((applicant) => ({
    manager: applicant.name,
    display: display[applicant.name],
    byVacancy: Object.fromEntries(
      config.vacancies.map((vacancy) => {
        const scored = scoresByManager[applicant.name][vacancy.club];
        return [vacancy.club, { ...scored, eligibility: eligibility(scored, vacancy, discipline[applicant.name]) }];
      })
    ),
  })),
  allocation,
};

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`S${config.currentSeason} appointments\n`);
  config.vacancies.forEach((vacancy) => {
    console.log(`${vacancy.club} (D${vacancy.division} next season)`);
    result.applicants
      .map((applicant) => ({ applicant, scored: applicant.byVacancy[vacancy.club] }))
      .sort((a, b) => b.scored.total - a.scored.total)
      .forEach(({ applicant, scored }, i) => {
        const b = scored.breakdown;
        const verdict = scored.eligibility.eligible ? "" : `  (not eligible: ${scored.eligibility.reasons.join(" ")})`;
        console.log(`  ${i + 1}. ${applicant.display} (${scored.club}, D${scored.division} ${scored.position}): ${scored.total}${verdict}`);
        const a = scored.facts.activity;
        console.log(`     current ${b.current} · recent ${b.recent} · honours ${b.honours} · level ${b.level} · stability ${b.stability} · activity ${b.activity}` +
          ` (competitions ${a.competitions ?? "–"}, market ${a.market ?? "–"}, squad building ${a.squadBuilding ?? "–"}, community ${a.community ?? "–"})`);
      });
    console.log("");
  });
  console.log("Allocation (each round: the highest score for an applicant's most-preferred open club):");
  allocation.appointments.forEach((appointment) =>
    console.log(`  ${appointment.club}: ${display[appointment.manager]} (${appointment.score}), vacating ${appointment.vacates}`)
  );
  if (allocation.unfilled.length) console.log(`  Unfilled: ${allocation.unfilled.join(", ")}`);
}
