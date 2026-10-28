import { getManagerCareerSummary } from "./managerAnalytics";

test("counts no titles or sackings from a season still in progress", () => {
  const rows = [
    { season: "S27", division: "1", position: "1", team: "Alpha", manager: "Ann" },
    { season: "S28", division: "1", position: "1", team: "Alpha", manager: "Ann", inProgress: true },
    { season: "S28", division: "1", position: "20", team: "Beta", manager: "Bob", inProgress: true },
  ];
  expect(getManagerCareerSummary("Ann", rows, []).titles).toBe(1);
  expect(getManagerCareerSummary("Bob", rows, []).autoSackings).toBe(0);
});
