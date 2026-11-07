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
