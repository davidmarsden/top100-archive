const FIELD_ALIASES = {
  club: ["club", "team"],
  gk: ["gk", "goalkeeper", "keeper"],
  def: ["def", "defence", "defense"],
  mid: ["mid", "midfield"],
  att: ["att", "attack", "forward", "forwards"],
  top15: ["top15", "top 15"],
  top18: ["top18", "top 18"],
  top21: ["top21", "top 21"],
  average: ["average", "ave", "avg"],
  etot: ["etot", "estimated total", "estimated total strength"],
  earlyDoors: ["early doors", "early", "ed"],
  midSeason: ["mid", "mid season", "mid-season"],
  fullSeason: ["full", "full season", "final prediction"],
  predictedPosition: ["pre", "pred", "predicted", "predicted position", "prediction"],
  finalPosition: ["acc", "actual", "fin", "final", "pos", "position", "finish", "finished"],
  valueAdded: ["value added", "va"],
  pva: ["pva"],
};

const NUMERIC_FIELDS = [
  "gk",
  "def",
  "mid",
  "att",
  "top15",
  "top18",
  "top21",
  "average",
  "etot",
  "earlyDoors",
  "midSeason",
  "fullSeason",
  "predictedPosition",
  "finalPosition",
  "valueAdded",
  "pva",
];

export const emptyStatsImport = {
  rows: [],
  summaries: [],
  warnings: [],
};

const clean = (value) =>
  String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const keyify = (value) =>
  clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const numberOrNull = (value) => {
  const raw = clean(value).replace(/,/g, "");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const roundMetric = (value, places = 3) => {
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(places));
};

const calculateValueAdded = (predictedPosition, finalPosition) =>
  predictedPosition != null && finalPosition != null ? predictedPosition - finalPosition : null;

const calculatePva = (valueAdded, finalPosition) =>
  valueAdded != null && finalPosition != null && finalPosition > 0
    ? roundMetric((valueAdded + 1) / finalPosition)
    : null;

const extractSeasonDivision = (filename) => {
  const normal = clean(filename).replace(/\s+/g, "");
  const seasonMatch = normal.match(/S(\d{1,2})/i) || normal.match(/Top100(?:S)?(\d{1,2})D/i);
  const divisionMatch = normal.match(/D(\d)/i) || normal.match(/Division(\d)/i);
  return {
    season: seasonMatch ? Number(seasonMatch[1]) : null,
    division: divisionMatch ? Number(divisionMatch[1]) : null,
  };
};

const aliasMap = Object.entries(FIELD_ALIASES).reduce((map, [field, aliases]) => {
  aliases.forEach((alias) => {
    map.set(keyify(alias), field);
  });
  return map;
}, new Map());

const mapHeaders = (headers) => {
  const mapped = {};
  const unknown = [];

  headers.forEach((header, index) => {
    const key = keyify(header);
    if (!key) return;
    const field = aliasMap.get(key);
    if (field && mapped[field] == null) mapped[field] = index;
    if (!field) unknown.push(header);
  });

  return { mapped, unknown };
};

export const parseCsvText = (text) => {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows.map((r) => r.map(clean)).filter((r) => r.some(Boolean));
};

const isFullStatsHeader = (row) => {
  const keys = row.map(keyify);
  return keys.includes("gk") && keys.includes("def") && keys.includes("mid") && keys.includes("att");
};

const isLegacyPredictionHeader = (row) => {
  const keys = row.map(keyify);
  const hasPrediction = keys.includes("pre") || keys.includes("pred") || keys.includes("predicted");
  const hasActual = keys.includes("acc") || keys.includes("actual") || keys.includes("fin") || keys.includes("pos");
  const hasValueAdded = keys.includes("va") || keys.includes("value added");
  return hasPrediction && (hasActual || hasValueAdded);
};

const findHeaderRow = (rows) =>
  rows.findIndex((row) => isFullStatsHeader(row) || isLegacyPredictionHeader(row));

const normaliseHeaders = (headers, rows, headerIndex) => {
  const out = [...headers];
  const keys = out.map(keyify);
  const next = rows[headerIndex + 1] || [];

  if ((!keys[0] || !aliasMap.get(keys[0])) && next[0] && numberOrNull(next[0]) == null) {
    out[0] = "Club";
  }

  const newKeys = out.map(keyify);

  // S2D5 style: blank, blank, VA => Club, Pre, VA.
  if (newKeys[0] === "club" && !newKeys[1] && newKeys[2] === "va") {
    out[1] = "Pre";
  }

  // S2D4 style: blank, Pre, Acc, VA => Club, Pre, Acc, VA.
  if (newKeys[0] === "club" && newKeys[1] === "pre" && newKeys[2] === "acc") {
    out[2] = "Acc";
  }

  return out;
};

const buildCanonicalRow = ({ values, headerMap, filename, rowNumber, season, division }) => {
  const getText = (field) => {
    const index = headerMap[field];
    return index == null ? "" : clean(values[index]);
  };

  const getNumber = (field) => {
    const index = headerMap[field];
    return index == null ? null : numberOrNull(values[index]);
  };

  const predictedPosition = getNumber("predictedPosition");
  const sourceValueAdded = getNumber("valueAdded");
  const sourcePva = getNumber("pva");
  const explicitFinalPosition = getNumber("finalPosition");
  const finalPosition =
    explicitFinalPosition != null
      ? explicitFinalPosition
      : predictedPosition != null && sourceValueAdded != null
      ? predictedPosition - sourceValueAdded
      : null;

  const calculatedValueAdded = calculateValueAdded(predictedPosition, finalPosition);
  const calculatedPva = calculatePva(calculatedValueAdded, finalPosition);

  return {
    season,
    division,
    club: getText("club"),
    gk: getNumber("gk"),
    def: getNumber("def"),
    mid: getNumber("mid"),
    att: getNumber("att"),
    top15: getNumber("top15"),
    top18: getNumber("top18"),
    top21: getNumber("top21"),
    average: getNumber("average"),
    etot: getNumber("etot"),
    earlyDoors: getNumber("earlyDoors"),
    midSeason: getNumber("midSeason"),
    fullSeason: getNumber("fullSeason"),
    predictedPosition,
    finalPosition,
    valueAdded: calculatedValueAdded ?? sourceValueAdded,
    pva: calculatedPva ?? sourcePva,
    sourceValueAdded,
    sourcePva,
    computedValueAdded: calculatedValueAdded,
    computedPva: calculatedPva,
    sourceFile: filename,
    sourceRow: rowNumber,
  };
};

const hasUsefulData = (row) =>
  Boolean(row.club) && NUMERIC_FIELDS.some((field) => row[field] != null);

const parseRows = ({ rows, filename, fileType }) => {
  const { season, division } = extractSeasonDivision(filename);
  const warnings = [];

  if (!season) warnings.push(`${filename}: could not detect season from filename.`);
  if (!division) warnings.push(`${filename}: could not detect division from filename.`);

  const headerIndex = findHeaderRow(rows);
  if (headerIndex < 0) {
    return {
      rows: [],
      summary: { filename, fileType, season, division, importedRows: 0, headers: [], mappedFields: [], unknownColumns: [] },
      warnings: [...warnings, `${filename}: could not find a recognised stats table header row.`],
    };
  }

  const headers = normaliseHeaders(rows[headerIndex], rows, headerIndex);
  const { mapped, unknown } = mapHeaders(headers);

  if (mapped.club == null) {
    mapped.club = 0;
    warnings.push(`${filename}: no Club/Team header found, so column A is being treated as club name.`);
  }

  const parsedRows = [];
  rows.slice(headerIndex + 1).forEach((values, offset) => {
    const rowNumber = headerIndex + offset + 2;
    const row = buildCanonicalRow({ values, headerMap: mapped, filename, rowNumber, season, division });
    if (!hasUsefulData(row)) return;

    if (
      row.sourceValueAdded != null &&
      row.computedValueAdded != null &&
      Math.round(row.sourceValueAdded) !== Math.round(row.computedValueAdded)
    ) {
      warnings.push(
        `${filename} row ${rowNumber}: source VA ${row.sourceValueAdded} does not match Pre-Fin ${row.computedValueAdded} for ${row.club}; using recalculated VA.`
      );
    }

    if (
      row.sourcePva != null &&
      row.computedPva != null &&
      Math.abs(row.sourcePva - row.computedPva) > 0.01
    ) {
      warnings.push(
        `${filename} row ${rowNumber}: source PVA ${row.sourcePva} does not match (VA+1)/Fin ${row.computedPva} for ${row.club}; using recalculated PVA.`
      );
    }

    parsedRows.push(row);
  });

  if (parsedRows.length !== 20) {
    warnings.push(`${filename}: imported ${parsedRows.length} rows; expected 20 for one division.`);
  }

  return {
    rows: parsedRows,
    summary: {
      filename,
      fileType,
      season,
      division,
      importedRows: parsedRows.length,
      headers,
      mappedFields: Object.keys(mapped).sort(),
      unknownColumns: unknown.filter(Boolean),
    },
    warnings,
  };
};

const splitTxtTable = (text) => {
  const lines = text
    .split(/\r?\n/)
    .map(clean)
    .filter(Boolean);

  const gkIndex = lines.findIndex((line) => keyify(line) === "gk");
  if (gkIndex < 0) return [];

  const headers = ["Club"];
  let cursor = gkIndex;

  while (cursor < lines.length && headers.length < 12) {
    headers.push(lines[cursor]);
    const key = keyify(lines[cursor]);
    cursor += 1;
    if (["pre", "predicted", "pos", "fin", "acc", "pva"].includes(key)) break;
  }

  const rows = [headers];
  const dataLines = lines.slice(cursor);
  let clubParts = [];
  let values = [];

  dataLines.forEach((line) => {
    const n = numberOrNull(line);
    if (n == null) {
      if (values.length) {
        rows.push([clubParts.join(" "), ...values]);
        clubParts = [];
        values = [];
      }
      clubParts.push(line);
      return;
    }

    values.push(line);
    if (values.length === headers.length - 1) {
      rows.push([clubParts.join(" "), ...values]);
      clubParts = [];
      values = [];
    }
  });

  if (clubParts.length && values.length) rows.push([clubParts.join(" "), ...values]);
  return rows;
};

export const parseStatsFileText = ({ text, filename }) => {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".csv")) {
    return parseRows({ rows: parseCsvText(text), filename, fileType: "csv" });
  }

  if (lower.endsWith(".txt")) {
    return parseRows({ rows: splitTxtTable(text), filename, fileType: "txt" });
  }

  return {
    rows: [],
    summary: { filename, fileType: "unsupported", importedRows: 0, headers: [], mappedFields: [], unknownColumns: [] },
    warnings: [`${filename}: unsupported file type. Use .csv or .txt.`],
  };
};

export const combineImportResults = (results) => ({
  rows: results.flatMap((result) => result.rows),
  summaries: results.map((result) => result.summary),
  warnings: results.flatMap((result) => result.warnings),
});

export const buildImportReport = (combined) => {
  const lines = ["# Top 100 Stats Import Report", ""];
  lines.push(`Imported rows: ${combined.rows.length}`);
  lines.push(`Files scanned: ${combined.summaries.length}`);
  lines.push("");
  lines.push("## Formula standardisation");
  lines.push("- VA is recalculated as Pre - Final.");
  lines.push("- PVA is recalculated as (VA + 1) / Final.");
  lines.push("- Original spreadsheet VA/PVA values are retained as sourceValueAdded/sourcePva when present.");
  lines.push("");
  lines.push("## Files");

  combined.summaries.forEach((summary) => {
    lines.push(
      `- ${summary.filename}: S${summary.season ?? "?"} D${summary.division ?? "?"}, ${summary.importedRows} rows, ${summary.fileType}`
    );
  });

  lines.push("");
  lines.push("## Warnings");
  if (!combined.warnings.length) {
    lines.push("No warnings.");
  } else {
    combined.warnings.forEach((warning) => lines.push(`- ${warning}`));
  }

  return lines.join("\n");
};

export const downloadTextFile = (filename, content, type = "application/json") => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
