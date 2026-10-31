import { buildArchive, scoreVacancies } from "./appointmentData";

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
