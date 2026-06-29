import React, { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
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

const isKnownStrength = (value) => {
  const n = toNumber(value);
  return n !== null && n > 0;
};

const getPosition = (row) => toNumber(row.position ?? row.finalPositionFromStats ?? row.finalPosition);

const outcomeBadge = (row) => {
  const position = getPosition(row);
  const division = toNumber(row.division);

  if (position === 1) return "🏆";
  if (division >= 2 && division <= 5 && position >= 2 && position <= 3) return "↑";
  if (division >= 1 && division <= 4 && position >= 17 && position <= 20) return "↓";
  if (position >= 18 && position <= 20) return "⛔";
  return "";
};

const outcomeLabel = (row) => {
  const badge = outcomeBadge(row);
  if (badge === "🏆") return "Champion";
  if (badge === "↑") return "Promoted";
  if (badge === "↓") return "Relegated";
  if (badge === "⛔") return "Auto-sacked";
  return "";
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const row = payload.find((entry) => entry?.payload?.etot !== undefined)?.payload || payload[0].payload;
  const outcome = outcomeLabel(row);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm max-w-xs">
      <div className="font-black text-gray-900 mb-1">
        S{row.season} · {row.club}
      </div>
      <div className="text-gray-600 space-y-0.5">
        <div>ETOT: <strong>{fmt(row.etot, 2)}</strong></div>
        <div>Inherited: <strong>{fmt(row.inheritedStrength, 2)}</strong></div>
        <div>Net from inherited: <strong>{fmt(row.netFromInherited, 2, "signed")}</strong></div>
        <div>Highest in spell: <strong>{fmt(row.highestStrength, 2)}</strong></div>
        <div>Predicted: <strong>{row.predictedPosition ?? "—"}</strong></div>
        <div>Finished: <strong>{row.position ?? row.finalPositionFromStats ?? "—"}</strong></div>
        <div>VA: <strong>{fmt(row.valueAdded, 0, "signed")}</strong></div>
        <div>PVA: <strong>{fmt(row.pva, 3, "signed")}</strong></div>
        {outcome && <div>Outcome: <strong>{outcome}</strong></div>}
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

const SegmentLegend = () => (
  <div className="flex flex-wrap gap-3 text-xs text-gray-600 px-4 pb-3">
    <span><span className="font-bold text-green-700">●</span> ETOT increased</span>
    <span><span className="font-bold text-red-700">●</span> ETOT decreased</span>
    <span><span className="font-bold text-gray-500">●</span> First known season</span>
    <span><span className="font-bold text-purple-700">│</span> Club spell start</span>
    <span>🏆 Champion</span>
    <span>↑ Promoted</span>
    <span>↓ Relegated</span>
    <span>⛔ Auto-sacked</span>
  </div>
);

const ManagerCareerEtotChart = ({ summary }) => {
  const { chartData, spellBands, segments } = useMemo(() => {
    if (!summary?.clubSpells?.length) return { chartData: [], spellBands: [], segments: [] };

    let pointIndex = 0;

    const rows = summary.clubSpells.flatMap((spell) => {
      const rowsWithStrength = spell.rows.filter((row) => isKnownStrength(row.etot));
      const inheritedStrength = toNumber(rowsWithStrength[0]?.etot);
      const highestStrength = rowsWithStrength.reduce((best, row) => {
        const etot = toNumber(row.etot);
        return etot !== null && etot > best ? etot : best;
      }, Number.NEGATIVE_INFINITY);

      return rowsWithStrength.map((row, index) => {
        const etot = toNumber(row.etot);
        const point = {
          ...row,
          club: spell.club,
          x: pointIndex,
          seasonLabel: `S${row.season}`,
          etot,
          inheritedStrength,
          highestStrength: Number.isFinite(highestStrength) ? highestStrength : null,
          netFromInherited: inheritedStrength !== null && etot !== null ? etot - inheritedStrength : null,
          isSpellStart: index === 0,
        };
        pointIndex += 1;
        return point;
      });
    });

    const bands = [];
    summary.clubSpells.forEach((spell) => {
      const spellRows = rows.filter((row) => row.club === spell.club && spell.rows.some((sourceRow) => sourceRow.season === row.season));
      if (!spellRows.length) return;

      const first = spellRows[0];
      const last = spellRows[spellRows.length - 1];
      if (!isKnownStrength(first.inheritedStrength) || !isKnownStrength(first.highestStrength)) return;

      bands.push({
        club: spell.club,
        x1: first.x,
        x2: last.x,
        y1: first.inheritedStrength,
        y2: first.highestStrength,
      });
    });

    const lineSegments = [];
    rows.forEach((row, index) => {
      if (index === 0) return;
      const previous = rows[index - 1];
      const delta = row.etot - previous.etot;

      lineSegments.push({
        key: `${previous.x}-${row.x}`,
        data: [previous, row],
        stroke: delta > 0 ? "#15803d" : delta < 0 ? "#b91c1c" : "#6b7280",
      });
    });

    return { chartData: rows, spellBands: bands, segments: lineSegments };
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
          Squad strength over time. Segment colour shows season-to-season movement; dashed lines mark inherited strength and club spell starts.
        </p>
      </div>

      <div className="p-4 h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 28, right: 28, left: 0, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="x"
              type="number"
              domain={["dataMin", "dataMax"]}
              ticks={chartData.map((row) => row.x)}
              tickFormatter={(value) => chartData.find((row) => row.x === value)?.seasonLabel || ""}
            />
            <YAxis domain={["dataMin - 2", "dataMax + 2"]} tickFormatter={(value) => Number(value).toFixed(0)} />
            <Tooltip content={<CustomTooltip />} />

            {spellBands.map((band) => (
              <ReferenceArea
                key={`${band.club}-${band.x1}-${band.x2}`}
                x1={band.x1}
                x2={band.x2}
                y1={band.y1}
                y2={band.y2}
                ifOverflow="extendDomain"
                fill="#bbf7d0"
                fillOpacity={0.18}
                strokeOpacity={0}
              />
            ))}

            {chartData
              .filter((row) => row.isSpellStart)
              .map((row) => (
                <ReferenceLine
                  key={`spell-${row.x}-${row.club}`}
                  x={row.x}
                  stroke="#7c3aed"
                  strokeDasharray="5 5"
                  strokeOpacity={0.6}
                  label={{ value: row.club, position: "top", fontSize: 11, fill: "#6d28d9" }}
                />
              ))}

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

            {segments.map((segment) => (
              <Line
                key={segment.key}
                data={segment.data}
                type="linear"
                dataKey="etot"
                stroke={segment.stroke}
                strokeWidth={4}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            ))}

            <Line
              type="linear"
              dataKey="etot"
              name="ETOT"
              stroke="transparent"
              strokeWidth={1}
              dot={<CustomDot />}
              activeDot={{ r: 6 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <SegmentLegend />

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
