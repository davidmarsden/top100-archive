import { formatAward, formatMoney, formatSigned, rankClubs } from "./divisionStats";

const clubs = [
  { club: "A", position: 1, used_age: 27.1, points_per_10m: 1.5, value_added: null },
  { club: "B", position: 2, used_age: 24.0, points_per_10m: 2.1, value_added: 3 },
  { club: "C", position: 3, used_age: null, points_per_10m: 1.9, value_added: -2 },
];

test("ranks clubs by the chosen stat, with missing values last", () => {
  expect(rankClubs(clubs, "table").map((c) => c.club)).toEqual(["A", "B", "C"]);
  expect(rankClubs(clubs, "moneyball").map((c) => c.club)).toEqual(["B", "C", "A"]);
  expect(rankClubs(clubs, "youngest").map((c) => c.club)).toEqual(["B", "A", "C"]);
  expect(rankClubs(clubs, "oldest").map((c) => c.club)).toEqual(["A", "B", "C"]);
  expect(rankClubs(clubs, "value-added").map((c) => c.club)).toEqual(["B", "C", "A"]);
  expect(rankClubs(clubs, "unknown").map((c) => c.club)).toEqual(["A", "B", "C"]);
});

test("formats money, signed numbers and awards", () => {
  expect(formatMoney(463260000)).toBe("£463m");
  expect(formatMoney(46300000)).toBe("£46.3m");
  expect(formatMoney(-12500000)).toBe("−£12.5m");
  expect(formatMoney(null)).toBe("—");
  expect(formatSigned(3)).toBe("+3");
  expect(formatSigned(-2.5, 1)).toBe("−2.5");
  expect(formatSigned(0)).toBe("0");
  expect(formatSigned(undefined)).toBe("—");
  expect(formatAward({ name: "V.JÚNIOR", club: "Borussia Dortmund", value: 44 }, "goals")).toBe("V.JÚNIOR (Borussia Dortmund) · 44 goals");
  expect(formatAward({ name: "L.YAMAL", club: "Barcelona", value: 8.37 }, "avg")).toBe("L.YAMAL (Barcelona) · 8.37");
  expect(formatAward(null, "goals")).toBe("—");
});

test("the stats table orders by PVA with VA breaking ties, as in Mister TRX's reviews", () => {
  const d1 = [
    { club: "Arsenal", position: 8, value_added: 5, pva: 0.75 },
    { club: "FC Porto", position: 1, value_added: 2, pva: 3 },
    { club: "RCD Espanyol", position: 12, value_added: 8, pva: 0.75 },
    { club: "Juventus", position: 20, value_added: -14, pva: -0.65 },
  ];
  expect(rankClubs(d1, "pva").map((c) => c.club)).toEqual(["FC Porto", "RCD Espanyol", "Arsenal", "Juventus"]);
});
