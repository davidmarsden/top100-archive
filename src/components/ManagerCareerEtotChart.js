import React, { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
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

const isKnownStrength = (value) => {
  const n = toNumber(value);
  return n !== null && n > 0;
};

const outcomeBadge = (row) => {
  const position = toNumber(row.position ?? row.finalPositionFromStats ?? row.finalPosition);
  const division = toNumber(row.division);

  if (position === 1) return "🏆";
  if (division >= 2 && division <= 5 && position >= 2 && position <= 3) return "↑";
  if (division >= 1 && division <= 4 && position >= 17 && position <= 20) return "↓";
  if (position >= 18 && position <= 20) return "⛔";
  return "";
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const row = payload[0].payload;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm max-w-xs">
      <div className="font-black text-gray-900 mb-1">
        S{row.season} · {row.club}
      </div>
      <div className="text-gray-600 space-y-0.5">
        <div>ETOT: <strong>{fmt(row.etot, 2)}</strong></div>
        <div>Inherited: <strong>{fmt(row.inheritedStrength, 2)}</strong></div>
        <div>Net from inherited: <strong>{fmt(row.netFromInherited, 2, "signed")}</strong></div>
        <div>Predicted: <strong>{row.predictedPosition ?? "—"}</strong></div>
        <div>Finished: <strong>{row.position ?? row.finalPositionFromStats ?? "—"}</strong></div>
        <div>VA: <strong>{fmt(row.valueAdded, 0, "signed")}</strong></div>
        <div>PVA: <strong>{fmt(row.pva, 3, "signed")}</strong></div>
      </div>
    </div>
  );
};

const CustomDot = ({ cx, cy, payload }) => {
  if (cx === undefined || cy === undefined || !payload) return null;

  const badge = outcomeBadge(payload);
  const hasClubChange = payload.isSpellStart;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={hasClubChange ? 5 : 4}
        fill="#ffffff"
        stroke={hasClubChange ? "#7c3aed" : "#2563eb"}
        strokeWidth={hasClubChange ? 3 : 2}
      />
      {badge && (
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize="13">
          {badge}
        </text>
      )}
    </g>
  );
};

const ManagerCareerEtotChart = ({ summary }) => {
  const chartData = useMemo(() => {
    if (!summary?.clubSpells?.length) return [];

    return summary.clubSpells.flatMap((spell) => {
      const rowsWithStrength = spell.rows.filter((row) => isKnownStrength(row.etot));
      const inheritedStrength = rowsWithStrength[0]?.etot ?? null;

      return spell.rows
        .filter((row) => isKnownStrength(row.etot))
        .map((row, index) => {
          const etot = toNumber(row.etot);
          const inherited = toNumber(inheritedStrength);
          return {
            ...row,
            club: spell.club,
            seasonLabel: `S${row.season}`,
            seasonSort: Number(row.season) || 0,
            etot,
            inheritedStrength: inherited,
            netFromInherited: inherited !== null && etot !== null ? etot - inherited : null,
            isSpellStart: index === 0,
          };
        });
    });
  }, [summary]);

  const chartStats = useMemo(() => {
    if (!chartData.length) return null;

    const peak = chartData.reduce((best, row) => (!best || row.etot > best.etot ? row : best), null);
    const lowest = chartData.reduce((worst, row) => (!worst || row.etot < worst.etot ? row : worst), null);
    const first = chartData[0];
    const last = chartData[chartData.length - 1];

    return {
      peak,
      lowest,
      totalChange: first && last ? last.etot - first.etot : null,
    };
  }, [chartData]);

  if (!chartData.length) {
    return (
      <div className="bg-white rounded-xl shadow p-6 text-gray-500">
        No known ETOT values available for this manager yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="text-lg font-bold">Career ETOT graph</h3>
        <p className="text-sm text-gray-500">
          Squad strength over time. Purple dots mark club spell starts; icons mark major outcomes.
        </p>
      </div>

      <div className="p-4 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 24, right: 24, left: 0, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="seasonLabel" />
            <YAxis domain={["dataMin - 2", "dataMax + 2"]} tickFormatter={(value) => Number(value).toFixed(0)} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="etot"
              name="ETOT"
              stroke="#2563eb"
              strokeWidth={3}
              dot={<CustomDot />}
              activeDot={{ r: 6 }}
              connectNulls
            />
            <Line
              type="stepAfter"
              dataKey="inheritedStrength"
              name="Inherited ETOT"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="6 6"
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {chartStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-gray-50 border-t text-sm">
          <div>
            <div className="text-gray-500">Peak ETOT</div>
            <div className="font-black text-gray-900 text-xl">{fmt(chartStats.peak?.etot, 2)}</div>
            <div className="text-gray-500">S{chartStats.peak?.season} · {chartStats.peak?.club}</div>
          </div>
          <div>
            <div className="text-gray-500">Lowest ETOT</div>
            <div className="font-black text-gray-900 text-xl">{fmt(chartStats.lowest?.etot, 2)}</div>
            <div className="text-gray-500">S{chartStats.lowest?.season} · {chartStats.lowest?.club}</div>
          </div>
          <div>
            <div className="text-gray-500">Known ETOT change</div>
            <div className="font-black text-gray-900 text-xl">{fmt(chartStats.totalChange, 2, "signed")}</div>
            <div className="text-gray-500">First known to latest known</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerCareerEtotChart;
