import React, { useEffect, useMemo, useState } from "react";
import {
  buildImportReport,
  combineImportResults,
  downloadTextFile,
  emptyStatsImport,
  parseStatsFileText,
} from "./statsImportUtils.v2";

const STORAGE_KEY = "top100StatsImporterWorkspace";

const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error(`Could not read ${file.name}`));
    reader.readAsText(file);
  });

const normaliseImportState = (value) => ({
  rows: Array.isArray(value?.rows) ? value.rows : [],
  summaries: Array.isArray(value?.summaries) ? value.summaries : [],
  warnings: Array.isArray(value?.warnings) ? value.warnings : [],
});

const mergeImportStates = (...states) => {
  const rows = [];
  const rowKeys = new Set();

  states.forEach((state) => {
    normaliseImportState(state).rows.forEach((row, index) => {
      const key = row.sourceFile && row.sourceRow ? `${row.sourceFile}::${row.sourceRow}` : `${row.season}-${row.division}-${row.club}-${index}`;
      if (rowKeys.has(key)) return;
      rowKeys.add(key);
      rows.push(row);
    });
  });

  const summariesByFile = new Map();
  states.forEach((state) => {
    normaliseImportState(state).summaries.forEach((summary) => {
      if (!summary?.filename) return;
      summariesByFile.set(summary.filename, summary);
    });
  });

  const warningKeys = new Set();
  const warnings = [];
  states.forEach((state) => {
    normaliseImportState(state).warnings.forEach((warning) => {
      if (warningKeys.has(warning)) return;
      warningKeys.add(warning);
      warnings.push(warning);
    });
  });

  return {
    rows,
    summaries: [...summariesByFile.values()],
    warnings,
  };
};

const loadArchiveJson = (parsed) => {
  const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
  if (!rows.length) throw new Error("This JSON file does not contain a rows array.");

  return {
    rows,
    summaries: Array.isArray(parsed?.summaries) ? parsed.summaries : [],
    warnings: Array.isArray(parsed?.warnings) ? parsed.warnings : [],
  };
};

const StatCard = ({ label, value }) => (
  <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
    <div className="text-sm text-gray-500">{label}</div>
    <div className="text-3xl font-black text-gray-900">{value}</div>
  </div>
);

const StatsImporter = () => {
  const [importState, setImportState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? normaliseImportState(JSON.parse(saved)) : emptyStatsImport;
    } catch {
      return emptyStatsImport;
    }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(importState));
    } catch {
      // Local storage is a convenience only; downloads remain the backup.
    }
  }, [importState]);

  const sortedRows = useMemo(
    () =>
      [...importState.rows].sort((a, b) => {
        const seasonDiff = Number(a.season || 0) - Number(b.season || 0);
        if (seasonDiff !== 0) return seasonDiff;
        const divisionDiff = Number(a.division || 0) - Number(b.division || 0);
        if (divisionDiff !== 0) return divisionDiff;
        return Number(a.predictedPosition || a.finalPosition || 999) - Number(b.predictedPosition || b.finalPosition || 999);
      }),
    [importState.rows]
  );

  const seasons = useMemo(
    () => [...new Set(importState.rows.map((row) => row.season).filter(Boolean))].sort((a, b) => a - b),
    [importState.rows]
  );

  const divisions = useMemo(
    () => [...new Set(importState.rows.map((row) => row.division).filter(Boolean))].sort((a, b) => a - b),
    [importState.rows]
  );

  const handleStatsFiles = async (event) => {
    const files = [...(event.target.files || [])];
    if (!files.length) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const parsed = [];

      for (const file of files) {
        const text = await readFileAsText(file);
        parsed.push(parseStatsFileText({ text, filename: file.name }));
      }

      const combined = combineImportResults(parsed);
      setImportState((current) => mergeImportStates(current, combined));
      setNotice(`Imported ${combined.rows.length} rows from ${files.length} file${files.length === 1 ? "" : "s"}.`);
    } catch (err) {
      setError(err.message || "Import failed");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };

  const handleArchiveJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const text = await readFileAsText(file);
      const loaded = loadArchiveJson(JSON.parse(text));
      setImportState((current) => mergeImportStates(current, loaded));
      setNotice(`Loaded ${loaded.rows.length} rows from ${file.name}.`);
    } catch (err) {
      setError(err.message || "Could not load statsArchive.json");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };

  const downloadJson = () => {
    downloadTextFile(
      "statsArchive.json",
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          rowCount: importState.rows.length,
          summaries: importState.summaries,
          warnings: importState.warnings,
          rows: sortedRows,
        },
        null,
        2
      )
    );
  };

  const downloadReport = () => {
    downloadTextFile("statsImportReport.md", buildImportReport(importState), "text/markdown");
  };

  const clearArchive = () => {
    if (!window.confirm("Clear the current importer workspace? Download your archive first if you need a backup.")) return;
    setImportState(emptyStatsImport);
    localStorage.removeItem(STORAGE_KEY);
    setError("");
    setNotice("Workspace cleared.");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6 border border-pink-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Stats Importer Workspace</h2>
            <p className="text-gray-600 mt-1">
              Append Malcolm&apos;s converted CSV/TXT files, reload a saved statsArchive.json, and keep building the archive safely. Your workspace auto-saves in this browser.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-pink-600 text-white font-bold shadow hover:bg-pink-700 cursor-pointer">
              {busy ? "Working…" : "Import CSV/TXT files"}
              <input
                type="file"
                multiple
                accept=".csv,.txt,text/csv,text/plain"
                onChange={handleStatsFiles}
                className="hidden"
                disabled={busy}
              />
            </label>

            <label className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-purple-600 text-white font-bold shadow hover:bg-purple-700 cursor-pointer">
              Load statsArchive.json
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleArchiveJson}
                className="hidden"
                disabled={busy}
              />
            </label>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold">
            {error}
          </div>
        )}

        {notice && !error && (
          <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 font-semibold">
            {notice}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Rows imported" value={importState.rows.length} />
        <StatCard label="Files scanned" value={importState.summaries.length} />
        <StatCard label="Seasons" value={seasons.length} />
        <StatCard label="Warnings" value={importState.warnings.length} />
      </div>

      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3">
        <button
          onClick={downloadJson}
          disabled={!importState.rows.length}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Save archive
        </button>
        <button
          onClick={downloadReport}
          disabled={!importState.rows.length && !importState.warnings.length}
          className="px-4 py-2 rounded-lg bg-gray-800 text-white font-bold hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Download QA report
        </button>
        <button
          onClick={clearArchive}
          disabled={!importState.rows.length && !importState.summaries.length && !importState.warnings.length}
          className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Clear archive
        </button>
        <div className="text-sm text-gray-500 self-center">
          Seasons: {seasons.map((season) => `S${season}`).join(", ") || "none"} · Divisions: {divisions.map((division) => `D${division}`).join(", ") || "none"}
        </div>
      </div>

      {importState.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-black text-amber-900 mb-2">Warnings to check</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-amber-900 max-h-64 overflow-y-auto">
            {importState.warnings.map((warning, index) => (
              <li key={`${warning}-${index}`}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {importState.summaries.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-black text-gray-900">File summary</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left py-2 px-3">File</th>
                  <th className="text-left py-2 px-3">Type</th>
                  <th className="text-left py-2 px-3">Season</th>
                  <th className="text-left py-2 px-3">Division</th>
                  <th className="text-right py-2 px-3">Rows</th>
                  <th className="text-left py-2 px-3">Mapped fields</th>
                </tr>
              </thead>
              <tbody>
                {importState.summaries.map((summary) => (
                  <tr key={summary.filename} className="border-t">
                    <td className="py-2 px-3 font-semibold">{summary.filename}</td>
                    <td className="py-2 px-3">{summary.fileType}</td>
                    <td className="py-2 px-3">{summary.season ? `S${summary.season}` : "?"}</td>
                    <td className="py-2 px-3">{summary.division ? `D${summary.division}` : "?"}</td>
                    <td className="py-2 px-3 text-right font-bold">{summary.importedRows}</td>
                    <td className="py-2 px-3 text-gray-600">{(summary.mappedFields || []).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sortedRows.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-black text-gray-900">Preview</h3>
            <p className="text-sm text-gray-500">Showing the first 100 imported rows.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left py-2 px-3">S</th>
                  <th className="text-left py-2 px-3">D</th>
                  <th className="text-left py-2 px-3">Club</th>
                  <th className="text-right py-2 px-3">GK</th>
                  <th className="text-right py-2 px-3">DEF</th>
                  <th className="text-right py-2 px-3">MID</th>
                  <th className="text-right py-2 px-3">ATT</th>
                  <th className="text-right py-2 px-3">Top18</th>
                  <th className="text-right py-2 px-3">Ave</th>
                  <th className="text-right py-2 px-3">ETOT</th>
                  <th className="text-right py-2 px-3">Pre</th>
                  <th className="text-right py-2 px-3">Fin</th>
                  <th className="text-right py-2 px-3">VA</th>
                  <th className="text-right py-2 px-3">PVA</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.slice(0, 100).map((row) => (
                  <tr key={`${row.sourceFile}-${row.sourceRow}`} className="border-t">
                    <td className="py-2 px-3">S{row.season}</td>
                    <td className="py-2 px-3">D{row.division}</td>
                    <td className="py-2 px-3 font-semibold">{row.club}</td>
                    <td className="py-2 px-3 text-right">{row.gk ?? ""}</td>
                    <td className="py-2 px-3 text-right">{row.def ?? ""}</td>
                    <td className="py-2 px-3 text-right">{row.mid ?? ""}</td>
                    <td className="py-2 px-3 text-right">{row.att ?? ""}</td>
                    <td className="py-2 px-3 text-right">{row.top18 ?? ""}</td>
                    <td className="py-2 px-3 text-right">{row.average ?? ""}</td>
                    <td className="py-2 px-3 text-right">{row.etot ?? ""}</td>
                    <td className="py-2 px-3 text-right">{row.predictedPosition ?? ""}</td>
                    <td className="py-2 px-3 text-right">{row.finalPosition ?? ""}</td>
                    <td className="py-2 px-3 text-right">{row.valueAdded ?? ""}</td>
                    <td className="py-2 px-3 text-right">{row.pva ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsImporter;
