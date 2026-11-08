// Mid-season manager changes (netlify/functions/club-spells.js): for each club-season in which the
// manager changed, every spell with its dates and, for the current season, the manager's record.
import { normaliseClub } from "./clubNameUtils";

const key = (season, club) => `${Number(season)}|${normaliseClub(club)}`;

// { "28|saint etienne": [spell, ...] }, spells in order.
export const indexClubSpells = (spells = []) => {
  const index = new Map();
  spells.forEach((spell) => {
    const k = key(spell.season, spell.club);
    if (!index.has(k)) index.set(k, []);
    index.get(k).push(spell);
  });
  return index;
};

export const spellsFor = (index, season, club) => (index && club ? index.get(key(season, club)) || null : null);

const day = (value) => new Date(`${value}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const daysBetween = (a, b) => (new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86400000;

// One line per spell ("Raul A.: from 21 Aug · 22 games, 41 pts"), with a line for any gap of more
// than two days with no manager. played: the club's games this season, to count a gap's games when
// every spell's record is known.
export const spellLines = (spells = [], played = null) => {
  const gaps = spells.filter((spell, i) => spell.endedOn && spells[i + 1]?.startedOn && daysBetween(spell.endedOn, spells[i + 1].startedOn) > 2);
  // With every spell's record known and a single gap, the gap's games are the rest of the season's.
  const recorded = spells.every((spell) => Number.isFinite(spell.games) && spell.complete !== false);
  const rest = recorded && Number.isFinite(Number(played)) ? Number(played) - spells.reduce((sum, spell) => sum + spell.games, 0) : null;
  const gapGames = gaps.length === 1 && rest > 0 ? rest : null;
  const lines = [];
  spells.forEach((spell, i) => {
    const when = spell.startedOn && spell.endedOn ? `${day(spell.startedOn)} – ${day(spell.endedOn)}`
      : spell.startedOn ? `from ${day(spell.startedOn)}`
        : spell.endedOn ? `to ${day(spell.endedOn)}` : "all season";
    const record = Number.isFinite(spell.games)
      ? ` · ${plural(spell.games, "game")}, ${plural(spell.points, "pt")}${spell.complete === false ? " (approx.)" : ""}`
      : "";
    lines.push(`${spell.manager}: ${when}${record}`);
    if (gaps.includes(spell)) {
      lines.push(`No manager: ${day(spell.endedOn)} – ${day(spells[i + 1].startedOn)}${gapGames ? ` · ${plural(gapGames, "game")}` : ""}`);
    }
  });
  return lines;
};
