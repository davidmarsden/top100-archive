import { allocateVacancies, eligibility, finishedSeasonWith, finishScore, scoreApplicant } from "./appointmentScoring";

const rows = [
  { season: 25, division: 2, position: 2, team: "Alpha", manager: "Ann" },
  { season: 26, division: 1, position: 8, team: "Alpha", manager: "Ann", valueAdded: 3 },
  { season: 27, division: 1, position: 5, team: "Alpha", manager: "Ann", valueAdded: 4 },
  { season: 28, division: 1, position: 3, team: "Alpha", manager: "Ann", valueAdded: 2 },
  { season: 26, division: 4, position: 1, team: "Beta", manager: "Bob" },
  { season: 27, division: 3, position: 19, team: "Beta", manager: "Bob" },
  { season: 28, division: 4, position: 6, team: "Beta", manager: "Bob", valueAdded: 4 },
  { season: 27, division: 2, position: 12, team: "Gamma", manager: "Cy / Dee" },
  { season: 28, division: 2, position: 19, team: "Gamma", manager: "Dee" },
];

test("credits a shared season to the manager who finished it", () => {
  expect(finishedSeasonWith(rows[7], "Dee")).toBe(true);
  expect(finishedSeasonWith(rows[7], "Cy")).toBe(false);
});

test("finish score blends the division and the 100-club pyramid", () => {
  expect(finishScore(1, 1)).toBe(1);
  expect(finishScore(5, 20)).toBeCloseTo(0.03, 2);
  expect(finishScore(3, 1)).toBeGreaterThan(finishScore(3, 10));
});

test("scores honours from the archive, including promotions seen in the next season", () => {
  const ann = scoreApplicant({ manager: "Ann", currentSeason: 28, rows });
  expect(ann.facts).toMatchObject({ promotions: 1, d1Seasons: 3, d1TopHalf: 3, tenure: 4 });
  const bob = scoreApplicant({ manager: "Bob", currentSeason: 28, rows });
  expect(bob.facts).toMatchObject({ otherTitles: 1, promotions: 1, relegations: 1 });
  expect(bob.facts.bottomThreeLastFive).toEqual(["S27 D3 19th Beta"]);
  expect(ann.total).toBeGreaterThan(bob.total);
  expect(ann.total).toBeLessThanOrEqual(100);
});

test("applies the eligibility rules", () => {
  const dee = scoreApplicant({ manager: "Dee", currentSeason: 28, rows });
  expect(eligibility(dee, { club: "Zeta", division: 1 }).reasons).toContain(
    "In the bottom three this season (subject to the automatic sacking rule)."
  );
  const bob = scoreApplicant({ manager: "Bob", currentSeason: 28, rows });
  expect(eligibility(bob, { club: "Zeta", division: 1 }).eligible).toBe(false);
  expect(eligibility(bob, { club: "Zeta", division: 2 }).eligible).toBe(true);
  expect(eligibility(bob, { club: "Zeta", division: 2 }, { openSanction: "transfer ban" }).eligible).toBe(false);
});

test("allocates by score and preference, skipping ineligible clubs", () => {
  const scored = ["Ann", "Bob", "Dee"].map((manager) => scoreApplicant({ manager, currentSeason: 28, rows }));
  const vacancies = [
    { club: "Zeta", division: 1 },
    { club: "Eta", division: 2 },
  ];
  const result = allocateVacancies(scored, vacancies, { Ann: ["Eta", "Zeta"] });
  expect(result.appointments).toEqual([expect.objectContaining({ club: "Eta", manager: "Ann", vacates: "Alpha" })]);
  expect(result.unfilled).toEqual(["Zeta"]);
  expect(result.unplaced).toEqual(["Bob", "Dee"]);
});
