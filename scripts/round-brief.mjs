#!/usr/bin/env node
// Fact sheet for a Top 100 round-up: the live tables from archive.smtop100.blog
// (division-stats, i.e. Soccer Manager Sync), joined to last season's finish
// from public/data/statsArchive.json. Writes Markdown that a person or an agent
// drafts the round-up from, so every number in the post comes from here.
//
//   node scripts/round-brief.mjs                    # prints to stdout
//   node scripts/round-brief.mjs --out brief.md
//   node scripts/round-brief.mjs --json stats.json  # use a saved division-stats response
//
// Uses only public endpoints: no Supabase key, no Soccer Manager login.
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const SITE = (flag("--site") || "https://archive.smtop100.blog").replace(/\/+$/, "");

const loadStats = async () => {
  const saved = flag("--json");
  if (saved) return JSON.parse(fs.readFileSync(saved, "utf8"));
  const res = await fetch(`${SITE}/.netlify/functions/division-stats`, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`division-stats ${res.status}`);
  return res.json();
};

// Soccer Manager names some (mostly German) clubs differently from the archive sheet.
const ALIASES = {
  "borussia dortmund": "dortmund", "bayern munchen": "bayern", "hertha bsc": "h berlin",
  "1 fc koln": "cologne", "hamburger sv": "hamburg", "bayer leverkusen": "leverkusen",
  "vfl wolfsburg": "wolfsburg", "fc augsburg": "augsburg", "tsg 1899 hoffenheim": "hoffenheim",
  "borussia monchengladbach": "monchengladbach", "fc schalke 04": "schalke", "vfb stuttgart": "stuttgart",
};
const key = (name) => {
  const k = String(name).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim();
  return ALIASES[k] || k;
};

const { stats } = await loadStats();
// Goals for/against come from the live table (division-stats has only goal difference).
const goals = new Map();
try {
  const res = await fetch(`${SITE}/.netlify/functions/live-season`, { signal: AbortSignal.timeout(60000) });
  for (const r of (await res.json()).rows || []) goals.set(`${r.division}|${r.team}`, `${r.goals_for}-${r.goals_against}`);
} catch (error) { console.error(`live-season unavailable, no goals column: ${error.message}`); }
if (!stats?.divisions?.length) throw new Error("No live division stats (is Sync configured?)");
const season = Number(stats.season);

const archive = JSON.parse(fs.readFileSync(path.resolve("public/data/statsArchive.json"), "utf8"));
const lastSeason = new Map(
  archive.rows.filter((r) => r.season === season - 1).map((r) => [key(r.club), r])
);

const sign = (n) => (n > 0 ? `+${n}` : `${n}`);
const out = [];
const played = Math.max(...stats.divisions.flatMap((d) => d.clubs.map((c) => c.played)));
out.push(`# S${season} round-up brief: after ${played} game${played === 1 ? "" : "s"}`);
out.push("");
out.push(`Source: ${SITE} division stats, observed ${stats.observedAt || "unknown"}. ` +
  `Last season: statsArchive.json (S${season - 1}). Predicted = opening-day squad-strength order (Mister TRX's formula). ` +
  `VA = predicted minus current position.`);

for (const div of stats.divisions) {
  const d = div.division;
  const clubs = [...div.clubs].sort((a, b) => a.position - b.position);
  const tag = (c) => {
    const prev = lastSeason.get(key(c.club));
    if (!prev) return { text: "new to archive", move: "?" };
    const move = prev.division > d ? "promoted" : prev.division < d ? "relegated" : "";
    return { text: `D${prev.division} ${ordinal(prev.finalPosition)}`, move };
  };

  out.push("", `## Division ${d}`, "");
  out.push("| Pos | Club | Manager | P | Pts | F-A | GD | Pred | VA | S" + (season - 1) + " | Note | ETOT |");
  out.push("| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |");
  for (const c of clubs) {
    const t = tag(c);
    out.push(`| ${c.position} | ${c.club} | ${c.manager || "(vacant)"} | ${c.played} | ${c.points} | ${goals.get(`${d}|${c.club}`) ?? ""} | ${sign(c.goal_difference)} | ` +
      `${c.predicted_position ?? ""} | ${c.value_added == null ? "" : sign(c.value_added)} | ${t.text} | ${t.move} | ${c.etot ?? ""} |`);
  }

  // Storylines: only facts, the writer decides what is worth saying.
  const facts = [];
  const leaders = clubs.filter((c) => c.points === clubs[0].points && c.goal_difference === clubs[0].goal_difference);
  facts.push(`Top: ${clubs[0].club} (${clubs[0].manager}), ${clubs[0].points} pts, GD ${sign(clubs[0].goal_difference)}` +
    (leaders.length > 1 ? `; level on points and GD with ${leaders.slice(1).map((c) => c.club).join(", ")}` : ""));
  const favourites = clubs.filter((c) => c.predicted_position && c.predicted_position <= 3);
  for (const f of favourites.sort((a, b) => a.predicted_position - b.predicted_position)) {
    facts.push(`Favourite #${f.predicted_position} ${f.club}: ${ordinal(f.position)}, ${f.points} pts`);
  }
  const over = clubs.filter((c) => (c.value_added ?? 0) >= 8).sort((a, b) => b.value_added - a.value_added);
  if (over.length) facts.push(`Beating prediction by 8+: ${over.map((c) => `${c.club} (pred ${c.predicted_position}, now ${c.position})`).join("; ")}`);
  const under = clubs.filter((c) => (c.value_added ?? 0) <= -8).sort((a, b) => a.value_added - b.value_added);
  if (under.length) facts.push(`Below prediction by 8+: ${under.map((c) => `${c.club} (pred ${c.predicted_position}, now ${c.position})`).join("; ")}`);
  for (const move of ["promoted", "relegated"]) {
    const group = clubs.filter((c) => tag(c).move === move);
    if (group.length) facts.push(`${move[0].toUpperCase() + move.slice(1)} clubs: ${group.map((c) => `${c.club} ${c.points} pts`).join(", ")}`);
  }
  const champs = clubs.find((c) => { const p = lastSeason.get(key(c.club)); return p && p.division === d && p.finalPosition === 1; });
  if (champs) facts.push(`Defending champions ${champs.club}: ${ordinal(champs.position)}, ${champs.points} pts`);
  const vacant = clubs.filter((c) => !c.manager);
  if (vacant.length) facts.push(`No manager: ${vacant.map((c) => c.club).join(", ")}`);
  const big = clubs.filter((c) => Math.abs(c.goal_difference) >= 3);
  if (big.length) facts.push(`Margins of 3+: ${big.map((c) => `${c.club} ${sign(c.goal_difference)}`).join(", ")}`);
  const { topScorer, mostAssists } = div.awards || {};
  // These counts can run ahead of league games played (they may include other competitions): check before quoting.
  if (topScorer) facts.push(`Top scorer (check source): ${topScorer.name} (${topScorer.club}) ${topScorer.value}`);
  if (mostAssists) facts.push(`Most assists (check source): ${mostAssists.name} (${mostAssists.club}) ${mostAssists.value}`);
  out.push("", ...facts.map((f) => `- ${f}`));
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const text = out.join("\n") + "\n";
const file = flag("--out");
if (file) { fs.writeFileSync(file, text); console.error(`Wrote ${file}`); } else process.stdout.write(text);
