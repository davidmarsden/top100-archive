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

const average = (values = []) => {
  const nums = values.map(toNumber).filter((value) => value !== null);
  if (!nums.length) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
};

const buildSpellScore = (spell) => {
  const net = toNumber(spell.netStrengthGain) || 0;
  const avgPva = average(spell.rows.map((row) => row.pva)) || 0;
  const avgVa = average(spell.rows.map((row) => row.valueAdded)) || 0;
  return net + avgPva * 2 + avgVa * 0.2;
};

const SpellCard = ({ title, spell, positive }) => {
  if (!spell) return null;

  const avgPva = average(spell.rows.map((row) => row.pva));
  const avgVa = average(spell.rows.map((row) => row.valueAdded));
  const Icon = positive ? TrendingUp : TrendingDown;
  const iconClass = positive ? "text-green-700" : "text-red-700";

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="text-lg font-bold flex items-center gap-2 mb-3">
        <Icon className={`w-5 h-5 ${iconClass}`} /> {title}
      </h3>
      <div className="text-xl font-black text-gray-900">{spell.club}</div>
      <div className="text-sm text-gray-500 mb-4">
        S{spell.firstSeason}–S{spell.lastSeason} · {spell.seasons} season{spell.seasons === 1 ? "" : "s"}
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-gray-500">Net strength</div>
          <div className="font-bold">{fmt(spell.netStrengthGain, 2, "signed")}</div>
        </div>
        <div>
          <div className="text-gray-500">Highest ETOT</div>
          <div className="font-bold">{fmt(spell.highestStrength, 2)}</div>
        </div>
        <div>
          <div className="text-gray-500">Avg VA</div>
          <div className="font-bold">{fmt(avgVa, 2, "signed")}</div>
        </div>
        <div>
          <div className="text-gray-500">Avg PVA</div>
          <div className="font-bold">{fmt(avgPva, 3, "signed")}</div>
        </div>
      </div>
    </div>
  );
};

const ManagerSpellSummaryCards = ({ summary }) => {
  const { bestSpell, worstSpell } = useMemo(() => {
    const scored = (summary?.clubSpells || [])
      .filter((spell) => spell.rows?.length)
      .map((spell) => ({ ...spell, spellScore: buildSpellScore(spell) }));

    if (!scored.length) return { bestSpell: null, worstSpell: null };

    return {
      bestSpell: scored.reduce((best, spell) => (spell.spellScore > best.spellScore ? spell : best), scored[0]),
      worstSpell: scored.reduce((worst, spell) => (spell.spellScore < worst.spellScore ? spell : worst), scored[0]),
    };
  }, [summary]);

  if (!bestSpell && !worstSpell) return null;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <SpellCard title="Best spell" spell={bestSpell} positive />
      <SpellCard title="Most challenging spell" spell={worstSpell} />
    </div>
  );
};

export default ManagerSpellSummaryCards;
