import React, { useMemo } from "react";
import { BarChart3, Medal, Shield, Trophy } from "lucide-react";
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

const CorrelationCard = ({ item }) => {
  const n = Number(item.value);
  const tone = Number.isFinite(n)
    ? Math.abs(n) >= 0.6
      ? "Strong"
      : Math.abs(n) >= 0.35
      ? "Moderate"
      : "Weak"
    : "Insufficient data";

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <div className="font-black text-gray-900">{item.label}</div>
      <div className="text-2xl font-black text-purple-700 mt-2">{fmt(item.value, 3, "signed")}</div>
      <div className="text-xs font-bold text-gray-500 mt-1">{tone}</div>
      <p className="text-xs text-gray-500 mt-2">{item.note}</p>
    </div>
  );
};

const SuccessEvidencePanel = ({ archiveRows = [], statsRows = [], honours = {} }) => {
  const evidence = useMemo(
    () => buildSuccessEvidence(archiveRows, statsRows, honours),
    [archiveRows, statsRows, honours]
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-5 border-b bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            <div>
              <h3 className="text-xl font-black text-gray-900">Success Evidence</h3>
              <p className="text-sm text-gray-500">
                Joins Malcolm&apos;s ETOT/PVA archive with league outcomes and honours history.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Matched stat seasons" value={evidence.matchedRowCount} hint={`${evidence.rowCount} history rows joined`} />
          <StatCard label="Honours records" value={evidence.honoursRowCount} hint="Club + manager honours rows" />
          <StatCard label="Title avg ETOT" value={fmt(evidence.headlineAverages.titleAverageETOT, 2)} hint={`All matched avg ${fmt(evidence.headlineAverages.allAverageETOT, 2)}`} />
          <StatCard label="Cup avg ETOT" value={fmt(evidence.headlineAverages.cupAverageETOT, 2)} hint="Cup, Shield and youth honours" />
        </div>

        <div className="px-5 pb-5 grid lg:grid-cols-2 gap-3">
          {evidence.correlations.map((item) => <CorrelationCard key={item.id} item={item} />)}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600" /> ETOT success curve
          </h3>
          <p className="text-sm text-gray-500">Squad-strength bands against league and honours outcomes.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left py-3 px-3">ETOT band</th>
                <th className="text-right py-3 px-3">Samples</th>
                <th className="text-right py-3 px-3">Avg rank</th>
                <th className="text-right py-3 px-3">Title %</th>
                <th className="text-right py-3 px-3">Top 4 %</th>
                <th className="text-right py-3 px-3">Promo race %</th>
                <th className="text-right py-3 px-3">Relegation %</th>
                <th className="text-right py-3 px-3">Cup honour %</th>
                <th className="text-right py-3 px-3">Youth honour %</th>
              </tr>
            </thead>
            <tbody>
              {evidence.outcomeBands.map((row) => (
                <tr key={row.band} className="border-t">
                  <td className="py-3 px-3 font-black">{row.band}</td>
                  <td className="py-3 px-3 text-right">{row.samples}</td>
                  <td className="py-3 px-3 text-right">{fmt(row.averageRank, 2)}</td>
                  <td className="py-3 px-3 text-right font-semibold">{pct(row.titleRate)}</td>
                  <td className="py-3 px-3 text-right">{pct(row.topFourRate)}</td>
                  <td className="py-3 px-3 text-right">{pct(row.promotionRate)}</td>
                  <td className="py-3 px-3 text-right">{pct(row.relegationRate)}</td>
                  <td className="py-3 px-3 text-right">{pct(row.cupHonourRate)}</td>
                  <td className="py-3 px-3 text-right">{pct(row.youthHonourRate)}</td>
                </tr>
              ))}
              {!evidence.outcomeBands.length && (
                <tr><td colSpan="9" className="py-8 text-center text-gray-500">No matched ETOT data available yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Medal className="w-5 h-5 text-purple-600" /> Trophy efficiency
            </h3>
            <p className="text-sm text-gray-500">Managers converting squad strength into silverware.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left py-3 px-3">Manager</th>
                  <th className="text-right py-3 px-3">Seasons</th>
                  <th className="text-right py-3 px-3">Avg ETOT</th>
                  <th className="text-right py-3 px-3">Honour score</th>
                  <th className="text-right py-3 px-3">Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {evidence.trophyEfficiency.map((row) => (
                  <tr key={row.manager} className="border-t">
                    <td className="py-3 px-3 font-semibold">{row.manager}</td>
                    <td className="py-3 px-3 text-right">{row.seasons}</td>
                    <td className="py-3 px-3 text-right">{fmt(row.averageETOT, 2)}</td>
                    <td className="py-3 px-3 text-right font-bold">{row.honourScore}</td>
                    <td className="py-3 px-3 text-right font-black text-purple-700">{fmt(row.trophyEfficiency, 4)}</td>
                  </tr>
                ))}
                {!evidence.trophyEfficiency.length && (
                  <tr><td colSpan="5" className="py-8 text-center text-gray-500">No trophy efficiency rows yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" /> Cup specialists
            </h3>
            <p className="text-sm text-gray-500">Cup, Shield, Youth Cup and Youth Shield wins by manager.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left py-3 px-3">Manager</th>
                  <th className="text-right py-3 px-3">Cup</th>
                  <th className="text-right py-3 px-3">Shield</th>
                  <th className="text-right py-3 px-3">Youth Cup</th>
                  <th className="text-right py-3 px-3">Youth Shield</th>
                  <th className="text-right py-3 px-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {evidence.cupSpecialists.map((row) => (
                  <tr key={row.manager} className="border-t">
                    <td className="py-3 px-3 font-semibold">{row.manager}</td>
                    <td className="py-3 px-3 text-right">{row.cup}</td>
                    <td className="py-3 px-3 text-right">{row.shield}</td>
                    <td className="py-3 px-3 text-right font-bold">{row.youthCup}</td>
                    <td className="py-3 px-3 text-right">{row.youthShield}</td>
                    <td className="py-3 px-3 text-right font-black">{row.cupTotal}</td>
                  </tr>
                ))}
                {!evidence.cupSpecialists.length && (
                  <tr><td colSpan="6" className="py-8 text-center text-gray-500">No cup specialist rows yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessEvidencePanel;
