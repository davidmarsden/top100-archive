// Objective scoring for Top 100 club vacancies (rulebook: "Club vacancies and
// manager appointments"). Pure functions, no imports, so the archive app and
// scripts/appointment-report.mjs share one implementation.
//
// Inputs are archive rows ({ season, division, position, team, manager,
// valueAdded? }) for completed seasons, plus the current season's live rows
// (same shape, valueAdded = predicted - actual position).
//
// Score out of 100:
//   A. Current season        20  finish (12) + result against squad strength (8)
//   B. Last two seasons      15  finishes (9) + average value added (6)
//   C. Honours               15  D1 titles 6, other titles 3, promotions 2, capped
//   D. Top-flight record     10  D1 seasons (6) + top-half D1 finishes (4)
//   E. Stability, conduct    20  tenure (5) + bottom-three record (10) + discipline (5)
//   F. Activity, contribution 20 competitions (8) + transfer market (6) + community (6),
//                                entered by administrators; half marks when not yet assessed
//
// A season a manager took over part-way through never counts against them
// (rulebook 3.1): it is not a bottom-three finish for E or for eligibility.
//
// Eligibility (any failure rules an applicant out for that vacancy):
//   - not in the bottom three of their division this season, unless they took the club over during it;
//   - at least a second season at their current club (archive recruitment threshold);
//   - no open sanction (transfer ban or upheld breach), entered by administrators;
//   - realism: at most two divisions' step up, unless they have managed in D1.

export const APPOINTMENT_WEIGHTS = Object.freeze({
  current: 20,
  recent: 15,
  honours: 15,
  topFlight: 10,
  stability: 20,
  activity: 20,
});

const ACTIVITY_PARTS = Object.freeze({ competitions: 8, market: 6, community: 6 });

const DIVISION_SIZE = 20;
const MAX_STEP_UP_WITHOUT_D1 = 2;

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const round1 = (value) => Math.round(value * 10) / 10;

const normalise = (name) =>
  String(name || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

export const splitManagers = (value) =>
  String(value || "")
    .split("/")
    .map((name) => name.trim())
    .filter(Boolean);

// A season row belongs to a manager's record when they were the manager who
// finished it: the last name of a shared "A / B" entry, or the only one.
export const finishedSeasonWith = (row, manager) => {
  const names = splitManagers(row.manager);
  return names.length > 0 && normalise(names[names.length - 1]) === normalise(manager);
};

// Blend of the finish within the division and in the 100-club pyramid, 0..1.
export const finishScore = (division, position) => {
  const d = num(division);
  const p = num(position);
  if (d === null || p === null) return 0;
  const withinDivision = (DIVISION_SIZE + 1 - p) / DIVISION_SIZE;
  const overall = (5 * DIVISION_SIZE + 1 - ((d - 1) * DIVISION_SIZE + p)) / (5 * DIVISION_SIZE);
  return 0.5 * withinDivision + 0.5 * overall;
};

const valueAddedScore = (valueAdded, max, perPoint) =>
  valueAdded === null ? max / 2 : clamp(max / 2 + valueAdded * perPoint, 0, max);

// Took the club over part-way through the season: someone else is listed
// before them for the club, or they started the season at another club.
const joinedMidSeason = (row, manager, rows) =>
  splitManagers(row.manager).length > 1 ||
  rows.some(
    (other) =>
      other !== row &&
      num(other.season) === num(row.season) &&
      splitManagers(other.manager).slice(0, -1).some((name) => normalise(name) === normalise(manager))
  );

export const managerCareer = (manager, rows = []) =>
  rows
    .filter((row) => finishedSeasonWith(row, manager))
    .map((row) => ({
      ...row,
      season: num(row.season),
      division: num(row.division),
      position: num(row.position),
      joinedMidSeason: joinedMidSeason(row, manager, rows),
    }))
    .sort((a, b) => a.season - b.season);

// Division a club played in the following season, from the archive itself.
const nextDivisionLookup = (rows) => {
  const map = new Map();
  rows.forEach((row) => map.set(`${num(row.season)}|${row.team}`, num(row.division)));
  return (row) => map.get(`${row.season + 1}|${row.team}`) ?? null;
};

export const scoreApplicant = ({ manager, currentSeason, rows = [], discipline = {}, activity = {} }) => {
  const career = managerCareer(manager, rows);
  const current = career.find((row) => row.season === currentSeason) || null;
  const completed = career.filter((row) => row.season < currentSeason);
  const nextDivision = nextDivisionLookup(rows);
  const notes = [];

  // A. Current season.
  const currentFinish = current ? finishScore(current.division, current.position) : 0;
  const currentValueAdded = current ? num(current.valueAdded) : null;
  const A = current ? 12 * currentFinish + valueAddedScore(currentValueAdded, 8, 0.4) : 0;
  if (!current) notes.push("No current-season club found.");

  // B. Last two completed seasons.
  const last = completed.filter((row) => row.season === currentSeason - 1);
  const previous = completed.filter((row) => row.season === currentSeason - 2);
  const seasonFinish = (seasonRows) =>
    seasonRows.length ? Math.max(...seasonRows.map((row) => finishScore(row.division, row.position))) : 0;
  const recentValueAdded = [...last, ...previous].map((row) => num(row.valueAdded)).filter((v) => v !== null);
  const averageRecentValueAdded = recentValueAdded.length
    ? recentValueAdded.reduce((sum, v) => sum + v, 0) / recentValueAdded.length
    : null;
  const B = 9 * (0.6 * seasonFinish(last) + 0.4 * seasonFinish(previous)) + valueAddedScore(averageRecentValueAdded, 6, 0.3);

  // C. Honours: titles and promotions in completed seasons.
  const d1Titles = completed.filter((row) => row.division === 1 && row.position === 1).length;
  const otherTitles = completed.filter((row) => row.division > 1 && row.position === 1).length;
  const promotions = completed.filter((row) => {
    const next = nextDivision(row);
    return next !== null && next < row.division;
  }).length;
  const relegations = completed.filter((row) => {
    const next = nextDivision(row);
    return next !== null && next > row.division;
  }).length;
  const C = Math.min(APPOINTMENT_WEIGHTS.honours, 6 * d1Titles + 3 * otherTitles + 2 * promotions);

  // D. Top-flight record.
  const d1Rows = career.filter((row) => row.division === 1);
  const d1TopHalf = d1Rows.filter((row) => row.position <= 10).length;
  const D = Math.min(6, 1.5 * d1Rows.length) + Math.min(4, 2 * d1TopHalf);

  // E. Stability and conduct.
  let tenure = 0;
  if (current) {
    for (let i = career.length - 1; i >= 0 && career[i].team === current.team; i -= 1) tenure += 1;
  }
  const recentWindow = career.filter((row) => row.season >= currentSeason - 5);
  const bottomThree = recentWindow.filter((row) => row.position >= DIVISION_SIZE - 2 && !row.joinedMidSeason);
  const midSeasonBottomThree = recentWindow.filter((row) => row.position >= DIVISION_SIZE - 2 && row.joinedMidSeason);
  const disciplinePoints = clamp(5 - 2.5 * (num(discipline.sanctions) || 0), 0, 5);
  const E = Math.min(5, tenure) + Math.max(0, 10 - 3 * bottomThree.length) + disciplinePoints;

  // F. Activity and contribution, assessed by administrators (0..max for each part).
  const assessed = Object.keys(ACTIVITY_PARTS).filter((part) => num(activity[part]) !== null);
  const F = Object.entries(ACTIVITY_PARTS).reduce(
    (sum, [part, max]) => sum + (num(activity[part]) === null ? max / 2 : clamp(num(activity[part]), 0, max)),
    0
  );
  if (assessed.length < Object.keys(ACTIVITY_PARTS).length) notes.push("Activity and contribution not fully assessed: half marks used.");

  const total = round1(A + B + C + D + E + F);

  return {
    manager,
    club: current?.team || null,
    division: current?.division ?? null,
    position: current?.position ?? null,
    total,
    breakdown: { current: round1(A), recent: round1(B), honours: round1(C), topFlight: round1(D), stability: round1(E), activity: round1(F) },
    facts: {
      seasons: career.length,
      firstSeason: career[0]?.season ?? null,
      currentValueAdded,
      averageRecentValueAdded: averageRecentValueAdded === null ? null : round1(averageRecentValueAdded),
      d1Titles,
      otherTitles,
      promotions,
      relegations,
      d1Seasons: d1Rows.length,
      d1TopHalf,
      tenure,
      bottomThreeLastFive: bottomThree.map((row) => `S${row.season} D${row.division} ${row.position}th ${row.team}`),
      midSeasonBottomThree: midSeasonBottomThree.map((row) => `S${row.season} D${row.division} ${row.position}th ${row.team}`),
      currentJoinedMidSeason: Boolean(current?.joinedMidSeason),
      activityAssessed: assessed.length === Object.keys(ACTIVITY_PARTS).length,
      sanctions: num(discipline.sanctions) || 0,
    },
    notes,
  };
};

// Eligibility of a scored applicant for one vacancy ({ club, division }).
export const eligibility = (scored, vacancy, discipline = {}) => {
  const reasons = [];
  if (scored.position !== null && scored.position >= DIVISION_SIZE - 2 && !scored.facts.currentJoinedMidSeason) {
    reasons.push("In the bottom three this season (subject to the sacking rule).");
  }
  if (scored.facts.tenure < 2) reasons.push("Less than a second season at the current club.");
  if (discipline.openSanction) reasons.push(`Open sanction: ${discipline.openSanction}.`);
  if (scored.club && scored.club === vacancy.club) reasons.push("Already manages this club.");
  const stepUp = (scored.division ?? 5) - vacancy.division;
  if (stepUp > MAX_STEP_UP_WITHOUT_D1 && scored.facts.d1Seasons === 0) {
    reasons.push(`A ${stepUp}-division step up with no Division 1 experience.`);
  }
  return { eligible: reasons.length === 0, reasons };
};

// Highest score chooses first; each takes their most-preferred club still open
// for which they are eligible. Without stated preferences, an applicant is
// assumed to rank the vacancies in the order given (stature order).
export const allocateVacancies = (scoredApplicants, vacancies, preferences = {}, disciplineByManager = {}) => {
  const order = [...scoredApplicants].sort(
    (a, b) => b.total - a.total || b.breakdown.current - a.breakdown.current || b.facts.seasons - a.facts.seasons
  );
  const open = new Set(vacancies.map((vacancy) => vacancy.club));
  const appointments = [];
  const unplaced = [];

  order.forEach((applicant) => {
    const ranked = (preferences[applicant.manager] || vacancies.map((vacancy) => vacancy.club))
      .map((club) => vacancies.find((vacancy) => vacancy.club === club))
      .filter(Boolean);
    const choice = ranked.find(
      (vacancy) => open.has(vacancy.club) && eligibility(applicant, vacancy, disciplineByManager[applicant.manager]).eligible
    );
    if (choice) {
      open.delete(choice.club);
      appointments.push({ club: choice.club, manager: applicant.manager, score: applicant.total, vacates: applicant.club });
    } else {
      unplaced.push(applicant.manager);
    }
  });

  return { appointments, unfilled: [...open], unplaced };
};
