import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const fmt = (value, digits = 2, prefix = "") => {
  const n = toNumber(value);
  if (n === null) return "—";
  const sign = prefix === "signed" && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}`;
};

const TooltipContent = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm max-w-xs">
      <div className="font-black text-gray-900 mb-1">{row.label}</div>
      <div className="text-gray-600 space-y-0.5">
        <div>Inherited ETOT: <strong>{fmt(row.inheritedStrength, 2)}</strong></div>
        <div>Last ETOT: <strong>{fmt(row.lastStrength, 2)}</strong></div>
        <div>Highest ETOT: <strong>{fmt(row.highestStrength, 2)}</strong></div>
        <div>Net: <strong>{fmt(row.netStrengthGain, 2, "signed")}</strong></div>
        <div>Seasons: <strong>{row.seasons}</strong></div>
      </div>
    </div>
  );
};

const ManagerStrengthSpellChart = ({ summary }) => {
  const chartData = useMemo(() => {
    if (!summary?.clubSpells?.length) return [];

    return summary.clubSpells
      .filter((spell) => toNumber(spell.netStrengthGain) !== null)
      .map((spell) => ({
        ...spell,
        label: `${spell.club} S${spell.firstSeason}–S${spell.lastSeason}`,
        netStrengthGain: toNumber(spell.netStrengthGain),
      }));
  }, [summary]);

  if (!chartData.length) {
    return (
      <div className="bg-white rounded-xl shadow p-6 text-gray-500">
        No inherited/last strength data available for this manager yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="text-lg font-bold">Inherited vs last strength</h3>
        <p className="text-sm text-gray-500">
          Net ETOT change by club spell. Positive means the squad ended stronger than the first known inherited strength.
        </p>
      </div>

      <div className="p-4 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 90, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(value) => Number(value).toFixed(0)} />
            <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11 }} />
            <ReferenceLine x={0} stroke="#6b7280" strokeDasharray="4 4" />
            <Tooltip content={<TooltipContent />} />
            <Bar dataKey="netStrengthGain" name="Net strength" radius={[4, 4, 4, 4]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ManagerStrengthSpellChart;
