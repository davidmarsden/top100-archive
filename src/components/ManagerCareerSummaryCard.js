import React, { useMemo } from "react";
import { Sparkles } from "lucide-react";

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

const getCareerIdentity = (summary) => {
  const avgPva = toNumber(summary.averagePVA) || 0;
  const netStrength = toNumber(summary.netStrengthGain) || 0;
  const titles = toNumber(summary.titles) || 0;
  const seasons = toNumber(summary.seasons) || 0;
  const promotions = (toNumber(summary.autoPromotions) || 0) + (toNumber(summary.playoffFinishes) || 0);
  const relegations = toNumber(summary.relegations) || 0;

  if (avgPva >= 1.5 && netStrength >= 5) return "Elite Overachiever";
  if (netStrength >= 8 && avgPva >= 0) return "Master Builder";
  if (titles >= 3 && avgPva >= 0) return "Elite Winner";
  if (promotions >= 3 && avgPva >= 0) return "Promotion Specialist";
  if (avgPva >= 0.75 && netStrength < -2) return "Short-term Specialist";
  if (netStrength < -5 && avgPva < 0.25) return "Rebuild Gambler";
  if (Math.abs(avgPva) <= 0.25 && Math.abs(netStrength) <= 2 && seasons >= 8) return "Safe Hands";
  if (promotions >= 2 && relegations >= 2) return "Boom and Bust";
  if (avgPva > 0) return "Expectation Beater";
  if (netStrength > 0) return "Squad Improver";
  return "Career Watchlist";
};

const getSummarySentence = (summary, identity) => {
  const seasons = summary.seasons || 0;
  const clubs = summary.clubsManaged || 0;
  const avgPva = fmt(summary.averagePVA, 3, "signed");
  const netStrength = fmt(summary.netStrengthGain, 2, "signed");
  const titles = summary.titles || 0;
  const titleText = titles === 1 ? "1 title" : `${titles} titles`;

  if (identity === "Elite Overachiever") {
    return `Average PVA ${avgPva} across ${seasons} seasons while increasing inherited squad strength by ${netStrength} ETOT over ${clubs} club${clubs === 1 ? "" : "s"}.`;
  }

  if (identity === "Master Builder") {
    return `Consistently improves inherited squads, with net squad strength change of ${netStrength} ETOT across ${seasons} seasons.`;
  }

  if (identity === "Elite Winner") {
    return `Converts strong squads into trophies, winning ${titleText} while averaging ${avgPva} PVA.`;
  }

  if (identity === "Promotion Specialist") {
    return `Repeatedly moves clubs upward through the divisions while maintaining an average PVA of ${avgPva}.`;
  }

  if (identity === "Short-term Specialist") {
    return `Excellent results against expectation, averaging ${avgPva} PVA, but with net squad strength change of ${netStrength} ETOT.`;
  }

  if (identity === "Rebuild Gambler") {
    return `Leaves squads materially younger or weaker by rating, with net strength change of ${netStrength} ETOT and average PVA ${avgPva}.`;
  }

  if (identity === "Safe Hands") {
    return `Usually performs close to expectation and leaves clubs broadly similar in strength, with ${avgPva} average PVA and ${netStrength} net ETOT.`;
  }

  if (identity === "Boom and Bust") {
    return `A volatile career profile with major highs and lows, combining promotions with relegation pressure across ${seasons} seasons.`;
  }

  if (identity === "Expectation Beater") {
    return `Generally beats expectations, averaging ${avgPva} PVA across ${seasons} seasons.`;
  }

  if (identity === "Squad Improver") {
    return `The strongest signal is squad building, with net strength change of ${netStrength} ETOT across ${clubs} club${clubs === 1 ? "" : "s"}.`;
  }

  return `Career profile still needs context: ${seasons} seasons, ${clubs} club${clubs === 1 ? "" : "s"}, average PVA ${avgPva}, net strength ${netStrength}.`;
};

const ManagerCareerSummaryCard = ({ summary }) => {
  const assessment = useMemo(() => {
    if (!summary || !summary.seasons) return null;
    const identity = getCareerIdentity(summary);
    return {
      identity,
      sentence: getSummarySentence(summary, identity),
    };
  }, [summary]);

  if (!assessment) return null;

  return (
    <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-fuchsia-700 text-white rounded-xl shadow-lg p-6">
      <div className="flex items-start gap-3">
        <Sparkles className="w-6 h-6 text-yellow-200 mt-1" />
        <div>
          <div className="text-sm uppercase tracking-wide text-purple-100 font-semibold">Career summary</div>
          <h3 className="text-2xl font-black mt-1">{assessment.identity}</h3>
          <p className="text-purple-50 mt-2 text-lg leading-relaxed">{assessment.sentence}</p>
        </div>
      </div>
    </div>
  );
};

export default ManagerCareerSummaryCard;
