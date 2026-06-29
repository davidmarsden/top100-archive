import React, { useMemo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

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

const LegacyCard = ({ spell }) => {
  const net = toNumber(spell.netStrengthGain);
  const positive = net > 0;
  const negative = net < 0;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : null;

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h4 className="font-black text-gray-900">{spell.club}</h4>
          <p className="text-xs text-gray-500">
            S{spell.firstSeason}–S{spell.lastSeason} · {spell.seasons} season{spell.seasons === 1 ? "" : "s"}
          </p>
        </div>
        <div className={`flex items-center gap-1 text-lg font-black ${positive ? "text-green-700" : negative ? "text-red-700" : "text-gray-700"}`}>
          {Icon && <Icon className="w-5 h-5" />}
          {fmt(net, 2, "signed")}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <div className="text-gray-500">First known</div>
          <div className="font-bold">{fmt(spell.inheritedStrength, 2)}</div>
        </div>
        <div>
          <div className="text-gray-500">Peak</div>
          <div className="font-bold">{fmt(spell.highestStrength, 2)}</div>
        </div>
        <div>
          <div className="text-gray-500">Last known</div>
          <div className="font-bold">{fmt(spell.lastStrength, 2)}</div>
        </div>
      </div>
    </div>
  );
};

const ManagerStrengthSpellChart = ({ summary }) => {
  const spells = useMemo(() => {
    if (!summary?.clubSpells?.length) return [];

    return summary.clubSpells.filter((spell) => toNumber(spell.netStrengthGain) !== null);
  }, [summary]);

  if (!spells.length) {
    return (
      <div className="bg-white rounded-xl shadow p-6 text-gray-500">
        No first-known/last-known strength data available for this manager yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="text-lg font-bold">Club legacy cards</h3>
        <p className="text-sm text-gray-500">
          First known, peak and last known ETOT for each club spell. This answers whether the manager left clubs stronger or weaker in the recorded ETOT era.
        </p>
      </div>

      <div className="p-4 grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {spells.map((spell, index) => (
          <LegacyCard key={`${spell.club}-${spell.firstSeason}-${index}`} spell={spell} />
        ))}
      </div>
    </div>
  );
};

export default ManagerStrengthSpellChart;
