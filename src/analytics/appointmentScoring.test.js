import { allocateVacancies, managerSupply, eligibility, finishedSeasonWith, finishScore, reviewSackedManager, scoreApplicant } from "./appointmentScoring";

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

test("a Gold membership is required to apply", () => {
  const ann = scoreApplicant({ manager: "Ann", currentSeason: 28, rows });
  expect(eligibility(ann, { club: "Zeta", division: 1 }, { gold: false }).reasons).toContain("Not a Gold member, which every Top 100 manager must be.");
  expect(eligibility(ann, { club: "Zeta", division: 1 }, { gold: true }).eligible).toBe(true);
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

describe("bottom-three review: the VAR standard and the S25 precedents", () => {
  const history = [
    { season: 26, division: 2, position: 6, team: "Kilo", manager: "Kim", valueAdded: 3 },
    { season: 27, division: 2, position: 8, team: "Kilo", manager: "Kim", valueAdded: 2 },
    { season: 28, division: 2, position: 19, team: "Kilo", manager: "Kim", valueAdded: 1 },
    { season: 27, division: 4, position: 19, team: "Lima", manager: "Lou", valueAdded: -3 },
    { season: 28, division: 4, position: 20, team: "Lima", manager: "Lou", valueAdded: -2 },
    { season: 28, division: 2, position: 18, team: "Mike", manager: "Old / Max", valueAdded: -10 },
    { season: 28, division: 1, position: 20, team: "Nova", manager: "Ned", valueAdded: -15 },
    { season: 28, division: 4, position: 18, team: "Oscar", manager: "Oz", valueAdded: -15 },
  ];
  const active = { competitions: 2, topManagerDeals: 10, squadRankGain: 10, running: 3, community: 3 };
  const idle = { competitions: 0, topManagerDeals: 0, squadRankGain: -10, community: 0 };
  const review = (manager, extra = {}) => reviewSackedManager({ manager, currentSeason: 28, rows: history, activity: active, ...extra });

  test("reappoints when there is no clear and obvious error", () => {
    const kim = review("Kim");
    expect(kim.outcome).toBe("reappoint");
    expect(kim.errors).toEqual([]);
    expect(kim.facts.lastChanceNext).toBe(false);
  });

  test("one error: a second chance is the admin team's decision, not a given", () => {
    const ned = review("Ned");
    expect(ned.errors.map((error) => error.kind)).toEqual(["collapse"]);
    expect(ned.outcome).toBe("secondChance");
    expect(ned.vote).toBe(true);
    expect(ned.facts.lastChanceNext).toBe(true);
    expect(review("Oz").outcome).toBe("secondChance");
  });

  test("two errors make reappointment a clear and obvious error", () => {
    const lou = review("Lou", { activity: { ...active, forfeits: 3 } });
    expect(lou.errors.map((error) => error.kind)).toEqual(["forfeits", "repeat"]);
    expect(lou.outcome).toBe("anotherClub");
    expect(review("Oz", { options: { lastChance: "told so in S27" } }).outcome).toBe("anotherClub");
    expect(review("Ned", { activity: idle }).outcome).toBe("anotherClub");
  });

  test("the score line is higher in D1-D2", () => {
    expect(review("Ned").facts.scoreLine).toBe(45);
    expect(review("Oz").facts.scoreLine).toBe(40);
  });

  test("no Gold, irregular logins, inactivity or misconduct: no club at all, even after a mid-season takeover", () => {
    const max = review("Max");
    expect(max.outcome).toBe("reappoint");
    expect(max.facts.lastChanceNext).toBe(false);
    const exempt = review("Max", { activity: idle });
    expect(exempt.errors.length).toBeGreaterThan(0);
    expect(exempt.outcome).toBe("reappoint");
    expect(exempt.facts.lastChanceNext).toBe(false);
    expect(review("Ned", { activity: idle, options: { standing: "Founder" } }).facts.lastChanceNext).toBe(false);
    expect(review("Kim", { options: { gold: false } }).outcome).toBe("leave");
    expect(review("Kim", { options: { gold: true } }).outcome).toBe("reappoint");
    expect(review("Max", { options: { loginGaps: 2 } }).outcome).toBe("leave");
    expect(review("Kim", { options: { loginGaps: 1 } }).outcome).toBe("reappoint");
    expect(review("Max", { options: { inactive: "No login for 10 days" } }).outcome).toBe("leave");
    expect(review("Kim", { options: { misconduct: "Abuse on the newsfeed" } }).outcome).toBe("leave");
  });

  test("a standing reappointment stands", () => {
    expect(review("Ned", { activity: idle, options: { standing: "Top 100's founder at Genoa" } }).outcome).toBe("reappoint");
  });

  test("a decision that turns on a close score goes to a vote", () => {
    const close = review("Ned", { activity: { competitions: 2, topManagerDeals: 8, community: 2 } });
    expect(close.errors.map((error) => error.kind)).toEqual(["collapse", "score"]);
    expect(Math.abs(close.total - 45)).toBeLessThan(5);
    expect(close.vote).toBe(true);
    expect(review("Kim").vote).toBe(false);
  });

  test("counts the clubs left needing a manager, without capping decisions", () => {
    const balance = managerSupply([review("Kim"), review("Ned", { activity: idle }), review("Max", { options: { inactive: "Inactive" } })], { newcomers: 2, leavers: 1 });
    expect(balance).toEqual({ openClubs: 3, newcomers: 2, managersAfter: 100, bigClubs: ["Nova"], undecided: [] });
    expect(managerSupply([review("Oz")]).undecided).toEqual(["Oscar"]);
  });

  test("gives a manager new to Top 100 half marks for their record", () => {
    const rows = [{ season: 28, division: 4, position: 18, team: "November", manager: "Nia", valueAdded: 0 }];
    expect(reviewSackedManager({ manager: "Nia", currentSeason: 28, rows }).breakdown.record).toBe(7.5);
  });
});
