import { indexClubSpells, spellLines, spellsFor } from "./clubSpells";

const saint = [
  { season: 28, club: "AS Saint-Etienne", manager: "Carlos Miranda", endedOn: "2026-07-12", games: 4, points: 6, complete: true },
  { season: 28, club: "AS Saint-Etienne", manager: "Gianluca Ghio", startedOn: "2026-07-14", endedOn: "2026-07-24", games: 3, points: 1, complete: true },
  { season: 28, club: "AS Saint-Etienne", manager: "Raul A.", startedOn: "2026-08-21", games: 22, points: 41, complete: true },
];

test("lists a club-season's managers, with a line for a spell with no manager", () => {
  const index = indexClubSpells(saint);
  expect(spellsFor(index, "28", "AS SAINT-ETIENNE")).toHaveLength(3);
  expect(spellsFor(index, 27, "AS Saint-Etienne")).toBeNull();
  expect(spellLines(saint, 38)).toEqual([
    "Carlos Miranda: to 12 Jul · 4 games, 6 pts",
    "Gianluca Ghio: 14 Jul – 24 Jul · 3 games, 1 pt",
    "No manager: 24 Jul – 21 Aug · 9 games",
    "Raul A.: from 21 Aug · 22 games, 41 pts",
  ]);
  // Past seasons: dates only.
  expect(spellLines([{ manager: "A", endedOn: "2023-08-20" }, { manager: "B", startedOn: "2023-08-20" }])).toEqual(["A: to 20 Aug", "B: from 20 Aug"]);
});
