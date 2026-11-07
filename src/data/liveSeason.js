// The current season, live from Soccer Manager Sync (public_league_season_rows via
// netlify/functions/live-season.js), merged into the Full History sheet rows.
// Once the sheet has a season, the sheet wins and the live rows are dropped.

const clean = (value) => String(value ?? "").trim();

const tokens = (name) =>
  clean(name)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

const splitManagers = (value) =>
  clean(value)
    .split("/")
    .map(clean)
    .filter(Boolean);

// The sheet uses short names ("Beddows", "TRX", "Mc02"); Soccer Manager uses
// full ones ("Sir Stephen Beddows (God)", "Mister TRX", "yamil Mc02").
// Use the sheet name when it is unambiguous: first the club's own manager in
// the latest sheet season, then any recent sheet manager whose name is made of
// tokens of the live name. Otherwise keep the live name.
// A sheet name with an initial ("Tom L") only counts by club: on name alone it
// would claim any "Tom ..." (Tom Lee is not Tom L).
// A second Soccer Manager account carries a marker ("Gianluca Ghio (2nd)"). It is a
// different manager record: resolve the name without the marker, then keep it
// ("Ghio (2nd)"), so it never merges with the first account's history.
const ACCOUNT_MARKER = /\s*\((\d+(?:st|nd|rd|th)?)\)\s*$/i;

const markerOf = (name) => (clean(name).match(ACCOUNT_MARKER)?.[1] || "").toLowerCase();
const withoutMarker = (name) => clean(name).replace(ACCOUNT_MARKER, "");
// The rows with each cell's managers narrowed to those `keep` accepts (markers removed).
const narrowManagers = (sheetRows, keep) =>
  sheetRows.map((row) => ({ ...row, manager: splitManagers(row.manager).filter(keep).map(withoutMarker).join(" / ") }));

export const resolveManagerName = (liveName, team, sheetRows = []) => {
  const marker = clean(liveName).match(ACCOUNT_MARKER);
  if (marker) {
    const mark = marker[1].toLowerCase();
    const base = withoutMarker(liveName);
    if (!base) return "";
    // The same account already in the sheet ("Ghio (2nd)") first, then the unmarked names.
    const marked = resolveManagerName(base, team, narrowManagers(sheetRows, (name) => markerOf(name) === mark));
    if (marked !== base) return `${marked} (${marker[1]})`;
    return `${resolveManagerName(base, team, narrowManagers(sheetRows, (name) => !markerOf(name)))} (${marker[1]})`;
  }
  const live = clean(liveName);
  if (!live) return "";
  const liveTokens = new Set(tokens(live));
  const matches = (sheetName) => {
    const sheetTokens = tokens(sheetName).filter((token) => token.length > 1);
    return sheetTokens.length > 0 && sheetTokens.every((token) => liveTokens.has(token));
  };

  const seasons = sheetRows.map((row) => Number(row.season)).filter(Number.isFinite);
  const latest = seasons.length ? Math.max(...seasons) : null;
  if (latest === null) return live;

  const clubRow = sheetRows.find((row) => Number(row.season) === latest && clean(row.team) === clean(team));
  const clubMatch = splitManagers(clubRow?.manager).find(matches);
  if (clubMatch) return clubMatch;

  const recent = new Set(
    sheetRows.filter((row) => Number(row.season) >= latest - 2).flatMap((row) => splitManagers(row.manager))
  );
  const hasInitial = (name) => tokens(name).some((token) => token.length === 1);
  const candidates = [...recent].filter((name) => !hasInitial(name) && matches(name));
  return candidates.length === 1 ? candidates[0] : live;
};

export const buildLiveSeasonRows = (liveRows = [], sheetRows = []) => {
  if (!liveRows.length) return [];
  const season = String(liveRows[0].season ?? "");
  if (!season || sheetRows.some((row) => clean(row.season) === season)) return [];

  // The sheet's own spelling of a club ("HAMBURGER SV"), so the live season joins its history.
  const sheetTeams = new Map(sheetRows.map((row) => [clean(row.team).toLowerCase(), clean(row.team)]));
  const sheetTeam = (team) => sheetTeams.get(clean(team).toLowerCase()) || clean(team);

  return liveRows.map((row) => ({
    season,
    division: String(row.division ?? ""),
    position: String(row.position ?? ""),
    team: sheetTeam(row.team),
    played: String(row.played ?? ""),
    won: String(row.won ?? ""),
    drawn: String(row.drawn ?? ""),
    lost: String(row.lost ?? ""),
    goals_for: String(row.goals_for ?? ""),
    goals_against: String(row.goals_against ?? ""),
    goal_difference: String(row.goal_difference ?? ""),
    points: String(row.points ?? ""),
    start_date: "",
    manager: resolveManagerName(row.manager, sheetTeam(row.team), sheetRows),
    live: true,
    inProgress: !row.season_complete,
    observedAt: row.observed_at || null,
  }));
};

const csvCell = (value) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// Same columns as the "Full History" tab, ready to paste under the last row.
export const toSheetCsv = (rows = []) =>
  [
    ["Season", "Div", "Pos", "", "Team", "P", "W", "D", "L", "GF", "GA", "GD", "Pts", "", "Start date", "", "Manager"],
    ...[...rows]
      .sort((a, b) => Number(a.division) - Number(b.division) || Number(a.position) - Number(b.position))
      .map((row) => [
        row.season, row.division, row.position, "", row.team, row.played, row.won, row.drawn, row.lost,
        row.goals_for, row.goals_against, row.goal_difference, row.points, "", "", "", row.manager,
      ]),
  ]
    .map((line) => line.map(csvCell).join(","))
    .join("\n");
