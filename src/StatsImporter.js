import React, { useMemo, useState } from "react";
import {
  buildImportReport,
  combineImportResults,
  downloadTextFile,
  emptyStatsImport,
  parseStatsFileText,
} from "./statsImportUtils";

const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error(`Could not read ${file.name}`));
    reader.readAsText(file);
  });

const StatCard = ({ label, value }) => (
  <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
    <div className="text-sm text-gray-500">{label}</div>
    <div className="text-3xl font-black text-gray-900">{value}</div>
  </div>
);

const StatsImporter = () => {
  const [importState, setImportState] = useState(emptyStatsImport);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  const handleFiles = async (event) => {
    const files = [...(event.target.files || [])];
    if (!files.length) return;

    setBusy(true);
    setError("");

    try {
      const parsed = [];

      for (const file of files) {
        const text = await readFileAsText(file);
        parsed.push(parseStatsFileText({ text, filename: file.name }));
      }

      setImportState(combineImportResults(parsed));
    } catch (err) {
      setError(err.message || "Import failed");
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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6 border border-pink-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Stats Importer Prototype</h2>
            <p className="text-gray-600 mt-1">
              Upload Malcolm's converted CSV and TXT files. The importer reads headers, normalises the fields,
              checks the row count, and lets you download a clean JSON archive.
            </p>
          </div>

          <label className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-pink-600 text-white font-bold shadow hover:bg-pink-700 cursor-pointer">
            {busy ? "Importing…" : "Upload CSV/TXT files"}
            <input
              type="file"
              multiple
              accept=".csv,.txt,text/csv,text/plain"
              onChange={handleFiles}
              className="hidden"
              disabled={busy}
            />
          </label>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Rows imported" value={importState.rows.length} />
        <StatCard label="Files scanned" value={importState.summaries.length} />
        <StatCard label="Seasons" value={seasons.length} />
        <StatCard label="Warnings" value={importState.warnings.length} />
      </div>

      {importState.rows.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3">
          <button onClick={downloadJson} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700">
            Download statsArchive.json
          </button>
          <button onClick={downloadReport} className="px-4 py-2 rounded-lg bg-gray-800 text-white font-bold hover:bg-gray-900">
            Download QA report
          </button>
          <div className="text-sm text-gray-500 self-center">
            Seasons: {seasons.map((season) => `S${season}`).join(", ") || "none"} · Divisions: {divisions.map((division) => `D${division}`).join(", ") || "none"}
          </div>
        </div>
      )}

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
