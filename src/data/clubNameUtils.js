import { CLUB_ALIASES } from "./clubAliases";

export const stripClubCodes = (name = "") =>
  String(name || "")
    .replace(/[®™©]/g, " ")
    .replace(/\(([A-Z!\s]+)\)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

export const normaliseClub = (name = "") =>
  stripClubCodes(name)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\b(fc|cf|afc|sc|sk|jk|kv|ud|ec|bc|cfc|hsc|sv|club)\b/g, " ")
    .replace(/\b([a-z])\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const buildCanonicalClubMap = (canonicalNames = []) => {
  const map = new Map();

  canonicalNames.filter(Boolean).forEach((name) => {
    const stripped = stripClubCodes(name);
    const key = normaliseClub(stripped);
    if (key && !map.has(key)) map.set(key, stripped);
  });

  return map;
};

export const resolveClubName = (name = "", canonicalNameMap = null) => {
  const stripped = stripClubCodes(name);
  const key = normaliseClub(stripped);
  if (!key) return stripped;

  const aliasTarget = CLUB_ALIASES.get(key);
  const aliasKey = aliasTarget ? normaliseClub(aliasTarget) : "";

  if (canonicalNameMap?.has(key)) return canonicalNameMap.get(key);
  if (aliasKey && canonicalNameMap?.has(aliasKey)) return canonicalNameMap.get(aliasKey);

  return aliasTarget || stripped;
};

export const canonicalClubName = (name = "", canonicalNameMap = null) =>
  resolveClubName(name, canonicalNameMap);

export const isValidClubName = (name = "") => {
  const club = canonicalClubName(name);
  return Boolean(club && club.length > 1 && !/^\d+$/.test(club) && /[A-Za-zÀ-ÿ]/.test(club));
};
