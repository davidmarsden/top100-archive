// Loads the archive for the appointment and sacking reports: the "Full History"
// sheet (CSV export), value added and squad-strength ranks from the stats
// archive, and the current season's live rows.
import fs from "node:fs";
import { managerCareer } from "../../src/analytics/appointmentScoring.js";
import { CLUB_ALIASES } from "../../src/data/clubAliases.js";
import { buildLiveSeasonRows } from "../../src/data/liveSeason.js";

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

export const loadArchive = ({ sheet, live, stats }) => {
  const [header, ...lines] = fs.readFileSync(sheet, "utf8").trim().split(/\r?\n/);
  const columns = parseCsvLine(header).map((name) => name.trim().toLowerCase());
  const col = (...names) => columns.findIndex((name) => names.includes(name));
  const at = { season: col("season"), division: col("div", "division"), position: col("pos", "position"), team: col("team", "club"), points: col("pts", "points"), manager: col("manager") };
  const sheetRows = lines.map(parseCsvLine).map((cells) =>
    Object.fromEntries(Object.entries(at).map(([key, index]) => [key, (cells[index] || "").trim()]))
  );

  const valueAdded = new Map();
  // Squad-strength rank (1 = strongest of the 100) for each club-season, from ETOT.
  const strengthRank = new Map();
  if (stats) {
    const source = JSON.parse(fs.readFileSync(stats, "utf8"));
    const statsRows = source.rows || source;
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

  const liveSource = JSON.parse(fs.readFileSync(live, "utf8"));
  const liveRows = Array.isArray(liveSource) ? liveSource : liveSource.rows || [];
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

  return { rows, sheetRows, liveSeason, squadRankGain };
};
