import { CLUB_ALIASES } from "./clubAliases";

export const stripClubCodes = (name = "") =>
  String(name || "")
    .replace(/[®™]/g, " ")
    .replace(/\(([A-Z!\s]+)\)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

export const normaliseClub = (name = "") =>
  stripClubCodes(name)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\b(fc|cf|afc|sc|sk|jk|kv|ud|ec|bc|cfc|hsc|sv|club)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const canonicalClubName = (name = "") => {
  const stripped = stripClubCodes(name);
  const key = normaliseClub(stripped);
  return CLUB_ALIASES.get(key) || stripped;
};

export const isValidClubName = (name = "") => {
  const club = canonicalClubName(name);
  return Boolean(club && club.length > 1 && !/^\d+$/.test(club) && /[A-Za-zÀ-ÿ]/.test(club));
};
