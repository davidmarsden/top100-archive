import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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

const HistoryChartModal = ({ isOpen, onClose, title, subtitle, data = [] }) => {
  if (!isOpen) return null;

  const hasData = Array.isArray(data) && data.length >= 2;

  return (
    <div className="history-modal-backdrop" onClick={onClose}>
      <div className="history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-modal-header">
          <div>
            <h2>{title || "History chart"}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <button className="history-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {!hasData ? (
          <div className="history-modal-empty">
            Not enough historical data to draw a chart yet.
          </div>
        ) : (
          <div className="history-chart-wrap">
            <ResponsiveContainer width="100%" height={360}>
              <LineChart
                data={data}
                margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="season" />
                <YAxis
                  dataKey="globalRank"
                  reversed
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(value) => `#${value}`}
                  label={{
                    value: "Overall rank",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "globalRank") return [`#${value}`, "Overall rank"];
                    return [value, name];
                  }}
                  labelFormatter={(season) => `Season ${season}`}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;

                    const row = payload[0].payload;

                    return (
                      <div className="history-tooltip">
                        <strong>Season {label}</strong>
                        <div>{row.club}</div>
                        {row.manager && <div>Manager: {row.manager}</div>}
                        <div>Division: {row.division}</div>
                        <div>Position: {ordinal(row.position)}</div>
                        <div>Overall rank: #{row.globalRank}</div>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="globalRank"
                  name="globalRank"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryChartModal;