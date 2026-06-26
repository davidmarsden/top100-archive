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
  finalPosition: ["fin", "final", "pos", "position", "finish", "finished", "actual"],
  valueAdded: ["value added", "va"],
  pva: ["pva"],
};

const CANONICAL_FIELDS = Object.keys(FIELD_ALIASES);

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
  const cleaned = clean(value).replace(/,/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const extractSeasonDivision = (filename) => {
  const normal = clean(filename).replace(/\s+/g, "");
  const seasonMatch = normal.match(/S(\d{1,2})/i) || normal.match(/Top100(?:S)?(\d{1,2})D/i);
  const divisionMatch = normal.match(/D(\d)/i) || normal.match(/Division(\d)/i);

  return {
    season: seasonMatch ? Number(seasonMatch[1]) : null,
    division: divisionMatch ? Number(divisionMatch[1]) : null,
  };
};

const mapHeaders = (headers) => {
  const normalHeaders = headers.map(keyify);
  const result = {};
  const unknown = [];

  normalHeaders.forEach((header, index) => {
    if (!header) return;
    let matchedField = null;

    for (const field of CANONICAL_FIELDS) {
      const aliases = FIELD_ALIASES[field].map(keyify);
      if (aliases.includes(header)) {
        matchedField = field;
        break;
      }
    }

    if (matchedField && result[matchedField] == null) {
      result[matchedField] = index;
    } else if (!matchedField) {
      unknown.push(headers[index]);
    }
  });

  return { result, unknown };
};

const hasNumericStats = (row) =>
  ["gk", "def", "mid", "att", "average", "etot", "predictedPosition", "finalPosition"].some(
    (field) => row[field] != null
  );

const buildRow = ({ values, headerMap, filename, rowNumber, season, division }) => {
  const getText = (field) => {
    const index = headerMap[field];
    return index == null ? "" : clean(values[index]);
  };
  const getNumber = (field) => {
    const index = headerMap[field];
    return index == null ? null : numberOrNull(values[index]);
  };

  const finalPosition = getNumber("finalPosition");
  const predictedPosition = getNumber("predictedPosition");
  const valueAdded = getNumber("valueAdded");

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
    valueAdded,
    pva: getNumber("pva"),
    computedValueAdded:
      predictedPosition != null && finalPosition != null ? predictedPosition - finalPosition : null,
    sourceFile: filename,
    sourceRow: rowNumber,
  };
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

const findHeaderRowIndex = (rows) =>
  rows.findIndex((row) => {
    const keys = row.map(keyify);
    return keys.includes("gk") && keys.includes("def") && keys.includes("mid") && keys.includes("att");
  });

const parseTableRows = ({ rows, filename, fileType }) => {
  const { season, division } = extractSeasonDivision(filename);
  const warnings = [];

  if (!season) warnings.push(`${filename}: could not detect season from filename.`);
  if (!division) warnings.push(`${filename}: could not detect division from filename.`);

  const headerIndex = findHeaderRowIndex(rows);
  if (headerIndex < 0) {
    return {
      rows: [],
      summary: { filename, fileType, season, division, importedRows: 0, headers: [], unknownColumns: [] },
      warnings: [...warnings, `${filename}: could not find a stats table header row.`],
    };
  }

  const headers = rows[headerIndex];
  const { result: headerMap, unknown } = mapHeaders(headers);

  if (headerMap.club == null) {
    headerMap.club = 0;
    warnings.push(`${filename}: no Club/Team header found, so column A is being treated as club name.`);
  }

  const parsedRows = [];

  rows.slice(headerIndex + 1).forEach((values, offset) => {
    const rowNumber = headerIndex + offset + 2;
    const row = buildRow({ values, headerMap, filename, rowNumber, season, division });

    if (!row.club) return;
    if (!hasNumericStats(row)) return;

    if (
      row.valueAdded != null &&
      row.computedValueAdded != null &&
      Math.round(row.valueAdded) !== Math.round(row.computedValueAdded)
    ) {
      warnings.push(
        `${filename} row ${rowNumber}: VA ${row.valueAdded} does not match Pre-Fin ${row.computedValueAdded} for ${row.club}.`
      );
    }

    parsedRows.push(row);
  });

  const required = ["club", "gk", "def", "mid", "att"];
  required.forEach((field) => {
    if (headerMap[field] == null) warnings.push(`${filename}: missing expected column ${field}.`);
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
      mappedFields: Object.keys(headerMap).sort(),
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

  const headers = [];
  let cursor = gkIndex;
  while (cursor < lines.length && headers.length < 12) {
    headers.push(lines[cursor]);
    const key = keyify(lines[cursor]);
    cursor += 1;
    if (["pre", "predicted", "pos", "fin", "pva"].includes(key)) break;
  }

  if (!headers.some((h) => keyify(h) === "club" || keyify(h) === "team")) {
    headers.unshift("Club");
  }

  const dataLines = lines.slice(cursor);
  const rows = [headers];
  let current = [];
  let clubParts = [];

  dataLines.forEach((line) => {
    const n = numberOrNull(line);
    if (n == null) {
      if (current.length > 0) {
        rows.push([clubParts.join(" "), ...current]);
        current = [];
        clubParts = [];
      }
      clubParts.push(line);
      return;
    }

    current.push(line);
    if (current.length === headers.length - 1) {
      rows.push([clubParts.join(" "), ...current]);
      current = [];
      clubParts = [];
    }
  });

  if (clubParts.length && current.length) rows.push([clubParts.join(" "), ...current]);
  return rows;
};

export const parseStatsFileText = ({ text, filename }) => {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv")) {
    return parseTableRows({ rows: parseCsvText(text), filename, fileType: "csv" });
  }

  if (lower.endsWith(".txt")) {
    const rows = splitTxtTable(text);
    return parseTableRows({ rows, filename, fileType: "txt" });
  }

  return {
    rows: [],
    summary: { filename, fileType: "unsupported", importedRows: 0, headers: [], unknownColumns: [] },
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
