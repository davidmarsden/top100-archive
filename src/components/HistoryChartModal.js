import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const ordinal = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return n || "";
  const suffix =
    num % 100 >= 11 && num % 100 <= 13
      ? "th"
      : ["th", "st", "nd", "rd"][num % 10] || "th";
  return `${num}${suffix}`;
};

const lineColors = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
];

const CustomDot = ({ cx, cy, payload, dataKey, stroke }) => {
  if (cx == null || cy == null) return null;

  const labels = payload?.labels || payload?.[`${dataKey}_labels`] || [];
  const eventLabel = payload?.eventLabel;

  const normalDot = (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="white"
      stroke={stroke || "#3B82F6"}
      strokeWidth={2}
    />
  );

  let badge = normalDot;

  if (labels.includes("Champions")) {
    badge = (
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize="18">
        👑
      </text>
    );
  } else if (labels.includes("Auto-promoted")) {
    badge = (
      <g>
        <rect
          x={cx - 8}
          y={cy - 8}
          width={16}
          height={16}
          rx={3}
          fill="#16A34A"
        />
        <text
          x={cx}
          y={cy + 5}
          textAnchor="middle"
          fill="white"
          fontSize="12"
          fontWeight="bold"
        >
          ↑
        </text>
      </g>
    );
  } else if (labels.includes("Playoff winners")) {
    badge = (
      <g>
        <rect
          x={cx - 8}
          y={cy - 8}
          width={16}
          height={16}
          rx={3}
          fill="#FACC15"
        />
        <text
          x={cx}
          y={cy + 5}
          textAnchor="middle"
          fill="#111827"
          fontSize="12"
          fontWeight="bold"
        >
          ↑
        </text>
      </g>
    );
  } else if (labels.includes("Relegated")) {
    badge = (
      <g>
        <rect
          x={cx - 8}
          y={cy - 8}
          width={16}
          height={16}
          rx={3}
          fill="#DC2626"
        />
        <text
          x={cx}
          y={cy + 5}
          textAnchor="middle"
          fill="white"
          fontSize="12"
          fontWeight="bold"
        >
          ↓
        </text>
      </g>
    );
  } else if (labels.includes("Auto-sacked")) {
    badge = (
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize="16">
        ⛔
      </text>
    );
  }



  return (
    <g>
      {eventLabel && (
        <>
          <line
  x1={cx}
  y1={28}
  x2={cx}
  y2={cy - 12}
  stroke="#6B7280"
  strokeDasharray="4 4"
/>
<text
  x={cx}
  y={18}
  textAnchor="middle"
  fontSize="11"
  fill="#374151"
>
  {eventLabel}
</text>
        </>
      )}

      {badge}
    </g>
  );
};

const HistoryChartModal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  data = [],
  series,
  summary,
  showEventIcons = true,
  setShowEventIcons,
}) => {
  if (!isOpen) return null;

  const hasData = Array.isArray(data) && data.length >= 2;
  const chartSeries = series || [
    { dataKey: "globalRank", label: "Overall rank" },
  ];

  const careerData = data;
  const eventRows = careerData.filter((row) => row.eventLabel);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {title || "History chart"}
            </h2>
            {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
          </div>

          <button
            onClick={onClose}
            className="text-3xl leading-none text-gray-400 hover:text-gray-800"
            aria-label="Close chart"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowEventIcons?.(!showEventIcons)}
            className={`px-3 py-2 rounded-lg text-sm font-semibold ${
              showEventIcons
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            {showEventIcons ? "Hide event badges" : "Show event badges"}
          </button>
        </div>

        <div className="text-xs text-gray-500 mb-2">
          Club change markers found: {eventRows.length}
        </div>

<div className="text-xs text-gray-500 mb-2">
  Club change markers found: {eventRows.length}
</div>

<div className="flex flex-wrap gap-3 text-xs text-gray-600 mb-4">
  <span>👑 Champions</span>
  <span>
    <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-green-600 text-white font-bold">
      ↑
    </span>{" "}
    Auto-promoted
  </span>
  <span>
    <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-yellow-300 text-gray-900 font-bold">
      ↑
    </span>{" "}
    Playoff winners
  </span>
  <span>
    <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-red-600 text-white font-bold">
      ↓
    </span>{" "}
    Relegated
  </span>
  <span>⛔ Auto-sacked</span>
  <span>
    <span className="inline-block w-5 border-t border-dashed border-gray-500 align-middle"></span>{" "}
    Club change
  </span>
</div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Seasons</div>
              <div className="font-bold">{summary.seasons}</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Clubs</div>
              <div className="font-bold">{summary.clubs}</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Best rank</div>
              <div className="font-bold">#{summary.bestRank}</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Average rank</div>
              <div className="font-bold">#{summary.averageRank}</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Titles</div>
              <div className="font-bold">{summary.titles}</div>
            </div>

            <div className="col-span-2 md:col-span-5 text-sm text-gray-600">
              Clubs: {summary.clubList}
            </div>
          </div>
        )}

        {!hasData ? (
          <div className="py-16 text-center text-gray-500">
            Not enough historical data to draw a chart yet.
          </div>
        ) : (
          <div className="w-full h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={careerData}
                margin={{ top: 56, right: 30, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="season" />
                <YAxis
                  reversed
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(value) => `#${value}`}
                />

                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;

                    const row = payload[0].payload;
                    const isComparison = !!series;

                    return (
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm max-w-xs">
                        <div className="font-bold mb-2">{label}</div>

                        {isComparison ? (
                          payload.map((entry, idx) => (
                            <div key={idx} className="mb-3">
                              <div
                                className="font-semibold"
                                style={{ color: entry.color }}
                              >
                                {entry.name}
                              </div>

                              <div>Rank: #{entry.value}</div>

                              {row[`${entry.name}_club`] && (
                                <div>Club: {row[`${entry.name}_club`]}</div>
                              )}

                              {row[`${entry.name}_division`] && (
                                <div>
                                  Division: {row[`${entry.name}_division`]}
                                </div>
                              )}

                              {row[`${entry.name}_position`] && (
                                <div>
                                  Position:{" "}
                                  {ordinal(row[`${entry.name}_position`])}
                                </div>
                              )}

                              {row[`${entry.name}_points`] && (
                                <div>Points: {row[`${entry.name}_points`]}</div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div>
                            <div>{row.club}</div>
                            {row.manager && <div>Manager: {row.manager}</div>}
                            <div>Division: {row.division}</div>
                            <div>Position: {ordinal(row.position)}</div>
                            <div>Overall rank: #{row.globalRank}</div>
                            {row.points && <div>Points: {row.points}</div>}
                            {row.played && (
                              <div>
                                Record: {row.won}W {row.drawn}D {row.lost}L
                              </div>
                            )}
                            {Number.isFinite(row.goalDifference) && (
                              <div>
                                GD:{" "}
                                {row.goalDifference > 0
                                  ? `+${row.goalDifference}`
                                  : row.goalDifference}
                              </div>
                            )}

                            {row.labels?.length > 0 && (
                              <div className="mt-2">
                                {row.labels.map((item) => (
                                  <span
                                    key={item}
                                    className="inline-block mr-1 mb-1 px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            )}

                            {row.eventLabel && (
                              <div className="mt-2 font-semibold text-blue-700">
                                {row.eventLabel}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }}
                />

                <Legend />

                {chartSeries.map((s, index) => {
                  const stroke = lineColors[index % lineColors.length];

                  return (
                    <Line
                      key={s.dataKey}
                      type="monotone"
                      dataKey={s.dataKey}
                      name={s.label}
                      stroke={stroke}
                      strokeWidth={3}
                      dot={
                        showEventIcons ? (
                          <CustomDot dataKey={s.dataKey} stroke={stroke} />
                        ) : (
                          { r: 4 }
                        )
                      }
                      activeDot={{ r: 7 }}
                      connectNulls
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryChartModal;