// Loads the archive for the appointment and sacking reports from files: the "Full
// History" sheet (CSV export), the stats archive (value added and squad strength)
// and the current season's live rows. The archive itself is built by
// src/data/appointmentData.js, which the appointment-scores function shares.
import fs from "node:fs";
import { buildArchive, parseSheetTable } from "../../src/data/appointmentData.js";

export const parseArgs = (argv) =>
  Object.fromEntries(
    argv.reduce((pairs, arg, i, all) => {
      if (arg.startsWith("--")) pairs.push([arg.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? true : all[i + 1]]);
      return pairs;
    }, [])
  );

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

export const loadArchive = ({ sheet, live, stats }) => {
  const sheetRows = parseSheetTable(fs.readFileSync(sheet, "utf8").trim().split(/\r?\n/).map(parseCsvLine));
  const statsSource = stats ? JSON.parse(fs.readFileSync(stats, "utf8")) : [];
  const liveSource = JSON.parse(fs.readFileSync(live, "utf8"));
  return buildArchive({
    sheetRows,
    statsRows: statsSource.rows || statsSource,
    liveRows: Array.isArray(liveSource) ? liveSource : liveSource.rows || [],
  });
};
