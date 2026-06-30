export const ETOT_WEIGHTS = {
  gk: 0.12,
  def: 0.8,
  mid: 0.8,
  att: 0.65,
  top18: 0.12,
};

export const numberOrNull = (value) => {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const round = (value, digits = 2) => {
  const n = numberOrNull(value);
  if (n === null) return null;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
};

export const calculateEtot = ({ gk, def, mid, att, top18 } = {}) => {
  const parts = {
    gk: numberOrNull(gk),
    def: numberOrNull(def),
    mid: numberOrNull(mid),
    att: numberOrNull(att),
    top18: numberOrNull(top18),
  };

  const hasAllRequiredParts = Object.values(parts).every((value) => value !== null);
  if (!hasAllRequiredParts) return null;

  return round(
    parts.gk * ETOT_WEIGHTS.gk +
      parts.def * ETOT_WEIGHTS.def +
      parts.mid * ETOT_WEIGHTS.mid +
      parts.att * ETOT_WEIGHTS.att +
      parts.top18 * ETOT_WEIGHTS.top18,
    2
  );
};

export const getEtotWithSource = (row = {}) => {
  const explicitEtot = numberOrNull(row.etot);
  if (explicitEtot !== null && explicitEtot > 0) {
    return {
      etot: round(explicitEtot, 2),
      etotSource: "published",
      reconstructedEtot: calculateEtot(row),
    };
  }

  const reconstructedEtot = calculateEtot(row);
  if (reconstructedEtot !== null && reconstructedEtot > 0) {
    return {
      etot: reconstructedEtot,
      etotSource: "reconstructed",
      reconstructedEtot,
    };
  }

  return {
    etot: null,
    etotSource: "missing",
    reconstructedEtot: null,
  };
};
