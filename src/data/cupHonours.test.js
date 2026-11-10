import { buildCupHonours, cupWins, isCupColumn, sameManager, summariseCups } from "./cupHonours";

const clubs = [
  ["Season", "Division 1", "Division 2 Play-off", "Top 100 Cup", "Youth Cup", "WCC"],
  ["S27", "Bayern Munich", "Lazio", "Bayern Munich", "Ajax", ""],
  ["S28", "Real Madrid", "Lazio", "Ajax", "Bayern München", "Bayern Munich"],
];
const managers = [
  ["Season", "Division 1", "Division 2 Play-off", "Top 100 Cup", "Youth Cup", "WCC"],
  ["S27", "Bojan H", "X", "Bojan H", "Tom L", ""],
  ["S28", "Someone", "X", "Tom Lee", "Bojan H", "Bojan H"],
];

test("cup columns leave out league titles and play-offs", () => {
  expect(["Division 1", "Division 2 Play-off", "Season"].map(isCupColumn)).toEqual([false, false, false]);
  expect(["Top 100 Cup", "Charity Shield", "SMFA Super Cup", "Youth Shield", "WCC"].every(isCupColumn)).toBe(true);
  expect(isCupColumn("Youth Spoon")).toBe(false);
  expect(isCupColumn("World Cup")).toBe(false);
  expect(isCupColumn("World Club Cup")).toBe(true);
  expect(cupWins(clubs)).toHaveLength(5);
});

test("manager names: initials only match exactly", () => {
  expect(sameManager("Tom L", "Tom Lee")).toBe(false);
  expect(sameManager("Bojan H", "bojan h")).toBe(true);
  expect(sameManager("Beddows Stephen", "Sir Stephen Beddows")).toBe(true);
});

test("a manager's and a club's cups, with the other side named", () => {
  const cups = buildCupHonours({ clubs, managers });
  expect(cups.forManager("Bojan H")).toEqual([
    { season: 27, competition: "Top 100 Cup", club: "Bayern Munich" },
    { season: 28, competition: "Youth Cup", club: "Bayern München" },
    { season: 28, competition: "WCC", club: "Bayern Munich" },
  ]);
  expect(cups.forClub("Bayern Munich").map((h) => `${h.season} ${h.competition}`)).toEqual(["27 Top 100 Cup", "28 Youth Cup", "28 WCC"]);
  expect(summariseCups(cups.forClub("Ajax"))).toEqual([
    { competition: "Top 100 Cup", count: 1, seasons: [28] },
    { competition: "Youth Cup", count: 1, seasons: [27] },
  ]);
});

test("a differently spelt manager counts through the club they ran that season", () => {
  const cups = buildCupHonours({
    clubs: [["Season", "Top 100 Cup", "Youth Cup"], ["S27", "Bayern München", "Ajax"]],
    managers: [["Season", "Top 100 Cup", "Youth Cup"], ["S27", "Bojan", "Bojan Other"]],
  });
  expect(cups.forManager("Bojan H")).toEqual([]);
  expect(cups.forManager("Bojan H", [{ season: 27, club: "Bayern Munich" }])).toEqual([
    { season: 27, competition: "Top 100 Cup", club: "Bayern München" },
  ]);
  // Same first word but another club that season: not theirs.
  expect(cups.forManager("Tom Lee", [{ season: 27, club: "Lazio" }])).toEqual([]);
});

test("short archive names match full honours names through the club", () => {
  const cups = buildCupHonours({
    clubs: [["Season", "Top 100 Cup", "SMFA Shield"], ["S27", "Chelsea", "Porto"]],
    managers: [["Season", "Top 100 Cup", "SMFA Shield"], ["S27", "James Mckenzie", "André Guerra"]],
  });
  expect(cups.forManager("J. Mckenzie", [{ season: 27, club: "Chelsea" }])).toHaveLength(1);
  expect(cups.forManager("Guerra", [{ season: 27, club: "FC Porto" }])).toHaveLength(1);
  // Another Mckenzie at another club that season gets nothing.
  expect(cups.forManager("S. Mckenzie", [{ season: 27, club: "Arsenal" }])).toEqual([]);
});

test("a longer name is a different manager unless they ran the winning club", () => {
  const cups = buildCupHonours({
    clubs: [["Season", "Top 100 Shield", "Division 4"], ["S12", "Standard Liège", ""], ["S26", "", "FC Basel"]],
    managers: [["Season", "Top 100 Shield", "Division 4"], ["S12", "The FM 2025", ""], ["S26", "", "The FM"]],
  });
  expect(cups.forManager("The FM", [{ season: 26, club: "FC Basel" }, { season: 28, club: "Málaga CF" }])).toEqual([]);
  expect(cups.forManager("The FM 2025", [])).toHaveLength(1);
});
