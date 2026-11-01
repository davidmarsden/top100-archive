import { historyRowsFromSync } from "../App";

test("a live season is settled only when every club has played 38", () => {
  const rows = [
    { season: 4, division: 1, position: 1, team: "A", played: 38, is_live: true },
    { season: 4, division: 2, position: 1, team: "B", played: 37, is_live: true },
    { season: 3, division: 1, position: 1, team: "C", played: 38, is_live: false },
  ];
  const out = historyRowsFromSync(rows);
  expect(out.map((row) => row.inProgress)).toEqual([true, true, undefined]);
  rows[1].played = 38;
  expect(historyRowsFromSync(rows).map((row) => row.inProgress)).toEqual([false, false, undefined]);
});
