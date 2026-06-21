import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
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

const HistoryChartModal = ({ isOpen, onClose, title, subtitle, data = [], series }) => {
  if (!isOpen) return null;

  const hasData = Array.isArray(data) && data.length >= 2;

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

        {!hasData ? (
          <div className="py-16 text-center text-gray-500">
            Not enough historical data to draw a chart yet.
          </div>
        ) : (
          <div className="w-full h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
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

                    return (
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                        <div className="font-bold mb-1">{label}</div>
                        <div>{row.club}</div>
                        {row.manager && <div>Manager: {row.manager}</div>}
                        <div>Division: {row.division}</div>
                        <div>Position: {ordinal(row.position)}</div>
                        <div>Overall rank: #{row.globalRank}</div>
{row.points && <div>Points: {row.points}</div>}
{row.eventLabel && (
  <div className="mt-1 font-semibold text-blue-700">
    {row.eventLabel}
  </div>
)}
                      </div>
                    );
                  }}
                />
{(series || [{ dataKey: "globalRank", label: "Overall rank" }]).map((s) => (
  <Line
    key={s.dataKey}
    type="monotone"
    dataKey={s.dataKey}
    name={s.label}
    strokeWidth={3}
    dot={{ r: 4 }}
    activeDot={{ r: 7 }}
    connectNulls
  />
))}

{data
  .filter((row) => row.eventLabel)
  .map((row) => (
    <ReferenceLine
      key={`${row.season}-${row.eventLabel}`}
      x={row.season}
      strokeDasharray="4 4"
      label={{
        value: row.eventLabel,
        position: "top",
        fontSize: 11,
      }}
    />
  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryChartModal;