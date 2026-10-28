#!/usr/bin/env node
// Reviews the managers who finished in the bottom three (see reviewSackedManager in
// src/analytics/appointmentScoring.js and rulebook 3.1).
//
//   node scripts/sacking-review.mjs --sheet full-history.csv --live live.json --config review.json \
//     [--stats public/data/statsArchive.json] [--json]
//   node scripts/sacking-review.mjs --sheet full-history.csv --live live.json --stats ... --history 20-27
//
// --config  { currentSeason, managers: [{ name, display, tookOverMidSeason, gold, loginGaps, inactive, misconduct, standing, lastChance, wish }],
//             supply: { newcomers: [names waiting to join], leavers: [names leaving anyway] },
//             discipline: { name: { sanctions } },
//             activity: { name: { competitions, topManagerDeals, running, community, forfeits } } }
//           "name" is the manager's name as the sheet (or the live table) writes it.
// --history S-T  scores every past bottom-three manager in seasons S to T (activity at half
//           marks, since it was not measured then) against what happened to them next season.
import fs from "node:fs";
import { managerCareer, managerSupply, reviewSackedManager, splitManagers } from "../src/analytics/appointmentScoring.js";
import { loadArchive, parseArgs } from "./lib/archiveData.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args.sheet || !args.live || (!args.config && !args.history)) {
  console.error("Usage: --sheet full-history.csv --live live.json (--config review.json | --history 20-27) [--stats statsArchive.json] [--json]");
  process.exit(1);
}
const { rows, squadRankGain } = loadArchive(args);

const OUTCOME_LABELS = { reappoint: "Reappoint", secondChance: "Admin decision: second chance?", anotherClub: "Not reappointed: another club", leave: "Not reappointed: no club" };

if (args.history) {
  const [from, to] = String(args.history).split("-").map(Number);
  const fates = {};
  const lines = [];
  for (let season = from; season <= to; season += 1) {
    const upTo = rows.filter((row) => Number(row.season) <= season);
    rows
      .filter((row) => Number(row.season) === season && Number(row.position) >= 18 && splitManagers(row.manager).length === 1)
      .forEach((row) => {
        const manager = splitManagers(row.manager)[0];
        const review = reviewSackedManager({ manager, currentSeason: season, rows: upTo });
        const next = managerCareer(manager, rows).filter((r) => r.season === season + 1);
        const fate = !next.length ? "left Top 100" : next.some((r) => r.team === row.team) ? "kept club" : "moved club";
        fates[review.outcome] = fates[review.outcome] || {};
        fates[review.outcome][fate] = (fates[review.outcome][fate] || 0) + 1;
        lines.push(`S${season} D${row.division} ${row.position} ${row.team} ${manager}: ${review.total} ${review.outcome} -> ${fate}`);
      });
  }
  if (args.verbose) console.log(lines.join("\n"));
  console.log("Review outcome -> what happened next season:");
  Object.entries(fates).forEach(([outcome, counts]) => console.log(`  ${OUTCOME_LABELS[outcome]}: ${JSON.stringify(counts)}`));
  process.exit(0);
}

const config = JSON.parse(fs.readFileSync(args.config, "utf8"));
const reviews = config.managers.map((entry) => ({
  display: entry.display || entry.name,
  ...reviewSackedManager({
    manager: entry.name,
    currentSeason: config.currentSeason,
    rows,
    discipline: (config.discipline || {})[entry.name],
    activity: { squadRankGain: squadRankGain(entry.name), ...((config.activity || {})[entry.name] || {}) },
    options: entry,
  }),
}));
const supply = config.supply || {};
const balance = managerSupply(reviews, { newcomers: (supply.newcomers || []).length, leavers: (supply.leavers || []).length });

if (args.json) {
  console.log(JSON.stringify({ currentSeason: config.currentSeason, supply, balance, reviews }, null, 2));
} else {
  console.log(`S${config.currentSeason} bottom-three review\n`);
  console.log(`Newcomers waiting: ${(supply.newcomers || []).join(", ") || "none"}. Leaving anyway: ${(supply.leavers || []).join(", ") || "none"}.`);
  console.log(`Clubs needing a manager after the review: ${balance.openClubs}` +
    `${balance.bigClubs.length ? ` (D1-D2: ${balance.bigClubs.join(", ")})` : ""}. Managers in Top 100 next season: ${balance.managersAfter}.` +
    `${balance.undecided.length ? ` Awaiting a second-chance decision: ${balance.undecided.join(", ")}.` : ""}\n`);
  [...reviews]
    .sort((a, b) => a.division - b.division || a.position - b.position)
    .forEach((review) => {
      const b = review.breakdown;
      const f = review.facts;
      console.log(`D${review.division} ${review.position} ${review.club}: ${review.display}  ${review.total}  ${OUTCOME_LABELS[review.outcome]}${review.vote ? " (close: admin vote)" : ""}`);
      console.log(`   result ${b.result} · record ${b.record} · activity ${b.activity} · conduct ${b.conduct}` +
        ` | value added ${f.currentValueAdded ?? "–"}, tenure ${f.tenure}, earlier bottom three: ${f.earlierBottomThree.join(", ") || "none"}`);
      console.log(`   ${review.reason}${review.notes.length ? " " + review.notes.join(" ") : ""}`);
    });
}
