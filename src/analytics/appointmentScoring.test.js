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

test("never counts a season taken over part-way through against the manager", () => {
  const history = [
    { season: 27, division: 1, position: 13, team: "City", manager: "Al / Rim" },
    { season: 27, division: 1, position: 20, team: "Cruz", manager: "Al" },
    { season: 28, division: 2, position: 19, team: "Cruz", manager: "Al" },
    { season: 28, division: 2, position: 18, team: "Bee", manager: "Old / New" },
  ];
  const al = scoreApplicant({ manager: "Al", currentSeason: 28, rows: history });
  expect(al.facts.bottomThreeLastFive).toEqual(["S28 D2 19th Cruz"]);
  expect(al.facts.midSeasonBottomThree).toEqual(["S27 D1 20th Cruz"]);
  const latecomer = scoreApplicant({ manager: "New", currentSeason: 28, rows: history });
  expect(latecomer.facts.currentJoinedMidSeason).toBe(true);
  expect(latecomer.facts.bottomThreeLastFive).toEqual([]);
});

test("scores activity from measured data, with half marks for anything missing", () => {
  const unassessed = scoreApplicant({ manager: "Ann", currentSeason: 28, rows });
  expect(unassessed.breakdown.activity).toBe(10);
  expect(unassessed.notes).toContain("Half marks used for: competitions, market, squadBuilding, community.");
  const inactive = scoreApplicant({ manager: "Ann", currentSeason: 28, rows, activity: { competitions: 0, topManagerDeals: 0, squadRankGain: -20, community: 0 } });
  const active = scoreApplicant({ manager: "Ann", currentSeason: 28, rows, activity: { competitions: 2, topManagerDeals: 15, squadRankGain: 25, community: 4 } });
  expect(inactive.breakdown.activity).toBe(0);
  expect(active.breakdown.activity).toBe(20);
});

test("applies the eligibility rules and weighs the rest", () => {
  const dee = scoreApplicant({ manager: "Dee", currentSeason: 28, rows });
  // In the bottom three, but that is weighed in the score rather than ruled out.
  expect(eligibility(dee, { club: "Zeta", division: 1 }).eligible).toBe(true);
  expect(dee.facts.bottomThreeLastFive).toEqual(["S28 D2 19th Gamma"]);
  const newcomer = scoreApplicant({ manager: "Cy", currentSeason: 28, rows: [...rows, { season: 28, division: 3, position: 5, team: "Delta", manager: "Cy" }] });
  expect(eligibility(newcomer, { club: "Zeta", division: 1 }).reasons).toEqual(["Less than a second season at the current club."]);
  const bob = scoreApplicant({ manager: "Bob", currentSeason: 28, rows });
  expect(eligibility(bob, { club: "Zeta", division: 1 }).eligible).toBe(true);
  expect(eligibility(bob, { club: "Zeta", division: 2 }, { openSanction: "transfer ban" }).eligible).toBe(false);
  // A step up is weighed: Bob has no seasons in D1 or D2, but has them in D3.
  expect(bob.breakdown.level).toBe(0);
  expect(scoreApplicant({ manager: "Bob", currentSeason: 28, rows, level: 3 }).breakdown.level).toBeGreaterThan(0);
});

test("allocates the highest score for each applicant's preferred club", () => {
  const vacancies = [
    { club: "Zeta", division: 1 },
    { club: "Eta", division: 2 },
  ];
  const scoresByManager = Object.fromEntries(
    ["Ann", "Bob", "Dee"].map((manager) => [
      manager,
      Object.fromEntries(vacancies.map((v) => [v.club, scoreApplicant({ manager, currentSeason: 28, rows, level: v.division })])),
    ])
  );
  const result = allocateVacancies(scoresByManager, vacancies, { Ann: ["Eta", "Zeta"] });
  expect(result.appointments).toEqual([
    expect.objectContaining({ club: "Eta", manager: "Ann", vacates: "Alpha" }),
    expect.objectContaining({ club: "Zeta", manager: "Bob", vacates: "Beta" }),
  ]);
  expect(result.unfilled).toEqual([]);
  expect(result.unplaced).toEqual(["Dee"]);
});
