import { allocateVacancies, cupPoints, managerSupply, eligibility, finishedSeasonWith, finishScore, reviewSackedManager, scoreApplicant, spellFinish } from "./appointmentScoring";

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

test("cups count in honours, by competition and (for SMFA) season, capped", () => {
  const at = (season) => (competition) => cupPoints(competition, season);
  expect(["SMFA Super Cup", "SMFA Champions Cup", "SMFA Shield", "World Club Cup", "WCC", "World Club Shield", "Top 100 Cup", "Top 100 Shield", "Youth Cup", "Charity Shield", "Youth Shield"].map(at(27)))
    .toEqual([3, 3, 3, 3, 3, 1.5, 2, 2, 1, 1, 0.5]);
  // Before Soccer Manager's Gold update (S23 and earlier), SMFA trophies count nothing.
  expect(["SMFA Super Cup", "SMFA Champions Cup", "SMFA Shield", "Top 100 Cup"].map(at(23))).toEqual([0, 0, 0, 2]);
  const without = scoreApplicant({ manager: "Ann", currentSeason: 28, rows });
  const cups = [
    { season: 27, competition: "SMFA Shield" },
    { season: 26, competition: "Top 100 Cup" },
    { season: 25, competition: "Youth Cup" },
    { season: 29, competition: "Top 100 Shield" }, // after the season scored: not counted
  ];
  const withCups = scoreApplicant({ manager: "Ann", currentSeason: 28, rows, cups });
  expect(withCups.facts).toMatchObject({ cups: 3, cupPoints: 6 });
  expect(withCups.breakdown.honours).toBe(Math.min(15, without.breakdown.honours + 6));
  const many = scoreApplicant({ manager: "Ann", currentSeason: 28, rows, cups: Array.from({ length: 10 }, () => ({ season: 27, competition: "SMFA Super Cup" })) });
  expect(many.breakdown.honours).toBe(15);
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

test("scores a confirmed mid-season spell on the manager's own games", () => {
  // D3: Raul took over after 16 games (7 points) and took 41 points from the last 22.
  const table = [
    { season: 28, division: 3, position: 1, team: "Top", manager: "T", played: 38, points: 67 },
    { season: 28, division: 3, position: 2, team: "Next", manager: "N", played: 38, points: 66 },
    { season: 28, division: 3, position: 16, team: "Saint", manager: "Raul", played: 38, points: 48, valueAdded: -12 },
    { season: 28, division: 3, position: 20, team: "Last", manager: "L", played: 38, points: 33 },
  ];
  const whole = scoreApplicant({ manager: "Raul", currentSeason: 28, rows: table });
  const spell = { startedOn: "2026-08-21", games: 22, points: 41, confirmed: true };
  const own = scoreApplicant({ manager: "Raul", currentSeason: 28, rows: table, spell });
  expect(spellFinish(spell, { season: 28, division: 3, team: "Saint" }, table)).toMatchObject({ projectedPoints: 71, projectedPosition: 1 });
  expect(whole.breakdown.current).toBe(4.2);
  expect(own.breakdown.current).toBe(13.6); // 1st-place pace (12 x 0.8) + half marks against squad strength
  expect(own.facts.currentJoinedMidSeason).toBe(true);
  expect(own.facts.currentValueAdded).toBeNull();
  // Unconfirmed, or too few games, or the whole season: no change, or half marks.
  expect(scoreApplicant({ manager: "Raul", currentSeason: 28, rows: table, spell: { ...spell, confirmed: false } }).breakdown.current).toBe(4.2);
  expect(scoreApplicant({ manager: "Raul", currentSeason: 28, rows: table, spell: { ...spell, games: 6, points: 10 } }).breakdown.current).toBe(10);
  expect(scoreApplicant({ manager: "Raul", currentSeason: 28, rows: table, spell: { ...spell, games: 38, points: 48 } }).breakdown.current).toBe(4.2);
});

test("scores activity from measured data, with half marks for anything missing and none for no role", () => {
  const unassessed = scoreApplicant({ manager: "Ann", currentSeason: 28, rows });
  expect(unassessed.breakdown.activity).toBe(8.5);
  expect(unassessed.notes).toContain("Half marks used for: competitions, market, squadBuilding, community, focus.");
  const inactive = scoreApplicant({ manager: "Ann", currentSeason: 28, rows, activity: { competitions: 0, topManagerDeals: 0, squadRankGain: -20, community: 0, gameWorlds: 20 } });
  const active = scoreApplicant({ manager: "Ann", currentSeason: 28, rows, activity: { competitions: 2, topManagerDeals: 15, squadRankGain: 25, running: 3, community: 3, gameWorlds: 2 } });
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

  test("a routine review is reappointed, with the score and errors kept for context", () => {
    const full = review("Oz", { activity: idle });
    const routine = review("Oz", { activity: idle, options: { routine: true } });
    expect(full.outcome).not.toBe("reappoint");
    expect(routine.total).toBe(full.total);
    expect(routine.errors).toEqual(full.errors);
    expect(routine.outcome).toBe("reappoint");
    expect(routine.vote).toBe(false);
    expect(routine.facts.routine).toBe(true);
    expect(routine.reason).toMatch(/^Routine review: reappointed \(3\.1\)\. For context/);
    expect(managerSupply([routine]).openClubs).toBe(0);
  });

  test("a routine review is still barred by the hard rules", () => {
    expect(review("Oz", { options: { routine: true, gold: false } }).outcome).toBe("leave");
  });

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

test("managing in fewer game worlds scores better for focus", () => {
  const rows = [{ season: "28", division: "2", position: "10", team: "Club", manager: "Ann", played: "38" }];
  const focus = (gameWorlds) => scoreApplicant({ manager: "Ann", currentSeason: 28, rows, activity: { gameWorlds } }).facts.activity.focus;
  expect([2, 3, 4, 9, 11, 15].map(focus)).toEqual([2, 2, 1.8, 0.5, 0, 0]);
});

test("takes forfeits this season off an applicant's stability, beyond the disciplinary points", () => {
  const clean = scoreApplicant({ manager: "Ann", currentSeason: 28, rows });
  const twoForfeits = scoreApplicant({ manager: "Ann", currentSeason: 28, rows, discipline: { forfeits: 2 } });
  expect(twoForfeits.breakdown.stability).toBe(Math.max(0, clean.breakdown.stability - 5));
  expect(twoForfeits.facts.forfeits).toBe(2);
  const many = scoreApplicant({ manager: "Ann", currentSeason: 28, rows, discipline: { forfeits: 20 } });
  expect(many.breakdown.stability).toBe(0);
});
