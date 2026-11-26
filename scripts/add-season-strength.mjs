#!/usr/bin/env node
// Fills squad strength (GK/DEF/MID/ATT/Top18/Ave/ETOT) into a season/division
// already in public/data/statsArchive.json, from Mister TRX's pre-season
// preview table (scripts/previews/S<season>D<division>.csv, copied from his
// "Season N Division D Stats and Facts" post).
//
//   node scripts/add-season-strength.mjs scripts/previews/S28D1.csv
//
// Use it after add-season-review.mjs has added the finishes. Every row is
// checked before anything is written: the club must already be in that
// division, Ave must be the mean of GK/DEF/MID/ATT/Top18, and his Pre must
// match the archive's predicted position. Safe to re-run.
import fs from "node:fs";
import path from "node:path";

const file = process.argv[2];
const match = /S(\d+)D(\d+)\.csv$/i.exec(file || "");
if (!match) throw new Error("Usage: node scripts/add-season-strength.mjs scripts/previews/S<season>D<division>.csv");
const season = Number(match[1]);
const division = Number(match[2]);
const archivePath = path.resolve("public/data/statsArchive.json");

// Names his previews use that differ from the archive's.
const ALIASES = { bremen: "werder bremen" };
const key = (name) => {
  const k = String(name).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\./g, "").trim();
  return ALIASES[k] || k;
};

const [header, ...lines] = fs.readFileSync(file, "utf8").trim().split("\n").map((line) => line.split(","));
const col = (name) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`${path.basename(file)} has no ${name} column`);
  return i;
};
const fields = { gk: "GK", def: "DEF", mid: "MID", att: "ATT", top18: "Top18", average: "Ave", etot: "ETOT" };

const archive = JSON.parse(fs.readFileSync(archivePath, "utf8"));
const rows = archive.rows.filter((row) => row.season === season && row.division === division);
if (rows.length !== 20) throw new Error(`S${season} D${division} has ${rows.length} rows in the archive; add the review first`);
const byClub = new Map(rows.map((row) => [key(row.club), row]));
if (lines.length !== 20) throw new Error(`Expected 20 clubs in ${path.basename(file)}, found ${lines.length}`);

const updates = lines.map((cells) => {
  const club = cells[col("Club")];
  const row = byClub.get(key(club));
  if (!row) throw new Error(`${club} is not in S${season} D${division}`);
  const values = Object.fromEntries(Object.entries(fields).map(([field, name]) => {
    const value = Number(cells[col(name)]);
    if (!Number.isFinite(value)) throw new Error(`${club}: ${name} is not a number`);
    return [field, value];
  }));
  const mean = (values.gk + values.def + values.mid + values.att + values.top18) / 5;
  if (Math.abs(mean - values.average) > 0.051) throw new Error(`${club}: Ave ${values.average} is not the mean of the five ratings (${mean.toFixed(2)})`);
  const pre = Number(cells[col("Pre")]);
  if (pre !== row.predictedPosition) throw new Error(`${club}: preview Pre ${pre} does not match archive predicted ${row.predictedPosition}`);
  return [row, values];
});
if (new Set(updates.map(([row]) => row)).size !== 20) throw new Error("A club appears twice in the preview");
// Nothing is written unless every check above passed.

for (const [row, values] of updates) {
  Object.assign(row, values);
  row.sourceFile = `${row.sourceFile.replace(/ \+ .*$/, "")} + ${path.basename(file)} (Mister TRX's S${season} D${division} preview)`;
}
const summary = archive.summaries.find((s) => s.season === season && s.division === division);
if (summary) {
  summary.strengthFile = path.basename(file);
  summary.mappedFields = [...new Set([...summary.mappedFields, ...Object.keys(fields)])].sort();
}
archive.generatedAt = new Date().toISOString();
fs.writeFileSync(archivePath, JSON.stringify(archive, null, 2) + "\n");
console.log(`S${season} D${division}: squad strength for ${updates.length} clubs from ${path.basename(file)}.`);
