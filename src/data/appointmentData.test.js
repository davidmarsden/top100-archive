import { buildArchive } from "./appointmentData";

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
