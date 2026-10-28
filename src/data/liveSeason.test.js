import { buildLiveSeasonRows, resolveManagerName, toSheetCsv } from "./liveSeason";

const sheet = [
  { season: "27", team: "Sampdoria", manager: "Beddows" },
  { season: "27", team: "Sevilla FC", manager: "TRX" },
  { season: "27", team: "AC Milan", manager: "Thomas" },
  { season: "27", team: "Manchester City", manager: "Allington / Rimmer" },
  { season: "27", team: "Cruzeiro EC", manager: "Allington" },
  { season: "26", team: "Beşiktaş JK", manager: "Mc02" },
  { season: "20", team: "Leicester City", manager: "Thompson" },
];

test("maps live Soccer Manager names onto the sheet's short names", () => {
  expect(resolveManagerName("Sir Stephen Beddows (God)", "Sampdoria", sheet)).toBe("Beddows");
  expect(resolveManagerName("Mister TRX", "Sevilla FC", sheet)).toBe("TRX");
  expect(resolveManagerName("simon thomas", "AC Milan", sheet)).toBe("Thomas");
  expect(resolveManagerName("yamil Mc02", "Beşiktaş JK", sheet)).toBe("Mc02");
  expect(resolveManagerName("Steven Allington", "Cruzeiro EC", sheet)).toBe("Allington");
});

test("keeps the live name for a new or ambiguous manager", () => {
  expect(resolveManagerName("Gianluca Ghio", "Hellas Verona", sheet)).toBe("Gianluca Ghio");
  expect(resolveManagerName("", "Hellas Verona", sheet)).toBe("");
});

test("adds the live season only while the sheet does not have it", () => {
  const live = [{ season: 28, division: 3, position: 1, team: "Sampdoria", played: 35, points: 64, manager: "Sir Stephen Beddows (God)", season_complete: false }];
  const rows = buildLiveSeasonRows(live, sheet);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ season: "28", division: "3", position: "1", manager: "Beddows", live: true, inProgress: true });
  expect(buildLiveSeasonRows(live, [...sheet, { season: "28", team: "Sampdoria" }])).toEqual([]);
});

test("exports rows in the Full History column layout", () => {
  const csv = toSheetCsv([{ season: "28", division: "1", position: "20", team: "Juventus", played: "38", won: "2", drawn: "6", lost: "30", goals_for: "20", goals_against: "92", goal_difference: "-72", points: "12", manager: "Mcgregor" }]);
  expect(csv.split("\n")[0]).toBe("Season,Div,Pos,,Team,P,W,D,L,GF,GA,GD,Pts,,Start date,,Manager");
  expect(csv.split("\n")[1]).toBe("28,1,20,,Juventus,38,2,6,30,20,92,-72,12,,,,Mcgregor");
});
