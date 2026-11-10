// Cup honours for profiles: every honours column that isn't a league title or a
// play-off (profiles already count those from the league tables). That covers
// the Top 100 Cup and Shield, Charity Shield, SMFA cups, Youth Cup and Shield and
// any World Club or other cup column in the winners sheet. Input is the merged
// wide honours tables from loadHonoursTables() ([headers, ...rows]).
import { sameClub } from "./gameHonours.js";

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const tokens = (value) =>
  clean(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

const SEASON_HEADERS = new Set(["season", "seas", "s"]);
export const isCupColumn = (header) => {
  const h = clean(header).toLowerCase();
  if (!h || SEASON_HEADERS.has(h)) return false;
  if (/play-?off/.test(h)) return false;
  // Not counted: the Youth Spoon (and any wooden spoon) and the World Cup.
  if (/spoon/.test(h) || /\bworld cup\b/.test(h)) return false;
  return !/^(division|div|d)\s*\d+$/.test(h) && !/^league\b/.test(h);
};

// Long list: { season, competition, winner } for each cup win in a wide table.
export const cupWins = (values) => {
  const [headers = [], ...rows] = Array.isArray(values) ? values : [];
  const seasonIndex = headers.findIndex((h) => SEASON_HEADERS.has(clean(h).toLowerCase()));
  if (seasonIndex === -1) return [];
  const columns = headers.map((h, i) => ({ competition: clean(h), i })).filter(({ competition, i }) => i !== seasonIndex && isCupColumn(competition));
  return rows.flatMap((row) => {
    const season = Number(clean(row?.[seasonIndex]).match(/\d+/)?.[0]);
    if (!season) return [];
    return columns
      .map(({ competition, i }) => ({ season, competition, winner: clean(row?.[i]) }))
      .filter((win) => win.winner);
  });
};

// Managers: the same name, or one name's words all inside the other's when both
// have at least two words and neither is an initial ("Tom L" is not "Tom Lee").
export const sameManager = (a, b) => {
  const x = tokens(a), y = tokens(b);
  if (!x.length || !y.length) return false;
  if (x.join(" ") === y.join(" ")) return true;
  if (x.length < 2 || y.length < 2 || [...x, ...y].some((t) => t.length === 1)) return false;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.every((t) => long.includes(t));
};

// tables: { clubs, managers } wide values. Returns the lists both lookups use.
export const buildCupHonours = (tables) => {
  const clubWins = cupWins(tables?.clubs);
  const managerWins = cupWins(tables?.managers);
  const clubFor = (season, competition) =>
    clubWins.find((win) => win.season === season && win.competition === competition)?.winner || "";
  const managerFor = (season, competition) =>
    managerWins.find((win) => win.season === season && win.competition === competition)?.winner || "";
  return {
    // career: [{ season, club }] from the league history. A win counts on the
    // same name, or when the manager ran the winning club that season and the
    // names share a word of two letters or more: the honours tables often use
    // full names where the league history is short ("André Guerra" for
    // "Guerra"). Similar names alone are not enough: "The FM 2025" (Bayern,
    // Standard Liège) is not "The FM" (Málaga).
    forManager: (name, career = []) =>
      managerWins
        .filter((win) => {
          if (tokens(win.winner).join(" ") === tokens(name).join(" ")) return true;
          const words = tokens(name).filter((t) => t.length > 1);
          if (!tokens(win.winner).some((t) => t.length > 1 && words.includes(t))) return false;
          const club = clubFor(win.season, win.competition);
          return Boolean(club) && career.some((spell) => Number(spell.season) === win.season && sameClub(spell.club, club));
        })
        .map((win) => ({ season: win.season, competition: win.competition, club: clubFor(win.season, win.competition) })),
    forClub: (name) =>
      clubWins
        .filter((win) => sameClub(win.winner, name))
        .map((win) => ({ season: win.season, competition: win.competition, manager: managerFor(win.season, win.competition) })),
  };
};

// [{ competition, count, seasons }] most wins first.
export const summariseCups = (honours = []) => {
  const byCompetition = new Map();
  honours.forEach((honour) => {
    const entry = byCompetition.get(honour.competition) || { competition: honour.competition, count: 0, seasons: [] };
    entry.count += 1;
    entry.seasons.push(honour.season);
    byCompetition.set(honour.competition, entry);
  });
  return [...byCompetition.values()]
    .map((entry) => ({ ...entry, seasons: entry.seasons.sort((a, b) => b - a) }))
    .sort((a, b) => b.count - a.count || a.competition.localeCompare(b.competition));
};
