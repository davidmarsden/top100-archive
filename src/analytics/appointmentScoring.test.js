import { allocateVacancies, applyManagerSupply, eligibility, finishedSeasonWith, finishScore, reviewSackedManager, scoreApplicant } from "./appointmentScoring";

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

test("scores activity from measured data, with half marks for anything missing and none for no role", () => {
  const unassessed = scoreApplicant({ manager: "Ann", currentSeason: 28, rows });
  expect(unassessed.breakdown.activity).toBe(8.5);
  expect(unassessed.notes).toContain("Half marks used for: competitions, market, squadBuilding, community.");
  const inactive = scoreApplicant({ manager: "Ann", currentSeason: 28, rows, activity: { competitions: 0, topManagerDeals: 0, squadRankGain: -20, community: 0 } });
  const active = scoreApplicant({ manager: "Ann", currentSeason: 28, rows, activity: { competitions: 2, topManagerDeals: 15, squadRankGain: 25, running: 3, community: 3 } });
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

test("leaves a season with no value-added data out of the recent average", () => {
  const known = [
    { season: 26, division: 1, position: 5, team: "Delta", manager: "Eve", valueAdded: 10 },
    { season: 27, division: 1, position: 5, team: "Delta", manager: "Eve" },
  ];
  const missing = [known[0], { ...known[1], valueAdded: null }];
  const a = scoreApplicant({ manager: "Eve", currentSeason: 28, rows: known });
  const b = scoreApplicant({ manager: "Eve", currentSeason: 28, rows: missing });
  expect(b.breakdown.recent).toBe(a.breakdown.recent);
});

describe("bottom-three review", () => {
  const history = [
    { season: 26, division: 2, position: 6, team: "Kilo", manager: "Kim", valueAdded: 3 },
    { season: 27, division: 2, position: 8, team: "Kilo", manager: "Kim", valueAdded: 2 },
    { season: 28, division: 2, position: 19, team: "Kilo", manager: "Kim", valueAdded: 1 },
    { season: 26, division: 2, position: 18, team: "Lima", manager: "Lou", valueAdded: -6 },
    { season: 27, division: 2, position: 19, team: "Lima", manager: "Lou", valueAdded: -8 },
    { season: 28, division: 2, position: 20, team: "Lima", manager: "Lou", valueAdded: -15 },
    { season: 28, division: 2, position: 18, team: "Mike", manager: "Old / Max", valueAdded: -10 },
  ];
  const active = { competitions: 2, topManagerDeals: 10, squadRankGain: 10, community: 3 };
  const idle = { competitions: 0, topManagerDeals: 0, squadRankGain: -10, community: 0 };

  test("reappoints a manager who did well against a weak squad and is active", () => {
    const kim = reviewSackedManager({ manager: "Kim", currentSeason: 28, rows: history, activity: active });
    expect(kim.outcome).toBe("reappoint");
    expect(kim.total).toBeGreaterThanOrEqual(60);
  });

  test("suggests a break after repeated bottom-three finishes below the squad's level", () => {
    const lou = reviewSackedManager({ manager: "Lou", currentSeason: 28, rows: history, activity: idle });
    expect(lou.outcome).toBe("break");
    expect(lou.facts.earlierBottomThree).toEqual(["S26 D2 18th Lima", "S27 D2 19th Lima"]);
  });

  test("always reappoints a manager who took over during the season", () => {
    const max = reviewSackedManager({ manager: "Max", currentSeason: 28, rows: history, activity: idle });
    expect(max.outcome).toBe("reappoint");
    expect(max.vote).toBe(false);
    const inactive = reviewSackedManager({ manager: "Max", currentSeason: 28, rows: history, options: { inactive: "No login for 10 days" } });
    expect(inactive.outcome).toBe("break");
  });

  test("an inactive manager is not reappointed, and close scores go to a vote", () => {
    expect(reviewSackedManager({ manager: "Kim", currentSeason: 28, rows: history, activity: active, options: { inactive: "No login for 10 days" } }).outcome).toBe("break");
    const close = reviewSackedManager({ manager: "Kim", currentSeason: 28, rows: history });
    expect(close.vote).toBe(Math.abs(close.total - 55) < 5 || Math.abs(close.total - 40) < 5);
  });

  test("a standing reappointment is not scored into another outcome", () => {
    const lou = reviewSackedManager({ manager: "Lou", currentSeason: 28, rows: history, activity: idle, options: { standing: "Top 100's founder at Genoa" } });
    expect(lou.outcome).toBe("reappoint");
    expect(lou.vote).toBe(false);
  });

  test("breaks only as many as newcomers can replace, lowest scores first", () => {
    const low = reviewSackedManager({ manager: "Lou", currentSeason: 28, rows: history, activity: idle });
    const lower = { ...low, manager: "Lower", total: low.total - 5 };
    const forced = reviewSackedManager({ manager: "Kim", currentSeason: 28, rows: history, options: { inactive: "No login for 10 days" } });
    const none = applyManagerSupply([low, lower, forced], { newcomers: 2, leavers: 1 });
    expect(none.places).toBe(0);
    expect(none.reviews.map((review) => review.outcome)).toEqual(["anotherClub", "anotherClub", "break"]);
    const one = applyManagerSupply([low, lower, forced], { newcomers: 3, leavers: 1 });
    expect(one.reviews.map((review) => review.outcome)).toEqual(["anotherClub", "break", "break"]);
  });

  test("gives a manager new to Top 100 half marks for their record", () => {
    const rows = [{ season: 28, division: 4, position: 18, team: "November", manager: "Nia", valueAdded: 0 }];
    expect(reviewSackedManager({ manager: "Nia", currentSeason: 28, rows }).breakdown.record).toBe(7.5);
  });
});
