import { gameHonoursSeasons, isGameCompetition, mergeHonoursWide, sheetSpelling } from "./gameHonours";

const sheetClubs = [
  ["Season", "Division 1", "Division 2 Play-off", "Top 100 Cup", "Youth Cup", "Youth Shield"],
  ["27", "Chelsea", "1. FC Koln", "Bayern Munich", "RCD Espanyol", "Stoke City"],
  ["26", "FC Porto", "", "Old Sheet Winner", "RCD Espanyol", "Arsenal"],
  ["25", "Verona", "Sheet only club", "Sheet Cup Winner", "Levante", ""],
];

const game = [
  { season_num: 27, competition: "Division 1", display_order: 1, club_name: "Chelsea", manager_name: "James Mckenzie" },
  { season_num: 27, competition: "Division 2 Play-off", display_order: 10, club_name: "1. FC Köln", manager_name: "Gursimran Brar" },
  { season_num: 27, competition: "Top 100 Cup", display_order: 7, club_name: "Bayern München", manager_name: "Bojan H" },
  { season_num: 27, competition: "SMFA Shield", display_order: 15, club_name: "São Paulo FC", manager_name: "Scott Mckenzie" },
  { season_num: 26, competition: "Division 1", display_order: 1, club_name: "FC Porto", manager_name: "André Guerra" },
  { season_num: 26, competition: "Top 100 Cup", display_order: 7, club_name: "Hellas Verona", manager_name: "Luís André Libras-Boas" },
  { season_num: 28, competition: "Charity Shield", display_order: 6, club_name: "Chelsea", manager_name: "James Mckenzie" },
];

const asObjects = (values) => {
  const [headers, ...rows] = values;
  return Object.fromEntries(rows.map((row) => [row[0], Object.fromEntries(headers.map((h, i) => [h, row[i]]))]));
};

test("game honours replace the sheet's game columns for the seasons Sync has", () => {
  const merged = asObjects(mergeHonoursWide(sheetClubs, game, "club"));
  // Sheet spelling kept when it names the same club.
  expect(merged["27"]["Division 2 Play-off"]).toBe("1. FC Koln");
  expect(merged["27"]["Top 100 Cup"]).toBe("Bayern Munich");
  // A game competition the sheet has no column for gets one.
  expect(merged["27"]["SMFA Shield"]).toBe("São Paulo FC");
  // The game wins a disagreement ("Old Sheet Winner" is replaced), spelled the way
  // the sheet writes that club elsewhere ("Verona").
  expect(merged["26"]["Top 100 Cup"]).toBe("Verona");
  // Sync read S26 and it has no play-off winner: the sheet's game column is cleared, not kept.
  expect(merged["26"]["Division 2 Play-off"]).toBe("");
  // Youth columns always come from the sheet.
  expect(merged["27"]["Youth Cup"]).toBe("RCD Espanyol");
  expect(merged["26"]["Youth Shield"]).toBe("Arsenal");
  // Seasons Sync hasn't read keep the sheet as it is.
  expect(merged["25"]["Top 100 Cup"]).toBe("Sheet Cup Winner");
  expect(merged["25"]["Division 2 Play-off"]).toBe("Sheet only club");
  // A season only Sync has is added, newest first.
  expect(merged["28"]["Charity Shield"]).toBe("Chelsea");
  expect(mergeHonoursWide(sheetClubs, game, "club")[1][0]).toBe("28");
});

test("manager names keep the sheet's short spelling when it is clearly the same person", () => {
  const sheet = [["Season", "Division 1", "Top 100 Cup"], ["27", "Mckenzie", "Bojan"]];
  const merged = asObjects(mergeHonoursWide(sheet, game, "manager"));
  expect(merged["27"]["Division 1"]).toBe("Mckenzie");
  expect(merged["27"]["Top 100 Cup"]).toBe("Bojan");
});

test("sheetSpelling prefers the same slot, then a unique match, else the game name", () => {
  expect(sheetSpelling("Sir Stephen Beddows (God)", "", ["Beddows", "Frank Hirst"], "manager")).toBe("Beddows");
  expect(sheetSpelling("Scott Mckenzie", "", ["James Mckenzie", "Mckenzie"], "manager")).toBe("Mckenzie");
  expect(sheetSpelling("Scott Mckenzie", "", ["James Mckenzie", "Scott Mckenzie"], "manager")).toBe("Scott Mckenzie");
  expect(sheetSpelling("Manchester City", "", ["Manchester United"], "club")).toBe("Manchester City");
  expect(sheetSpelling("Hellas Verona", "Chelsea", ["Verona", "Chelsea"], "club")).toBe("Verona");
});

test("without game honours the sheet is returned unchanged", () => {
  expect(mergeHonoursWide(sheetClubs, [], "club")).toBe(sheetClubs);
});

test("helpers", () => {
  expect(isGameCompetition("SMFA Champions Cup")).toBe(true);
  expect(isGameCompetition("Youth Cup")).toBe(false);
  expect(gameHonoursSeasons(game)).toEqual([28, 27, 26]);
});
