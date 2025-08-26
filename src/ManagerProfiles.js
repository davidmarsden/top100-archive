import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Users, Trophy, ArrowUpCircle, ArrowDownCircle, AlertTriangle } from "lucide-react";

// expects props: { allPositionData }
const ManagerProfiles = ({ allPositionData }) => {
  const [selectedManager, setSelectedManager] = useState("");

  // unique manager list
  const managers = useMemo(
    () =>
      [...new Set(allPositionData.map((r) => (r.manager || "").trim()))]
        .filter(Boolean)
        .sort(),
    [allPositionData]
  );

  const career = useMemo(
    () =>
      allPositionData
        .filter((r) => (r.manager || "").trim() === selectedManager)
        .sort((a, b) => parseInt(a.season) - parseInt(b.season)),
    [allPositionData, selectedManager]
  );

  // summary stats
  const summary = useMemo(() => {
    if (!career.length) return null;
    const titles = career.filter((r) => parseInt(r.position) === 1).length;
    const promos = career.filter(
      (r) => parseInt(r.division) >= 2 && parseInt(r.division) <= 5 && [2, 3].includes(parseInt(r.position))
    ).length;
    const releg = career.filter(
      (r) => parseInt(r.division) <= 4 && parseInt(r.position) >= 17
    ).length;
    const sacks = career.filter((r) => parseInt(r.position) >= 18).length;
    const avgPts =
      Math.round(
        (career.reduce((sum, r) => sum + (parseInt(r.points) || 0), 0) / career.length) * 10
      ) / 10;
    return { titles, promos, releg, sacks, avgPts, seasons: career.length };
  }, [career]);

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Select Manager</label>
        <select
          value={selectedManager}
          onChange={(e) => setSelectedManager(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">-- choose manager --</option>
          {managers.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {summary && (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <StatCard icon={Trophy} color="yellow" label="Titles" value={summary.titles} />
            <StatCard icon={ArrowUpCircle} color="green" label="Promotions" value={summary.promos} />
            <StatCard icon={ArrowDownCircle} color="red" label="Relegations" value={summary.releg} />
            <StatCard icon={AlertTriangle} color="rose" label="Sackings" value={summary.sacks} />
            <StatCard icon={Users} color="blue" label="Avg Points" value={summary.avgPts} />
            <StatCard icon={Users} color="gray" label="Seasons" value={summary.seasons} />
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h4 className="font-semibold mb-3">Career Timeline</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={career.map((r) => ({
                  season: r.season,
                  pos: parseInt(r.position),
                  div: `D${r.division}`,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="season" />
                <YAxis reversed domain={[1, 20]} />
                <Tooltip />
                <Line type="monotone" dataKey="pos" stroke="#2563eb" dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, color, label, value }) => (
  <div className={`p-4 bg-${color}-50 border border-${color}-200 rounded-lg flex flex-col items-center`}>
    <Icon className={`w-6 h-6 text-${color}-600 mb-2`} />
    <div className="text-xl font-bold">{value}</div>
    <div className="text-sm text-gray-600">{label}</div>
  </div>
);

export default ManagerProfiles;