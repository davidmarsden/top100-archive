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
//             preferences: { name: [club, ...] }, discipline: { name: { sanctions, openSanction, gold } },
//             activity: { name: { competitions: entries in the last two seasons, topManagerDeals: count,
//                                 running: 0-3, community: 0-3, gameWorlds: Soccer Manager game worlds
//                                 managed in, Top 100 included } } }  (squad building is measured from --stats)
//           "name" is the manager's name as the sheet writes it.
import fs from "node:fs";
import { allocateVacancies, eligibility, scoreApplicant } from "../src/analytics/appointmentScoring.js";
import { loadArchive, parseArgs } from "./lib/archiveData.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args.sheet || !args.live || !args.config) {
  console.error("Usage: --sheet full-history.csv --live live.json --config round.json [--stats statsArchive.json] [--json]");
  process.exit(1);
}

const { rows, squadRankGain } = loadArchive(args);
const config = JSON.parse(fs.readFileSync(args.config, "utf8"));
const discipline = config.discipline || {};

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
