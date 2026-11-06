#!/usr/bin/env node
// Adds a season/division to public/data/statsArchive.json from Mister TRX's
// season review table (scripts/reviews/S<season>D<division>.md), until his
// spreadsheet for that season is imported through Import Stats.
//
//   node scripts/add-season-review.mjs scripts/reviews/S28D1.md
//
// The review table has Team | Predicted | Finished | VA | PVA. Each row is
// checked: VA = Predicted - Finished and PVA = (VA + 1) / Finished, against
// his figures (PVA to 2 dp). Strength columns (GK/DEF/MID/ATT/Top18/Ave/ETOT)
// are left empty: they come with his spreadsheet. Re-running replaces that
// season/division's rows, so it is safe to repeat.
import fs from "node:fs";
import path from "node:path";

const file = process.argv[2];
const match = /S(\d+)D(\d+)\.md$/i.exec(file || "");
if (!match) throw new Error("Usage: node scripts/add-season-review.mjs scripts/reviews/S<season>D<division>.md");
const season = Number(match[1]);
const division = Number(match[2]);
const archivePath = path.resolve("public/data/statsArchive.json");
const sourceFile = `${path.basename(file)} (Mister TRX's S${season} D${division} review)`;

const number = (text) => Number(String(text).replace(/[+\s]/g, "").replace("−", "-"));
const rows = fs.readFileSync(file, "utf8").split("\n")
  .filter((line) => line.trim().startsWith("|"))
  .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
  .filter((cells) => cells.length >= 5 && cells[0] !== "Team" && !/^-+:?$/.test(cells[1]))
  .map(([club, pre, fin, va, pva], index) => {
    const predictedPosition = number(pre);
    const finalPosition = number(fin);
    const sourceValueAdded = number(va);
    const sourcePva = number(pva);
    const computedValueAdded = predictedPosition - finalPosition;
    const computedPva = Math.round(((computedValueAdded + 1) / finalPosition) * 1000) / 1000;
    if (computedValueAdded !== sourceValueAdded) throw new Error(`${club}: VA ${sourceValueAdded} does not match Pre-Fin ${computedValueAdded}`);
    if (Math.abs(computedPva - sourcePva) > 0.005 + 1e-9) throw new Error(`${club}: PVA ${sourcePva} does not match (VA+1)/Fin ${computedPva}`);
    return {
      season, division, club,
      gk: null, def: null, mid: null, att: null, top15: null, top18: null, top21: null, average: null, etot: null,
      earlyDoors: null, midSeason: null, fullSeason: null,
      predictedPosition, finalPosition,
      valueAdded: computedValueAdded, pva: computedPva,
      sourceValueAdded, sourcePva, computedValueAdded, computedPva,
      sourceFile, sourceRow: index + 1,
    };
  });

if (rows.length !== 20) throw new Error(`Expected 20 clubs, found ${rows.length}`);
const finals = new Set(rows.map((row) => row.finalPosition));
const predicted = new Set(rows.map((row) => row.predictedPosition));
if (finals.size !== 20 || predicted.size !== 20) throw new Error("Predicted and finished positions must each be 1-20 with no repeats");

const archive = JSON.parse(fs.readFileSync(archivePath, "utf8"));
const keep = (row) => !(row.season === season && row.division === division);
archive.rows = [...archive.rows.filter(keep), ...rows];
archive.summaries = [
  ...archive.summaries.filter(keep),
  { filename: path.basename(file), fileType: "review", season, division, importedRows: rows.length,
    headers: ["Team", "Predicted", "Finished", "VA", "PVA"],
    mappedFields: ["club", "predictedPosition", "finalPosition", "valueAdded", "pva"], unknownColumns: [] },
];
archive.rowCount = archive.rows.length;
archive.generatedAt = new Date().toISOString();
fs.writeFileSync(archivePath, JSON.stringify(archive, null, 2) + "\n");
console.log(`S${season} D${division}: ${rows.length} rows from ${path.basename(file)}; archive now ${archive.rowCount} rows.`);
