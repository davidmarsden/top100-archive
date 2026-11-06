// Helpers for the live division stats (netlify/functions/division-stats.js).

export const RANKINGS = [
  { id: "table", label: "League table", key: "position", ascending: true },
  // Mister TRX's stats table: PVA, with VA breaking ties.
  { id: "pva", label: "Stats table (PVA)", key: "pva", tiebreak: "value_added", ascending: false, needsOpening: true },
  { id: "value-added", label: "Value added so far", key: "value_added", ascending: false, needsOpening: true },
  { id: "most-improved", label: "Most improved squad", key: "etot_change", ascending: false, needsOpening: true },
  { id: "strongest", label: "Strongest squad (ETOT)", key: "etot", ascending: false },
  { id: "moneyball", label: "Points per £10m", key: "points_per_10m", ascending: false },
  { id: "youngest", label: "Youngest (most-used players)", key: "used_age", ascending: true },
  { id: "oldest", label: "Oldest (most-used players)", key: "used_age", ascending: false },
  { id: "richest", label: "Most valuable squad", key: "squad_value", ascending: false },
];

export const AWARDS = [
  { id: "topScorer", label: "Top scorer", unit: "goals" },
  { id: "mostAssists", label: "Most assists", unit: "assists" },
  { id: "bestAverage", label: "Best average rating", unit: "avg", note: "10+ apps" },
  { id: "bestYoungPlayer", label: "Best young player", unit: "avg", note: "21 or under, 10+ apps" },
  { id: "oldestRegular", label: "Oldest regular", unit: "years old", note: "10+ apps" },
];

const isNumber = (value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));

// Sorted copy; clubs without a value go last whichever way the ranking runs.
export const rankClubs = (clubs = [], rankingId = "table") => {
  const ranking = RANKINGS.find((item) => item.id === rankingId) || RANKINGS[0];
  const direction = ranking.ascending ? 1 : -1;
  return [...clubs].sort((a, b) => {
    const av = a?.[ranking.key];
    const bv = b?.[ranking.key];
    if (!isNumber(av) && !isNumber(bv)) return (a?.position ?? 99) - (b?.position ?? 99);
    if (!isNumber(av)) return 1;
    if (!isNumber(bv)) return -1;
    const diff = (Number(av) - Number(bv)) * direction;
    if (diff) return diff;
    const tie = ranking.tiebreak ? Number(b?.[ranking.tiebreak] ?? 0) - Number(a?.[ranking.tiebreak] ?? 0) : 0;
    return tie || (a?.position ?? 99) - (b?.position ?? 99);
  });
};

export const formatMoney = (value) => {
  if (!isNumber(value)) return "—";
  const millions = Number(value) / 1e6;
  const sign = millions < 0 ? "−" : "";
  return `${sign}£${Math.abs(millions).toFixed(Math.abs(millions) >= 100 ? 0 : 1)}m`;
};

export const formatSigned = (value, digits = 0) => {
  if (!isNumber(value)) return "—";
  const number = Number(value);
  if (number === 0) return (0).toFixed(digits);
  return `${number > 0 ? "+" : "−"}${Math.abs(number).toFixed(digits)}`;
};

export const formatNumber = (value, digits = 0) => (isNumber(value) ? Number(value).toFixed(digits) : "—");

export const formatUpdated = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;

export const formatAward = (award, unit) => {
  if (!award) return "—";
  const value = unit === "avg" ? Number(award.value).toFixed(2) : award.value;
  return `${award.name} (${award.club}) · ${value}${unit === "avg" ? "" : ` ${unit}`}`;
};
