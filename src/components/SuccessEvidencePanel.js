import React, { useMemo, useState } from "react";
import { BarChart3, Medal, Shield, Trophy } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildSuccessEvidence } from "../analytics/successEvidenceAnalytics";

const fmt = (value, digits = 2, prefix = "") => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  const sign = prefix === "signed" && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}`;
};

const pct = (value) => (value === null || value === undefined ? "—" : `${Number(value).toFixed(1)}%`);

const StatCard = ({ label, value, hint }) => (
  <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
    <div className="text-sm text-gray-500">{label}</div>
    <div className="text-3xl font-black text-gray-900 mt-1">{value}</div>
    {hint && <div className="text-xs text-gray-500 mt-2">{hint}</div>}
  </div>
);

const correlationTone = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "Insufficient data";
  if (Math.abs(n) >= 0.6) return "Strong";
  if (Math.abs(n) >= 0.35) return "Moderate";
  return "Weak";
};

const CorrelationBar = ({ item }) => {
  const n = Number(item.value);
  const width = Number.isFinite(n) ? Math.min(100, Math.abs(n) * 100) : 0;

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-black text-gray-900">{item.label}</div>
          <p className="text-xs text-gray-500 mt-1">{item.note}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-purple-700">{fmt(item.value, 3, "signed")}</div>
          <div className="text-xs font-bold text-gray-500">{correlationTone(item.value)}</div>
        </div>
      </div>
      <div className="h-3 rounded-full bg-white border border-gray-200 overflow-hidden">
        <div className="h-full bg-purple-500" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
};

const SuccessEvidencePanel = ({ archiveRows = [], statsRows = [], honours = {} }) => {
  const [division, setDivision] = useState("all");
  const [club, setClub] = useState("");
  const [manager, setManager] = useState("");

  const evidence = useMemo(
    () => buildSuccessEvidence(archiveRows, statsRows, honours, { division, club, manager, etotBandWidth: 5 }),
    [archiveRows, statsRows, honours, division, club, manager]
  );

  const successCurveData = evidence.outcomeBands.map((row) => ({
    band: row.band,
    title: row.titleRate || 0,
    top4: row.d1TopFourRate || 0,
    top10: row.d1TopTenRate || 0,
    promoted: row.promotedRate || 0,
    playoff: row.playoffRate || 0,
    danger: row.bottomFourRate || 0,
    sacked: row.bottomThreeRate || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-5 border-b bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            <div>
              <h3 className="text-xl font-black text-gray-900">Success Evidence</h3>
              <p className="text-sm text-gray-500">
                Divisional evidence linking Malcolm&apos;s ETOT/PVA archive with league outcomes and honours history.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 grid md:grid-cols-3 gap-3 border-b">
          <label className="text-sm font-semibold text-gray-700">
            Division
            <select value={division} onChange={(event) => setDivision(event.target.value)} className="mt-1 w-full px-3 py-2 border-2 border-gray-200 rounded-lg bg-white">
              <option value="all">All divisions</option>
              {evidence.availableDivisions.map((item) => <option key={item} value={item}>Division {item}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Club
            <input value={club} onChange={(event) => setClub(event.target.value)} placeholder="Optional club filter" className="mt-1 w-full px-3 py-2 border-2 border-gray-200 rounded-lg" />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Manager
            <input value={manager} onChange={(event) => setManager(event.target.value)} placeholder="Optional manager filter" className="mt-1 w-full px-3 py-2 border-2 border-gray-200 rounded-lg" />
          </label>
        </div>

        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Matched stat seasons" value={evidence.matchedRowCount} hint={`${evidence.rowCount} rows in selected scope`} />
          <StatCard label="Honours records" value={evidence.honoursRowCount} hint="Club + manager honours rows loaded" />
          <StatCard label="Avg ETOT" value={fmt(evidence.headlineAverages.allAverageETOT, 2)} hint="Selected scope only" />
          <StatCard label="Avg PVA" value={fmt(evidence.headlineAverages.allAveragePVA, 3, "signed")} hint="Selected scope only" />
        </div>

        <div className="px-5 pb-5 grid lg:grid-cols-2 gap-3">
          {evidence.correlations.map((item) => <CorrelationBar key={item.id} item={item} />)}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600" /> ETOT success curve
          </h3>
          <p className="text-sm text-gray-500">
            Asymmetric ETOT bands merge the low/high tails and use two-point bands through the main competitive range. In D1 the useful lines are title, Top 4, Top 10 and danger zone; in D2-D5 promotion/playoffs matter more.
          </p>
        </div>

        <div className="p-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={successCurveData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="band" />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
              <Line type="monotone" dataKey="title" name="Title" stroke="#7c3aed" strokeWidth={3} dot />
              <Line type="monotone" dataKey="top4" name="D1 Top 4" stroke="#2563eb" strokeWidth={2} dot />
              <Line type="monotone" dataKey="top10" name="D1 Top 10" stroke="#16a34a" strokeWidth={2} dot />
              <Line type="monotone" dataKey="promoted" name="Promoted" stroke="#0d9488" strokeWidth={2} dot />
              <Line type="monotone" dataKey="danger" name="Bottom 4" stroke="#dc2626" strokeWidth={2} dot />
              <Line type="monotone" dataKey="sacked" name="Bottom 3" stroke="#991b1b" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto border-t">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left py-3 px-3">ETOT band</th>
                <th className="text-right py-3 px-3">Samples</th>
                <th className="text-right py-3 px-3">Avg finish</th>
                <th className="text-right py-3 px-3">Title %</th>
                <th className="text-right py-3 px-3">D1 Top 4 %</th>
                <th className="text-right py-3 px-3">D1 Top 10 %</th>
                <th className="text-right py-3 px-3">Promoted %</th>
                <th className="text-right py-3 px-3">Playoffs %</th>
                <th className="text-right py-3 px-3">Bottom 4 %</th>
                <th className="text-right py-3 px-3">Bottom 3 %</th>
                <th className="text-right py-3 px-3">SMFA %</th>
                <th className="text-right py-3 px-3">WCC/WCS %</th>
                <th className="text-right py-3 px-3">Top 100 %</th>
                <th className="text-right py-3 px-3">Youth %</th>
              </tr>
            </thead>
            <tbody>
              {evidence.outcomeBands.map((row) => (
                <tr key={row.band} className="border-t">
                  <td className="py-3 px-3 font-black">{row.band}</td>
                  <td className="py-3 px-3 text-right">{row.samples}</td>
                  <td className="py-3 px-3 text-right">{fmt(row.averageFinish, 2)}</td>
                  <td className="py-3 px-3 text-right font-semibold">{pct(row.titleRate)}</td>
                  <td className="py-3 px-3 text-right">{pct(row.d1TopFourRate)}</td>
                  <td className="py-3 px-3 text-right">{pct(row.d1TopTenRate)}</td>
                  <td className="py-3 px-3 text-right">{pct(row.promotedRate)}</td>
                  <td className="py-3 px-3 text-right">{pct(row.playoffRate)}</td>
                  <td className="py-3 px-3 text-right">{pct(row.bottomFourRate)}</td>
                  <td className="py-3 px-3 text-right">{pct(row.bottomThreeRate)}</td>
                  <td className="py-3 px-3 text-right">{pct(row.smfaRate)}</td>
                  <td className="py-3 px-3 text-right">{pct(row.worldClubRate)}</td>
                  <td className="py-3 px-3 text-right">{pct(row.top100Rate)}</td>
                  <td className="py-3 px-3 text-right">{pct(row.youthRate)}</td>
                </tr>
              ))}
              {!evidence.outcomeBands.length && <tr><td colSpan="14" className="py-8 text-center text-gray-500">No matched ETOT data available for this scope.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-lg font-bold flex items-center gap-2"><Medal className="w-5 h-5 text-purple-600" /> Silverware conversion</h3>
            <p className="text-sm text-gray-500">Formula: honour score per season divided by average ETOT. League, SMFA and WCC/WCS wins = 3; Top 100 cups = 2; Youth/other cups = 1.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left py-3 px-3">Manager</th>
                  <th className="text-right py-3 px-3">Seasons</th>
                  <th className="text-right py-3 px-3">Avg ETOT</th>
                  <th className="text-right py-3 px-3">Score</th>
                  <th className="text-right py-3 px-3">Score/season</th>
                  <th className="text-right py-3 px-3">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {evidence.silverwareConversion.slice(0, 30).map((row) => (
                  <tr key={row.manager} className="border-t">
                    <td className="py-3 px-3 font-semibold">{row.manager}</td>
                    <td className="py-3 px-3 text-right">{row.seasons}</td>
                    <td className="py-3 px-3 text-right">{fmt(row.averageETOT, 2)}</td>
                    <td className="py-3 px-3 text-right font-bold">{row.honourScore}</td>
                    <td className="py-3 px-3 text-right">{fmt(row.scorePerSeason, 3)}</td>
                    <td className="py-3 px-3 text-right font-black text-purple-700">{fmt(row.silverwareConversion, 5)}</td>
                  </tr>
                ))}
                {!evidence.silverwareConversion.length && <tr><td colSpan="6" className="py-8 text-center text-gray-500">No silverware conversion rows available.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-lg font-bold flex items-center gap-2"><Shield className="w-5 h-5 text-blue-600" /> Cup specialists by competition family</h3>
            <p className="text-sm text-gray-500">SMFA, World Club, Top 100 and Youth competitions are separated because they reward different strengths.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left py-3 px-3">Manager</th>
                  <th className="text-right py-3 px-3">SMFA</th>
                  <th className="text-right py-3 px-3">WCC/WCS</th>
                  <th className="text-right py-3 px-3">Top 100</th>
                  <th className="text-right py-3 px-3">Youth</th>
                  <th className="text-right py-3 px-3">Other</th>
                  <th className="text-right py-3 px-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {evidence.cupFamilies.slice(0, 30).map((row) => (
                  <tr key={row.manager} className="border-t">
                    <td className="py-3 px-3 font-semibold">{row.manager}</td>
                    <td className="py-3 px-3 text-right font-semibold">{row.smfa}</td>
                    <td className="py-3 px-3 text-right font-semibold">{row.worldClub}</td>
                    <td className="py-3 px-3 text-right font-semibold">{row.top100}</td>
                    <td className="py-3 px-3 text-right font-bold">{row.youth}</td>
                    <td className="py-3 px-3 text-right">{row.otherCups}</td>
                    <td className="py-3 px-3 text-right font-black">{row.total}</td>
                  </tr>
                ))}
                {!evidence.cupFamilies.length && <tr><td colSpan="7" className="py-8 text-center text-gray-500">No cup family rows available.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="text-lg font-bold mb-3">Honours coverage</h3>
        <div className="flex flex-wrap gap-2">
          {evidence.honoursCoverage.map((row) => (
            <span key={row.family} className="px-3 py-2 rounded-full bg-gray-100 text-gray-800 text-sm font-semibold">
              {row.family}: {row.records} records / {row.seasons} seasons
            </span>
          ))}
          {!evidence.honoursCoverage.length && <span className="text-sm text-gray-500">No honours rows loaded.</span>}
        </div>
      </div>
    </div>
  );
};

export default SuccessEvidencePanel;
