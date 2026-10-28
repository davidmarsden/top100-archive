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
//   D. Record at the level   10  seasons at or above the vacancy's division (6) + top-half finishes there (4)
//   E. Stability, conduct    20  tenure (5) + bottom-three record (10) + discipline (5)
//   F. Activity, contribution 20 measured: Top 100 competitions entered in the last two seasons (4),
//                                deals with other Top 100 managers this season (4), squad building:
//                                the club's squad-strength rank gain since the manager arrived (4);
//                                by role: running Top 100 (3: current owner, administrator or
//                                competition organiser 3, former owner or administrator 1.5);
//                                assessed by administrators: community and social activity (3);
//                                focus: fewer other game worlds (2: up to 3 worlds in all, then
//                                0.25 less per extra world). Any part not supplied gets half marks.
//
// A season a manager took over part-way through never counts against them
// (rulebook 3.1): it is not a bottom-three finish for E or for eligibility.
//
// Eligibility (any failure rules an applicant out):
//   - at least a second season at their current club (archive recruitment threshold);
//   - no open sanction (transfer ban or upheld breach), entered by administrators;
//   - a Gold member (discipline.gold === false rules them out; unknown counts as Gold).
// A bottom-three finish and a big step up are weighed in the score (E and D), not ruled out.
export const APPOINTMENT_WEIGHTS = Object.freeze({
  current: 20,
  recent: 15,
  honours: 15,
  level: 10,
  stability: 20,
  activity: 20,
});

const ACTIVITY_PARTS = Object.freeze({ competitions: 4, market: 4, squadBuilding: 4, running: 3, community: 3, focus: 2 });

// Focus: managing in fewer Soccer Manager game worlds leaves more time for Top 100.
// Up to 3 worlds (Top 100 included) is full marks, then a quarter point less per extra world.
const FOCUS_FULL_UP_TO = 3;

// activity: { competitions: entries, topManagerDeals: count, squadRankGain: places, running: 0..3, community: 0..3,
//             gameWorlds: number of Soccer Manager game worlds managed in, Top 100 included }
const activityPoints = (activity = {}) => ({
  competitions: num(activity.competitions) === null ? null : Math.min(4, 2 * num(activity.competitions)),
  market: num(activity.topManagerDeals) === null ? null : Math.min(4, 0.4 * num(activity.topManagerDeals)),
  squadBuilding: num(activity.squadRankGain) === null ? null : clamp(2 + num(activity.squadRankGain) / 10, 0, 4),
  // Roles are known for everyone, so no role means 0, not half marks.
  running: clamp(num(activity.running) ?? 0, 0, 3),
  community: num(activity.community) === null ? null : clamp(num(activity.community), 0, 3),
  focus: num(activity.gameWorlds) === null ? null : clamp(2 - 0.25 * (num(activity.gameWorlds) - FOCUS_FULL_UP_TO), 0, 2),
});

const DIVISION_SIZE = 20;

const num = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
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

// level: the vacancy's division (D is scored against it); 1 when scoring without a vacancy.
export const scoreApplicant = ({ manager, currentSeason, rows = [], discipline = {}, activity = {}, level = 1 }) => {
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

  // D. Record at the vacancy's level: seasons in its division or above, and top-half finishes there.
  const d1Rows = career.filter((row) => row.division === 1);
  const d1TopHalf = d1Rows.filter((row) => row.position <= 10).length;
  const levelRows = career.filter((row) => row.division <= level);
  const levelTopHalf = levelRows.filter((row) => row.position <= 10).length;
  const D = Math.min(6, 1.5 * levelRows.length) + Math.min(4, 2 * levelTopHalf);

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

  // F. Activity and contribution: measured where possible, community assessed by administrators.
  const activityParts = activityPoints(activity);
  const missing = Object.keys(ACTIVITY_PARTS).filter((part) => activityParts[part] === null);
  const F = Object.entries(ACTIVITY_PARTS).reduce(
    (sum, [part, max]) => sum + (activityParts[part] === null ? max / 2 : activityParts[part]),
    0
  );
  if (missing.length) notes.push(`Half marks used for: ${missing.join(", ")}.`);

  const total = round1(A + B + C + D + E + F);

  return {
    manager,
    club: current?.team || null,
    division: current?.division ?? null,
    position: current?.position ?? null,
    total,
    breakdown: { current: round1(A), recent: round1(B), honours: round1(C), level: round1(D), stability: round1(E), activity: round1(F) },
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
      level,
      seasonsAtLevel: levelRows.length,
      topHalfAtLevel: levelTopHalf,
      tenure,
      bottomThreeLastFive: bottomThree.map((row) => `S${row.season} D${row.division} ${row.position}th ${row.team}`),
      midSeasonBottomThree: midSeasonBottomThree.map((row) => `S${row.season} D${row.division} ${row.position}th ${row.team}`),
      currentJoinedMidSeason: Boolean(current?.joinedMidSeason),
      activity: Object.fromEntries(Object.entries(activityParts).map(([part, points]) => [part, points === null ? null : round1(points)])),
      sanctions: num(discipline.sanctions) || 0,
    },
    notes,
  };
};

// Review of a manager who finished in the bottom three (rulebook 3.1). Every
// manager reviewed finished 18th-20th, so the finish itself tells little:
// the review asks how the club did against its squad, what the manager's
// record was before, and how active they are. Score out of 100:
//   A. Result against squad strength  30  this season's value added (predicted - actual)
//   B. Track record                   20  last two completed seasons: finishes within the division (10)
//                                         and value added (5), half marks without either; honours (5)
//   C. Activity and contribution      30  as F above, scaled from 20 to 30
//   D. Record and conduct             20  earlier bottom-three finishes in the last five seasons (10),
//                                         tenure at the club (5), discipline (5)
export const SACKING_WEIGHTS = Object.freeze({ result: 30, record: 20, activity: 30, conduct: 20 });

// The VAR standard ("S25 Manager Reappointments", smtop100.blog, 22 August 2025):
// reappoint unless reappointing would be a clear and obvious error. The manager gets the
// benefit of the doubt; a second chance is the administrators' decision, not a given.
//
// Never reappointed, nor offered another club (6.3.2):
//   gold         not a Gold member: required to manage in Top 100, as for new managers
//   inactive     unresponsive, not managing the team, removed by Soccer Manager, or
//                irregular logins: CLEAR_ERROR.loginGaps or more spells of 7 days without
//                logging in during the season (Alves, fert dert)
//   misconduct   recorded by the administrators (McHugh)
//
// Otherwise the S25 precedents give the errors. CLEAR_ERROR.errors of them make
// reappointment a clear and obvious error. With one, the administrators decide whether to
// give a second chance, recorded as a last chance (Murilo, Golden Bear and Azevedo in S25);
// it takes a majority:
//   forfeits     CLEAR_ERROR.forfeits or more forfeits in Top 100 competitions this
//                season (Alldridge, Little, Trapattoni, Bertonati)
//   repeat       bottom three the season before too, or on a recorded last chance
//   collapse     finished CLEAR_ERROR.valueAdded or more places below where the
//                squad's strength predicted ("one of the worst points totals")
//   sanction     a sanction this season, such as a transfer ban (Alldridge)
//   score        a review score below the line: CLEAR_ERROR.score, or
//                CLEAR_ERROR.higherScore in D1-D2, where expectations are higher
// Where reappointment would turn on a score within REVIEW_MARGIN of the line, the
// administrators vote on it too.
export const CLEAR_ERROR = Object.freeze({
  errors: 2,
  score: 40,
  higherScore: 45,
  higherExpectationsUpTo: 2,
  valueAdded: -12,
  forfeits: 3,
  loginGaps: 2,
});
export const REVIEW_MARGIN = 5;

// options: { tookOverMidSeason, gold, loginGaps, inactive, misconduct, standing, lastChance, wish }
//   tookOverMidSeason  from the current season's manager assignments (the archive only
//                      knows completed seasons); reappointed unless never reappointed (above)
//   gold               false when the manager is not a Gold member (unknown counts as Gold)
//   loginGaps          spells of 7 days or more without logging in this season
//   inactive           reason, e.g. "No login for 10 days" or "Unresponsive to WCC requests"
//   misconduct         reason recorded by the administrators
//   standing           a standing reappointment the administrators have published
//                      (e.g. Top 100's founder at Genoa)
//   lastChance         reason, when an earlier decision said this was a last chance
//   wish               what the manager asked for, recorded with the decision
// activity.forfeits: forfeits in Top 100 competitions this season.
export const reviewSackedManager = ({ manager, currentSeason, rows = [], discipline = {}, activity = {}, options = {} }) => {
  const scored = scoreApplicant({ manager, currentSeason, rows, discipline, activity });
  const { facts } = scored;
  const tookOverMidSeason = Boolean(options.tookOverMidSeason || facts.currentJoinedMidSeason);

  const A = valueAddedScore(facts.currentValueAdded, SACKING_WEIGHTS.result, 1.5);
  // Judged within the division, so a lower-division manager is not marked down for the
  // division itself, and a manager new to Top 100 gets half marks rather than none.
  const earlierSeasons = managerCareer(manager, rows).filter((row) => row.season === currentSeason - 1 || row.season === currentSeason - 2);
  const finishes = earlierSeasons.map((row) => (DIVISION_SIZE + 1 - row.position) / DIVISION_SIZE);
  const finishPoints = finishes.length ? (10 * finishes.reduce((sum, v) => sum + v, 0)) / finishes.length : 5;
  const B = finishPoints + valueAddedScore(facts.averageRecentValueAdded, 5, 0.25) + Math.min(5, scored.breakdown.honours / 3);
  const C = (scored.breakdown.activity * SACKING_WEIGHTS.activity) / APPOINTMENT_WEIGHTS.activity;
  const earlier = facts.bottomThreeLastFive.filter((entry) => !entry.startsWith(`S${currentSeason} `));
  const disciplinePoints = clamp(5 - 2.5 * (num(discipline.sanctions) || 0), 0, 5);
  const D = Math.max(0, 10 - 5 * earlier.length) + Math.min(5, facts.tenure) + disciplinePoints;
  const total = round1(A + B + C + D);

  const division = scored.division ?? 5;
  const scoreLine = division <= CLEAR_ERROR.higherExpectationsUpTo ? CLEAR_ERROR.higherScore : CLEAR_ERROR.score;
  const previousSeason = `S${currentSeason - 1} `;
  const forfeits = num(activity.forfeits) || 0;
  const errors = [];
  if (forfeits >= CLEAR_ERROR.forfeits) errors.push({ kind: "forfeits", text: `${forfeits} forfeits in Top 100 competitions` });
  if (earlier.some((entry) => entry.startsWith(previousSeason))) errors.push({ kind: "repeat", text: "bottom three for a second season running" });
  else if (options.lastChance) errors.push({ kind: "repeat", text: `on a last chance (${options.lastChance})` });
  if (num(facts.currentValueAdded) !== null && facts.currentValueAdded <= CLEAR_ERROR.valueAdded)
    errors.push({ kind: "collapse", text: `${-facts.currentValueAdded} places below where the squad's strength predicted` });
  if ((num(discipline.sanctions) || 0) > 0) errors.push({ kind: "sanction", text: "sanctioned this season" });
  if (total < scoreLine) errors.push({ kind: "score", text: `review score below ${scoreLine}` });
  const list = errors.map((error) => error.text).join("; ");

  const loginGaps = num(options.loginGaps) || 0;
  const barred =
    (options.gold === false && "Not a Gold member, which every Top 100 manager must be") ||
    options.inactive ||
    (loginGaps >= CLEAR_ERROR.loginGaps && `Irregular logins: ${loginGaps} spells of 7 days without logging in this season`) ||
    options.misconduct ||
    null;

  let outcome;
  let reason;
  let secondChance = false;
  if (barred) {
    outcome = "leave";
    reason = `${barred}: not reappointed, nor offered another club (3.1).`;
  } else if (options.standing) {
    outcome = "reappoint";
    reason = `Standing reappointment: ${options.standing} (3.1).`;
  } else if (tookOverMidSeason) {
    outcome = "reappoint";
    reason = "Took over during the season: reappointed (3.1).";
  } else if (errors.length >= CLEAR_ERROR.errors) {
    outcome = "anotherClub";
    reason = `Reappointing would be a clear and obvious error: ${list}. The club goes into the vacancy round; the manager may apply for another club.`;
  } else if (errors.length) {
    outcome = "secondChance";
    secondChance = true;
    reason = `One error: ${list}. The admin team decides whether to give a second chance (a majority is needed); if given, the manager is on a last chance next season.`;
  } else {
    outcome = "reappoint";
    reason = "No clear and obvious error: reappointed.";
  }
  // A vote when the decision turns on the score and the score is close to the line.
  const fixed = Boolean(barred || options.standing || tookOverMidSeason);
  const others = errors.filter((error) => error.kind !== "score").length;
  const vote = outcome === "secondChance" || (!fixed && Math.abs(total - scoreLine) < REVIEW_MARGIN && others === CLEAR_ERROR.errors - 1);

  return {
    manager,
    club: scored.club,
    division: scored.division,
    position: scored.position,
    total,
    breakdown: { result: round1(A), record: round1(B), activity: round1(C), conduct: round1(D) },
    outcome,
    reason,
    vote,
    wish: options.wish || null,
    facts: { ...facts, tookOverMidSeason, barred, loginGaps, scoreLine, lastChanceNext: secondChance, earlierBottomThree: earlier, forfeits },
    errors,
    notes: scored.notes,
  };
};

// The balance of managers after the review: clubs needing a manager (not reappointed,
// leaving, or leaving anyway) against those who can fill them (newcomers waiting, and
// the managers not reappointed, who may apply for another club). Top 100 aims for 100
// managers but does not require it, and D1-D2 vacancies draw existing managers, so this
// informs the decisions rather than limiting them.
export const managerSupply = (reviews, { newcomers = 0, leavers = 0 } = {}) => {
  const notReappointed = reviews.filter((review) => review.outcome === "anotherClub");
  const leaving = reviews.filter((review) => review.outcome === "leave").length + leavers;
  const openClubs = notReappointed.length + leaving;
  const bigClubs = notReappointed.filter((review) => review.division !== null && review.division <= 2).map((review) => review.club);
  const undecided = reviews.filter((review) => review.outcome === "secondChance").map((review) => review.club);
  return { openClubs, newcomers, managersAfter: 100 - leaving + newcomers, bigClubs, undecided };
};

// Eligibility of a scored applicant for one vacancy ({ club, division }).
export const eligibility = (scored, vacancy, discipline = {}) => {
  const reasons = [];
  if (scored.facts.tenure < 2) reasons.push("Less than a second season at the current club.");
  if (discipline.openSanction) reasons.push(`Open sanction: ${discipline.openSanction}.`);
  if (discipline.gold === false) reasons.push("Not a Gold member, which every Top 100 manager must be.");
  if (scored.club && scored.club === vacancy.club) reasons.push("Already manages this club.");
  return { eligible: reasons.length === 0, reasons };
};

// scoresByManager: { manager: { [club]: scored applicant for that vacancy } }.
// Each round, every unplaced applicant points at their most-preferred club that
// is still open and for which they are eligible; the highest score among those
// pairs is appointed. Without stated preferences, an applicant is assumed to
// rank the vacancies in the order given (stature order).
export const allocateVacancies = (scoresByManager, vacancies, preferences = {}, disciplineByManager = {}) => {
  const open = new Set(vacancies.map((vacancy) => vacancy.club));
  const waiting = new Set(Object.keys(scoresByManager));
  const appointments = [];

  const choiceFor = (manager) =>
    (preferences[manager] || vacancies.map((vacancy) => vacancy.club))
      .map((club) => vacancies.find((vacancy) => vacancy.club === club))
      .find(
        (vacancy) =>
          vacancy &&
          open.has(vacancy.club) &&
          scoresByManager[manager][vacancy.club] &&
          eligibility(scoresByManager[manager][vacancy.club], vacancy, disciplineByManager[manager]).eligible
      );

  for (;;) {
    const bids = [...waiting]
      .map((manager) => ({ manager, vacancy: choiceFor(manager) }))
      .filter((bid) => bid.vacancy)
      .map((bid) => ({ ...bid, scored: scoresByManager[bid.manager][bid.vacancy.club] }))
      .sort((a, b) => b.scored.total - a.scored.total || b.scored.breakdown.current - a.scored.breakdown.current);
    if (!bids.length) break;
    const best = bids[0];
    open.delete(best.vacancy.club);
    waiting.delete(best.manager);
    appointments.push({ club: best.vacancy.club, manager: best.manager, score: best.scored.total, vacates: best.scored.club });
  }

  return { appointments, unfilled: [...open], unplaced: [...waiting] };
};
