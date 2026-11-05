import { applicantHistory, buildArchive, levelBand, managerProfiles, scoreVacancies } from "./appointmentData";

const sheet = [
  { season: "27", division: "1", position: "5", team: "Genoa", points: "50", manager: "TRX" },
  { season: "27", division: "2", position: "1", team: "Lazio", points: "55", manager: "Beddows" },
];
const live = [{ season: 28, division: 1, position: 4, team: "Genoa", manager: "Mister TRX" }];

test("archive names resolve from the live season", () => {
  const archive = buildArchive({ sheetRows: sheet, liveRows: live });
  expect(archive.archiveName({ name: "Mister TRX", club: "Genoa" })).toBe("TRX");
});

test("archive names still resolve once the sheet has the live season", () => {
  const archived = [...sheet, { season: "28", division: "1", position: "4", team: "Genoa", points: "55", manager: "TRX" }];
  const archive = buildArchive({ sheetRows: archived, liveRows: live });
  expect(archive.liveSeason).toEqual([]);
  expect(archive.archiveName({ name: "Mister TRX", club: "Genoa" })).toBe("TRX");
  expect(archive.archiveName({ name: "Someone New", club: "Roma" })).toBe("Someone New");
});

test("an outgoing manager scored for comparison is credited with their club's season so far", () => {
  const history = [
    { season: "26", division: "1", position: "8", team: "Hellas Verona", points: "50", manager: "Libras" },
    { season: "27", division: "1", position: "6", team: "Hellas Verona", points: "55", manager: "Libras" },
  ];
  const liveRows = [{ season: 28, division: 1, position: 10, team: "Hellas Verona", manager: "Ghio" }];
  const archive = buildArchive({ sheetRows: history, liveRows });
  const config = {
    currentSeason: 28,
    vacancies: [{ club: "Hellas Verona", division: 1 }],
    applicants: [{ key: "cmp", name: "Libras", display: "Libras" }],
    preferences: { cmp: [] },
  };
  const without = scoreVacancies(archive, config).applicants[0].byVacancy["Hellas Verona"];
  config.applicants[0].seasonClub = "Hellas Verona";
  const scored = scoreVacancies(archive, config);
  const withClub = scored.applicants[0].byVacancy["Hellas Verona"];
  expect(without.breakdown.current).toBe(0);
  expect(withClub.breakdown.current).toBeGreaterThan(0);
  expect(withClub.position).toBe(10);
  expect(scored.allocation.appointments).toEqual([]);
});

test("appointment profiles rank current managers on the public parts of the score", () => {
  const history = [
    { season: "25", division: "1", position: "1", team: "Genoa", points: "80", manager: "TRX" },
    { season: "26", division: "1", position: "2", team: "Genoa", points: "75", manager: "TRX" },
    { season: "27", division: "1", position: "1", team: "Genoa", points: "82", manager: "TRX" },
    { season: "26", division: "4", position: "15", team: "Lecce", points: "30", manager: "Nia" },
    { season: "27", division: "4", position: "18", team: "Lecce", points: "25", manager: "Nia" },
  ];
  const liveRows = [
    { season: 28, division: 1, position: 2, team: "Genoa", manager: "TRX" },
    { season: 28, division: 4, position: 19, team: "Lecce", manager: "Nia" },
    { season: 28, division: 5, position: 10, team: "Pisa", manager: "Newbie" },
  ];
  const profiles = managerProfiles(buildArchive({ sheetRows: history, liveRows }), { currentSeason: 28 });
  const by = Object.fromEntries(profiles.map((profile) => [profile.manager, profile]));
  expect(Object.keys(by).sort()).toEqual(["Newbie", "Nia", "TRX"]);
  expect(by.TRX.outOf).toBe(80);
  expect(by.TRX.rank).toBe(1);
  expect(profiles.map((profile) => profile.rank).sort()).toEqual([1, 2, 3]);
  expect(by.TRX.percentile).toBe(100);
  expect(by.TRX.level).toBe("Top 10%");
  expect(by.TRX.strengths.length).toBe(2);
  expect(by.TRX.strengths.every((label) => by.TRX.parts.find((part) => part.label === label).percentile >= 65)).toBe(true);
  expect(by.Nia.weaknesses.length).toBeGreaterThan(0);
  expect(profiles.every((profile) => !profile.weaknesses.includes("Level") && !profile.weaknesses.includes("Honours"))).toBe(true);
  expect(by.Nia.score).toBeLessThan(by.TRX.score);
  expect(by.Newbie.trajectory).toBe("new");
  expect(["rising", "steady", "falling"]).toContain(by.TRX.trajectory);
  expect(by.TRX.parts.map((part) => part.part)).toEqual(["current", "recent", "honours", "level", "stability"]);
  expect(levelBand(50)).toBe("Above average");
  expect(levelBand(10)).toBe("Bottom 25%");
});

test("appointment profiles use the club's current manager and last season's records as they stood", () => {
  const history = [
    { season: "26", division: "2", position: "3", team: "Genoa", points: "70", manager: "TRX" },
    { season: "27", division: "2", position: "1", team: "Genoa", points: "80", manager: "TRX" },
    { season: "27", division: "3", position: "5", team: "Pisa", points: "60", manager: "Kai" },
  ];
  const season28 = (genoaDivision) => [
    { season: "28", division: genoaDivision, position: "4", team: "Genoa", points: "60", manager: "TRX" },
    { season: "28", division: "3", position: "8", team: "Pisa", points: "50", manager: "Old / Kai" },
  ];
  const profilesWith = (division) => Object.fromEntries(
    managerProfiles(buildArchive({ sheetRows: [...history, ...season28(division)], liveRows: [] }), { currentSeason: 28 })
      .map((profile) => [profile.manager, profile]));
  const promoted = profilesWith("1");
  const stayed = profilesWith("2");
  // A shared entry is the last-named manager's, with their record.
  expect(Object.keys(promoted).sort()).toEqual(["Kai", "TRX"]);
  expect(promoted.Kai.trajectory).not.toBe("new");
  // Last season's baseline doesn't move with this season's division.
  expect(round(promoted.TRX.score - promoted.TRX.change)).toBe(round(stayed.TRX.score - stayed.TRX.change));
});

const round = (value) => Math.round(value * 10) / 10;

test("waiting-list applicant history: returning managers with spells and the public score, newcomers with none", () => {
  const history = [
    { season: "20", division: "2", position: "1", team: "Genoa", points: "80", manager: "Old Hand" },
    { season: "21", division: "1", position: "8", team: "Genoa", points: "60", manager: "Old Hand" },
    { season: "22", division: "1", position: "12", team: "Lazio", points: "50", manager: "Old Hand" },
    { season: "27", division: "1", position: "1", team: "Roma", points: "90", manager: "Someone Else" },
  ];
  const archive = buildArchive({ sheetRows: history, liveRows: [{ season: 28, division: 1, position: 1, team: "Roma", manager: "Someone Else" }] });
  const [old, fresh] = applicantHistory(archive, { currentSeason: 28, applicants: [{ key: "1", name: "Old Hand" }, { key: "2", name: "Brand New Person" }] });
  expect(old.returning).toBe(true);
  expect(old.matched).toBe("Old Hand");
  expect(old.seasons).toBe(3);
  expect([old.firstSeason, old.lastSeason, old.titles]).toEqual([20, 22, 1]);
  expect(old.spells).toEqual([
    { club: "Genoa", from: 20, to: 21, bestDivision: 1, bestPosition: 8 },
    { club: "Lazio", from: 22, to: 22, bestDivision: 1, bestPosition: 12 },
  ]);
  expect(old.score).toBeGreaterThan(0);
  expect(old.score).toBeLessThanOrEqual(80);
  expect(old.parts.map((part) => part.part)).toEqual(["current", "recent", "honours", "level", "stability"]);
  expect(fresh).toMatchObject({ key: "2", returning: false, seasons: 0, score: 0 });
});

test("waiting-list applicant history: a manager whose only Top 100 season is the current one is returning", () => {
  const archive = buildArchive({ sheetRows: [{ season: "28", division: "3", position: "7", team: "Pisa", points: "40", manager: "Brief Stay" }], liveRows: [] });
  const [brief] = applicantHistory(archive, { currentSeason: 28, applicants: [{ key: "9", name: "Brief Stay" }] });
  expect(brief).toMatchObject({ returning: true, matched: "Brief Stay", seasons: 1, firstSeason: 28, lastSeason: 28 });
  expect(brief.score).toBeGreaterThan(0);
});
