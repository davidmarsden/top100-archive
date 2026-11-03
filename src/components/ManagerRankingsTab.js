import React, { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Minus, Trophy } from "lucide-react";

// This season's managers ranked on the public-record parts of the appointment score (rulebook
// 3.2), from the appointment-scores function: this season, recent seasons, honours, level and
// stability, out of 80. Activity and conduct, which the admin team assesses, aren't included.
const PARTS = [
  ["current", "This season"],
  ["recent", "Recent"],
  ["honours", "Honours"],
  ["level", "Level"],
  ["stability", "Stability"],
];
const SORTS = [
  ["score", "Overall"],
  ...PARTS,
  ["change", "Biggest risers"],
];
const LEVEL_STYLE = {
  "Top 10%": "bg-emerald-100 text-emerald-900 border-emerald-300",
  "Top 25%": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Above average": "bg-sky-50 text-sky-800 border-sky-200",
  "Below average": "bg-amber-50 text-amber-800 border-amber-200",
  "Bottom 25%": "bg-rose-50 text-rose-800 border-rose-200",
};

const partScore = (profile, part) => profile.parts.find((item) => item.part === part)?.score ?? 0;
const sortValue = (profile, key) =>
  key === "score" ? profile.score : key === "change" ? (profile.change ?? -Infinity) : partScore(profile, key);

const Change = ({ profile }) => {
  if (profile.trajectory === "new") return <span className="text-xs font-semibold text-indigo-700">New</span>;
  const change = Number(profile.change) || 0;
  const Icon = profile.trajectory === "rising" ? ArrowUp : profile.trajectory === "falling" ? ArrowDown : Minus;
  const colour = profile.trajectory === "rising" ? "text-emerald-700" : profile.trajectory === "falling" ? "text-rose-700" : "text-gray-500";
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${colour}`} title="Change since the same point last season">
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {change > 0 ? "+" : ""}{change.toFixed(1)}
    </span>
  );
};

const ManagerRankingsTab = () => {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [division, setDivision] = useState("all");
  const [sortBy, setSortBy] = useState("score");

  useEffect(() => {
    let active = true;
    fetch("/.netlify/functions/appointment-scores?mode=profiles")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((result) => { if (active) setData(result); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);

  const rows = useMemo(() => {
    const profiles = (data?.profiles || []).filter((profile) => division === "all" || profile.division === Number(division));
    return [...profiles].sort((a, b) => sortValue(b, sortBy) - sortValue(a, sortBy) || b.score - a.score || a.manager.localeCompare(b.manager));
  }, [data, division, sortBy]);
  const total = data?.profiles?.length || 0;

  if (failed) return <div className="bg-white rounded-xl shadow-lg p-6 text-gray-700">The manager rankings are unavailable right now. Try again later.</div>;
  if (!data) return <div className="bg-white rounded-xl shadow-lg p-6 text-gray-700">Loading the manager rankings…</div>;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-800 text-white space-y-4">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2"><Trophy className="w-6 h-6" aria-hidden="true" /> Manager Rankings: Season {data.currentSeason}</h3>
          <p className="text-emerald-100 mt-1 max-w-3xl">
            Every current manager ranked on the public-record parts of the appointment score (rulebook 3.2): this season,
            recent seasons, honours, level and stability, out of 80. Activity and conduct, which the admin team assesses,
            aren't included, so this is a guide to where managers stand rather than a full appointment score. It isn't the review
            score (rule 3.1) used for managers in or near the bottom three, which is out of 100 and weighs this season's result far
            more heavily, so the two numbers differ.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Division">
          {["all", "1", "2", "3", "4", "5"].map((value) => (
            <button key={value} type="button" onClick={() => setDivision(value)} aria-pressed={division === value}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${division === value ? "bg-white text-teal-700 shadow" : "bg-white/15 hover:bg-white/25 text-white"}`}>
              {value === "all" ? "All divisions" : `Division ${value}`}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Rank by">
          {SORTS.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setSortBy(key)} aria-pressed={sortBy === key}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${sortBy === key ? "bg-white text-teal-700 shadow" : "bg-white/15 hover:bg-white/25 text-white"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-3 font-bold text-gray-700" title="Overall rank among all current managers">#</th>
              <th className="text-left py-3 px-3 font-bold text-gray-700">Manager</th>
              <th className="text-right py-3 px-3 font-bold text-gray-700" title="Appointment score (rule 3.2), public-record parts only">Appointment score /80</th>
              <th className="text-right py-3 px-3 font-bold text-gray-700">Change</th>
              <th className="text-left py-3 px-3 font-bold text-gray-700 hidden sm:table-cell">Band</th>
              {PARTS.map(([part, label]) => (
                <th key={part} className={`text-right py-3 px-3 font-bold hidden md:table-cell ${sortBy === part ? "text-teal-700" : "text-gray-700"}`}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((profile) => (
              <tr key={profile.manager} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="py-2.5 px-3 font-bold text-gray-900">{profile.rank ?? "—"}</td>
                <td className="py-2.5 px-3">
                  <div className="font-semibold text-gray-900">{profile.manager}</div>
                  <div className="text-xs text-gray-500">{profile.club} · D{profile.division}, {ordinal(profile.position)}</div>
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-gray-900">{profile.score.toFixed(1)}</td>
                <td className="py-2.5 px-3 text-right"><Change profile={profile} /></td>
                <td className="py-2.5 px-3 hidden sm:table-cell">
                  <span className={`inline-block px-2 py-0.5 rounded border text-xs font-semibold ${LEVEL_STYLE[profile.level] || ""}`}>{profile.level}</span>
                </td>
                {PARTS.map(([part]) => {
                  const item = profile.parts.find((entry) => entry.part === part);
                  return (
                    <td key={part} className={`py-2.5 px-3 text-right hidden md:table-cell ${sortBy === part ? "font-bold text-teal-800" : "text-gray-700"}`}>
                      {item ? item.score.toFixed(1).replace(/\.0$/, "") : "—"}<span className="text-gray-400">/{item?.max ?? ""}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="p-4 text-xs text-gray-500 border-t border-gray-100">
        {total} managers. # is the overall rank among all of them. Change compares the score with the same score worked out from the
        records to the end of last season: up or down by 5 or more counts as rising or falling. Updated with the league tables.
      </p>
    </div>
  );
};

const ordinal = (n) => {
  const value = Number(n);
  if (!Number.isFinite(value)) return "";
  const s = ["th", "st", "nd", "rd"];
  const v = value % 100;
  return `${value}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

export default ManagerRankingsTab;
