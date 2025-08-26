import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

// expects props: { thresholdHistory }
const Charts = ({ thresholdHistory }) => {
  // thresholdHistory = {
  //   win: [ { season, division, points }, ... ],
  //   autoPromo: [...],
  //   playoffs: [...],
  //   avoidReleg: [...],
  //   avoidSack: [...]
  // }

  const chartDefs = [
    { key: "win", title: "Win Division (Pos 1)" },
    { key: "autoPromo", title: "Auto-Promotion (Pos 3 in D2–D5)" },
    { key: "playoffs", title: "Playoffs (Pos 7 in D2–D5)" },
    { key: "avoidReleg", title: "Avoid Relegation (Pos 16 in D1–D4)" },
    { key: "avoidSack", title: "Avoid Sacking (Pos 17 in all Divs)" },
  ];

  // Build chart data: group by season, add fields per division
  const buildData = (rows) => {
    const map = new Map(); // season -> { season, D1: x, D2: y ... }
    rows.forEach((r) => {
      const season = r.season;
      const div = `D${r.division}`;
      if (!map.has(season)) map.set(season, { season });
      map.get(season)[div] = parseInt(r.points, 10);
    });
    return [...map.values()].sort((a, b) => parseInt(a.season) - parseInt(b.season));
  };

  const renderChart = (rows, title) => {
    const data = buildData(rows);
    const divisions = [...new Set(rows.map((r) => `D${r.division}`))].sort();

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h4 className="font-semibold mb-3">{title}</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="season" />
            <YAxis />
            <Tooltip />
            <Legend />
            {divisions.map((d, i) => (
              <Line
                key={d}
                type="monotone"
                dataKey={d}
                stroke={["#2563eb", "#16a34a", "#9333ea", "#f97316", "#dc2626"][i % 5]}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {chartDefs.map((c) => renderChart(thresholdHistory[c.key] || [], c.title))}
    </div>
  );
};

export default Charts;