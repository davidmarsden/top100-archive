// Game honours from Soccer Manager Sync (public_game_world_honours via
// netlify/functions/game-honours.js) replace the winners sheet for every game
// competition: divisions, play-offs, Charity Shield, Top 100 Cup and Shield and
// the SMFA cups. The sheet keeps the competitions the game doesn't run (the
// Youth Cup and Shield), and seasons Sync hasn't read yet.
//
import { CLUB_ALIASES } from "./clubAliases";

// The output keeps the sheet's wide layout (a Season column, then one column per
// competition), so every reader of the sheet works unchanged.

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const plainTokens = (value) =>
  clean(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

const CLUB_NOISE = new Set(["fc", "cf", "afc", "sc", "sk", "ac", "as", "rcd", "cd", "ud", "sv", "club", "calcio", "cp", "ssc", "hsc", "cfc", "vfl", "vfb", "tsg"]);
const ALIASES = { munchen: "munich", munchenn: "munich", koln: "cologne", koeln: "cologne" };
const clubTokens = (value) => plainTokens(value).map((t) => ALIASES[t] || t).filter((t) => !CLUB_NOISE.has(t));
const managerTokens = (value) => plainTokens(value).filter((t) => t.length > 1);

// The archive's alias list knows many clubs ("inter milan" is Internazionale,
// "milan" is AC Milan). Tried on the name as written and without club codes.
const knownClub = (value) => {
  const words = plainTokens(value);
  const keys = [words.join(" "), words.filter((t) => !CLUB_NOISE.has(t)).join(" ")];
  for (const key of keys) {
    const canonical = key && CLUB_ALIASES.get(key);
    if (canonical) return canonical;
  }
  return null;
};

// Same name when one name's tokens are all inside the other's (the sheet uses
// short names: "Beddows" for "Sir Stephen Beddows (God)", "Bayern Munich" for
// "Bayern München"). Two clubs the alias list knows are the same only if they
// are the same club there, so "Inter Milan" never keeps a sheet's "AC Milan".
const sameClub = (a, b) => {
  const x = knownClub(a), y = knownClub(b);
  if (x && y) return x === y;
  return sameName(clubTokens)(a, b);
};

const sameName = (tokenize) => (a, b) => {
  const x = tokenize(a), y = tokenize(b);
  if (!x.length || !y.length) return false;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.every((token) => long.includes(token));
};

// The sheet's spelling of a game name: the sheet's own cell for that season and
// competition when it names the same club or manager, else the one sheet name
// that matches, else the game's name (the game is the source of truth).
export const sheetSpelling = (gameName, sameSlot, sheetNames, kind) => {
  const name = clean(gameName);
  if (!name) return "";
  const match = kind === "club" ? sameClub : sameName(managerTokens);
  if (sameSlot && match(name, sameSlot)) return clean(sameSlot);
  const candidates = [...new Set(sheetNames.map(clean).filter(Boolean))].filter((sheet) => match(name, sheet));
  return candidates.length === 1 ? candidates[0] : name;
};

const compKey = (value) => plainTokens(value).join("");

// A sheet column the game runs (replaced by Sync for seasons it has read).
const GAME_COLUMN = /(division|play-?off|charity|top 100|smfa|super cup|champions cup|league)/i;
export const isGameCompetition = (header, gameKeys = new Set()) =>
  gameKeys.has(compKey(header)) || (GAME_COLUMN.test(clean(header)) && !/youth/i.test(clean(header)));

// sheetValues: the sheet range as returned by the Sheets API ([headers, ...rows]).
// gameRows: public_game_world_honours rows (season_num, competition, display_order,
// club_name, manager_name). kind: "club" or "manager".
export const mergeHonoursWide = (sheetValues = [], gameRows = [], kind = "club") => {
  const valueKey = kind === "club" ? "club_name" : "manager_name";
  const [rawHeaders = [], ...rawRows] = Array.isArray(sheetValues) ? sheetValues : [];
  const headers = rawHeaders.map(clean);
  let seasonIndex = headers.findIndex((h) => ["season", "seas", "s"].includes(h.toLowerCase()));

  const games = (Array.isArray(gameRows) ? gameRows : []).filter((row) => Number(row?.season_num) > 0 && clean(row?.competition) && clean(row?.[valueKey]));
  if (!games.length) return sheetValues;
  if (seasonIndex === -1) { headers.unshift("Season"); seasonIndex = 0; rawRows.forEach((row) => row.unshift("")); }

  const gameKeys = new Set(games.map((row) => compKey(row.competition)));
  const columnByKey = new Map(headers.map((h, i) => [compKey(h), i]).filter(([key], i) => key && i !== seasonIndex));

  // Game competitions the sheet has no column for get one, in the game's order.
  [...games].sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0)).forEach((row) => {
    const key = compKey(row.competition);
    if (!columnByKey.has(key)) { columnByKey.set(key, headers.length); headers.push(clean(row.competition)); }
  });

  const seasonOf = (value) => { const m = clean(value).match(/(\d+)/); return m ? Number(m[1]) : null; };
  const rows = rawRows.map((row) => headers.map((_, i) => clean(row?.[i])));
  const rowBySeason = new Map();
  rows.forEach((row) => { const season = seasonOf(row[seasonIndex]); if (season && !rowBySeason.has(season)) rowBySeason.set(season, row); });

  const columnNames = (index) => rows.map((row) => row[index]).filter(Boolean);
  const allSheetNames = headers.flatMap((h, i) => (i !== seasonIndex && isGameCompetition(h, gameKeys) ? columnNames(i) : []));

  const bySeason = new Map();
  games.forEach((row) => { const season = Number(row.season_num); if (!bySeason.has(season)) bySeason.set(season, []); bySeason.get(season).push(row); });

  for (const [season, seasonGames] of bySeason) {
    let row = rowBySeason.get(season);
    const original = row ? [...row] : null;
    if (!row) { row = headers.map(() => ""); row[seasonIndex] = String(season); rows.push(row); rowBySeason.set(season, row); }
    // Sync has this season: every game column comes from Sync, not the sheet.
    headers.forEach((h, i) => { if (i !== seasonIndex && isGameCompetition(h, gameKeys)) row[i] = ""; });
    for (const game of seasonGames) {
      const index = columnByKey.get(compKey(game.competition));
      row[index] = sheetSpelling(game[valueKey], original?.[index], allSheetNames, kind);
    }
  }

  rows.sort((a, b) => (seasonOf(b[seasonIndex]) || 0) - (seasonOf(a[seasonIndex]) || 0));
  return [headers, ...rows];
};

// Seasons Sync has honours for, newest first.
export const gameHonoursSeasons = (gameRows = []) =>
  [...new Set((Array.isArray(gameRows) ? gameRows : []).map((row) => Number(row?.season_num)).filter((n) => n > 0))].sort((a, b) => b - a);
