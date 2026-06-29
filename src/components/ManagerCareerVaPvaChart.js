import React, { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
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
      <div className="font-black text-gray-900 mb-1">
        S{row.season} · {row.club}
      </div>
      <div className="text-gray-600 space-y-0.5">
        <div>Predicted: <strong>{row.predictedPosition ?? "—"}</strong></div>
        <div>Finished: <strong>{row.position ?? row.finalPositionFromStats ?? "—"}</strong></div>
        <div>PVA: <strong>{fmt(row.pva, 3, "signed")}</strong></div>
        <div>VA: <strong>{fmt(row.valueAdded, 0, "signed")}</strong></div>
        <div>ETOT: <strong>{fmt(row.etot, 2)}</strong></div>
      </div>
    </div>
  );
};

const ManagerCareerVaPvaChart = ({ summary }) => {
  const chartData = useMemo(() => {
    if (!summary?.clubSpells?.length) return [];

    return summary.clubSpells
      .flatMap((spell) => spell.rows.map((row) => ({ ...row, club: spell.club })))
      .filter((row) => toNumber(row.pva) !== null)
      .map((row, index) => ({
        ...row,
        x: index,
        seasonLabel: `S${row.season}`,
        valueAdded: toNumber(row.valueAdded),
        pva: toNumber(row.pva),
      }));
  }, [summary]);

  const pvaStats = useMemo(() => {
    if (!chartData.length) return null;
    const best = chartData.reduce((winner, row) => (row.pva > winner.pva ? row : winner), chartData[0]);
    const worst = chartData.reduce((loser, row) => (row.pva < loser.pva ? row : loser), chartData[0]);
    const average = chartData.reduce((sum, row) => sum + row.pva, 0) / chartData.length;
    return { best, worst, average };
  }, [chartData]);

  if (!chartData.length) {
    return (
      <div className="bg-white rounded-xl shadow p-6 text-gray-500">
        No PVA data available for this manager yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="text-lg font-bold">Career Performance Index</h3>
        <p className="text-sm text-gray-500">
          PVA is the fairer expectation measure. Above zero means outperforming Malcolm&apos;s prediction; below zero means underperforming.
        </p>
      </div>

      <div className="p-4 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 24, left: 0, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="x"
              type="number"
              domain={["dataMin", "dataMax"]}
              ticks={chartData.map((row) => row.x)}
              tickFormatter={(value) => chartData.find((row) => row.x === value)?.seasonLabel || ""}
            />
            <YAxis tickFormatter={(value) => Number(value).toFixed(1)} />
            <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" label={{ value: "Expectation", position: "right", fontSize: 11, fill: "#6b7280" }} />
            <Tooltip content={<TooltipContent />} />
            <Line
              type="linear"
              dataKey="pva"
              name="PVA"
              stroke="#7c3aed"
              strokeWidth={3}
              dot={{ r: 4 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-gray-50 border-t text-sm">
        <div>
          <div className="text-gray-500">Average PVA</div>
          <div className="font-black text-gray-900 text-xl">{fmt(pvaStats?.average, 3, "signed")}</div>
          <div className="text-gray-500">Across matched seasons</div>
        </div>
        <div>
          <div className="text-gray-500">Best PVA</div>
          <div className="font-black text-gray-900 text-xl">{fmt(pvaStats?.best?.pva, 3, "signed")}</div>
          <div className="text-gray-500">S{pvaStats?.best?.season} · {pvaStats?.best?.club}</div>
        </div>
        <div>
          <div className="text-gray-500">Worst PVA</div>
          <div className="font-black text-gray-900 text-xl">{fmt(pvaStats?.worst?.pva, 3, "signed")}</div>
          <div className="text-gray-500">S{pvaStats?.worst?.season} · {pvaStats?.worst?.club}</div>
        </div>
      </div>
    </div>
  );
};

export default ManagerCareerVaPvaChart;
