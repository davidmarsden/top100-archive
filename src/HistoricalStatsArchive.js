import React, { useMemo, useState } from "react";

const STORAGE_KEY = "top100StatsImporterWorkspace";
const EXPECTED_DIVISIONS = [1, 2, 3, 4, 5];
const EXPECTED_ROWS_PER_DIVISION = 20;

const numberOrNull = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const fmt = (value, digits = 2) => {
  const n = numberOrNull(value);
  if (n == null) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(digits);
};

const signed = (value, digits = 0) => {
  const n = numberOrNull(value);
  if (n == null) return "—";
  const rounded = digits ? n.toFixed(digits) : String(Math.round(n));
  return n > 0 ? `+${rounded}` : rounded;
};

const normaliseClub = (club) =>
  String(club || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const readSavedArchive = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { rows: [], summaries: [], warnings: [] };
    const parsed = JSON.parse(saved);
    return {
      rows: Array.isArray(parsed?.rows) ? parsed.rows : [],
      summaries: Array.isArray(parsed?.summaries) ? parsed.summaries : [],
      warnings: Array.isArray(parsed?.warnings) ? parsed.warnings : [],
    };
  } catch {
    return { rows: [], summaries: [], warnings: [] };
  }
};

const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error(`Could not read ${file.name}`));
    reader.readAsText(file);
  });

const StatCard = ({ label, value, note }) => (
  <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
    <div className="text-sm text-gray-500">{label}</div>
    <div className="text-3xl font-black text-gray-900">{value}</div>
    {note && <div className="text-xs text-gray-500 mt-1">{note}</div>}
  </div>
);

const MiniBadge = ({ children, tone = "gray" }) => {
  const styles = {
    green: "bg-green-100 text-green-800 border-green-200",
    amber: "bg-amber-100 text-amber-900 border-amber-200",
    red: "bg-red-100 text-red-800 border-red-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    gray: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return <span className={`inline-flex px-2 py-1 rounded-md text-xs font-bold border ${styles[tone]}`}>{children}</span>;
};

const HistoricalStatsArchive = () => {
  const [archive, setArchive] = useState(readSavedArchive);
  const [selectedSeason, setSelectedSeason] = useState(27);
  const [selectedDivision, setSelectedDivision] = useState(1);
  const [clubQuery, setClubQuery] = useState("");
  const [selectedClub, setSelectedClub] = useState("");
  const [sortKey, setSortKey] = useState("predictedPosition");
  const [error, setError] = useState("");

  const rows = useMemo(() => (Array.isArray(archive.rows) ? archive.rows : []), [archive.rows]);
  const summaries = useMemo(() => (Array.isArray(archive.summaries) ? archive.summaries : []), [archive.summaries]);
  const warnings = useMemo(() => (Array.isArray(archive.warnings) ? archive.warnings : []), [archive.warnings]);

  const seasons = useMemo(
    () => [...new Set(rows.map((row) => Number(row.season)).filter(Number.isFinite))].sort((a, b) => a - b),
    [rows]
  );

  const divisionsForSeason = useMemo(
    () =>
      [...new Set(rows.filter((row) => Number(row.season) === Number(selectedSeason)).map((row) => Number(row.division)).filter(Number.isFinite))].sort(
        (a, b) => a - b
      ),
    [rows, selectedSeason]
  );

  const allClubs = useMemo(
    () => [...new Set(rows.map((row) => row.club).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const matchingClubs = useMemo(() => {
    const q = normaliseClub(clubQuery);
    if (!q) return allClubs.slice(0, 20);
    return allClubs.filter((club) => normaliseClub(club).includes(q)).slice(0, 30);
  }, [allClubs, clubQuery]);

  const tableRows = useMemo(() => {
    const filtered = rows.filter((row) => Number(row.season) === Number(selectedSeason) && Number(row.division) === Number(selectedDivision));
    return [...filtered].sort((a, b) => {
      if (sortKey === "club") return String(a.club || "").localeCompare(String(b.club || ""));
      const av = numberOrNull(a[sortKey]);
      const bv = numberOrNull(b[sortKey]);
      if (av == null && bv == null) return String(a.club || "").localeCompare(String(b.club || ""));
      if (av == null) return 1;
      if (bv == null) return -1;
      return av - bv;
    });
  }, [rows, selectedSeason, selectedDivision, sortKey]);

  const clubHistory = useMemo(() => {
    if (!selectedClub) return [];
    const key = normaliseClub(selectedClub);
    return rows
      .filter((row) => normaliseClub(row.club) === key)
      .sort((a, b) => {
        const seasonDiff = Number(a.season || 0) - Number(b.season || 0);
        if (seasonDiff !== 0) return seasonDiff;
        return Number(a.division || 0) - Number(b.division || 0);
      });
  }, [rows, selectedClub]);

  const health = useMemo(() => {
    const summaryMap = new Map();
    summaries.forEach((summary) => {
      if (summary.season && summary.division) summaryMap.set(`${Number(summary.season)}|${Number(summary.division)}`, summary);
    });

    const grid = seasons.map((season) => ({
      season,
      divisions: EXPECTED_DIVISIONS.map((division) => {
        const summary = summaryMap.get(`${season}|${division}`);
        const count = rows.filter((row) => Number(row.season) === season && Number(row.division) === division).length;
        if (!summary && count === 0) return { division, status: "missing", count: 0 };
        if (count === EXPECTED_ROWS_PER_DIVISION) return { division, status: "complete", count };
        if (count === 0) return { division, status: "empty", count };
        return { division, status: "partial", count };
      }),
    }));

    const missing = grid.flatMap((seasonRow) =>
      seasonRow.divisions
        .filter((divisionRow) => divisionRow.status === "missing" || divisionRow.status === "empty")
        .map((divisionRow) => `S${seasonRow.season}D${divisionRow.division}`)
    );

    const partial = grid.flatMap((seasonRow) =>
      seasonRow.divisions
        .filter((divisionRow) => divisionRow.status === "partial")
        .map((divisionRow) => `S${seasonRow.season}D${divisionRow.division} (${divisionRow.count}/20)`)
    );

    return { grid, missing, partial };
  }, [rows, summaries, seasons]);

  const topOverachievers = useMemo(
    () =>
      [...rows]
        .filter((row) => numberOrNull(row.valueAdded) != null)
        .sort((a, b) => Number(b.valueAdded) - Number(a.valueAdded))
        .slice(0, 10),
    [rows]
  );

  const biggestFalls = useMemo(
    () =>
      [...rows]
        .filter((row) => numberOrNull(row.valueAdded) != null)
        .sort((a, b) => Number(a.valueAdded) - Number(b.valueAdded))
        .slice(0, 10),
    [rows]
  );

  const handleLoadJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const text = await readFileAsText(file);
      const parsed = JSON.parse(text);
      const next = {
        rows: Array.isArray(parsed?.rows) ? parsed.rows : [],
        summaries: Array.isArray(parsed?.summaries) ? parsed.summaries : [],
        warnings: Array.isArray(parsed?.warnings) ? parsed.warnings : [],
      };
      if (!next.rows.length) throw new Error("No rows found in that archive JSON.");
      setArchive(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      const maxSeason = Math.max(...next.rows.map((row) => Number(row.season)).filter(Number.isFinite));
      if (Number.isFinite(maxSeason)) setSelectedSeason(maxSeason);
    } catch (err) {
      setError(err.message || "Could not load archive JSON.");
    } finally {
      event.target.value = "";
    }
  };

  if (!rows.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        <h2 className="text-3xl font-black text-gray-900">Historical Stats Archive</h2>
        <p className="text-gray-600 mt-2">Load your saved statsArchive.json to browse Malcolm&apos;s historical team-strength archive.</p>
        <label className="mt-6 inline-flex items-center px-5 py-3 rounded-xl bg-blue-600 text-white font-bold shadow hover:bg-blue-700 cursor-pointer">
          Load statsArchive.json
          <input type="file" accept=".json,application/json" onChange={handleLoadJson} className="hidden" />
        </label>
        {error && <div className="mt-4 text-red-700 font-semibold">{error}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-100">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-gray-900">Historical Stats Archive</h2>
            <p className="text-gray-600 mt-1">Browse team strength, predicted finish, actual finish, VA and PVA across Malcolm&apos;s S2–S27 dataset.</p>
          </div>
          <label className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white font-bold shadow hover:bg-blue-700 cursor-pointer">
            Load different JSON
            <input type="file" accept=".json,application/json" onChange={handleLoadJson} className="hidden" />
          </label>
        </div>
        {error && <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold">{error}</div>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Rows" value={rows.length} />
        <StatCard label="Files" value={summaries.length} />
        <StatCard label="Seasons" value={seasons.length} note={`${Math.min(...seasons)}–${Math.max(...seasons)}`} />
        <StatCard label="Missing divisions" value={health.missing.length} />
        <StatCard label="Warnings" value={warnings.length} />
      </div>

      <div className="bg-white rounded-xl shadow-lg p-5">
        <h3 className="font-black text-gray-900 mb-3">Archive completeness</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left py-2 px-3">Season</th>
                {EXPECTED_DIVISIONS.map((division) => (
                  <th key={division} className="text-center py-2 px-3">D{division}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {health.grid.map((seasonRow) => (
                <tr key={seasonRow.season} className="border-t">
                  <td className="py-2 px-3 font-bold">S{seasonRow.season}</td>
                  {seasonRow.divisions.map((divisionRow) => {
                    const tone = divisionRow.status === "complete" ? "green" : divisionRow.status === "partial" ? "amber" : "red";
                    const label = divisionRow.status === "complete" ? "20/20" : divisionRow.status === "partial" ? `${divisionRow.count}/20` : "Missing";
                    return (
                      <td key={divisionRow.division} className="py-2 px-3 text-center">
                        <MiniBadge tone={tone}>{label}</MiniBadge>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(health.missing.length > 0 || health.partial.length > 0) && (
          <div className="mt-4 text-sm text-gray-600">
            {health.missing.length > 0 && <p><strong>Missing:</strong> {health.missing.join(", ")}</p>}
            {health.partial.length > 0 && <p><strong>Partial:</strong> {health.partial.join(", ")}</p>}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-5 border-b flex flex-col lg:flex-row lg:items-end gap-3 lg:justify-between">
          <div>
            <h3 className="font-black text-gray-900 text-xl">Archive Explorer</h3>
            <p className="text-sm text-gray-500">Select a season and division to inspect the imported stats table.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="border rounded-lg px-3 py-2" value={selectedSeason} onChange={(event) => setSelectedSeason(Number(event.target.value))}>
              {seasons.map((season) => <option key={season} value={season}>S{season}</option>)}
            </select>
            <select className="border rounded-lg px-3 py-2" value={selectedDivision} onChange={(event) => setSelectedDivision(Number(event.target.value))}>
              {(divisionsForSeason.length ? divisionsForSeason : EXPECTED_DIVISIONS).map((division) => <option key={division} value={division}>D{division}</option>)}
            </select>
            <select className="border rounded-lg px-3 py-2" value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
              <option value="predictedPosition">Pre</option>
              <option value="finalPosition">Final</option>
              <option value="valueAdded">VA</option>
              <option value="pva">PVA</option>
              <option value="etot">ETOT</option>
              <option value="average">Average</option>
              <option value="club">Club A-Z</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
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
              {tableRows.map((row) => (
                <tr key={`${row.sourceFile}-${row.sourceRow}-${row.club}`} className="border-t hover:bg-blue-50">
                  <td className="py-2 px-3 font-bold">
                    <button className="text-blue-700 hover:underline" onClick={() => { setSelectedClub(row.club); setClubQuery(row.club); }}>
                      {row.club}
                    </button>
                  </td>
                  <td className="py-2 px-3 text-right">{fmt(row.gk, 1)}</td>
                  <td className="py-2 px-3 text-right">{fmt(row.def, 1)}</td>
                  <td className="py-2 px-3 text-right">{fmt(row.mid, 1)}</td>
                  <td className="py-2 px-3 text-right">{fmt(row.att, 1)}</td>
                  <td className="py-2 px-3 text-right">{fmt(row.top18, 1)}</td>
                  <td className="py-2 px-3 text-right">{fmt(row.average, 1)}</td>
                  <td className="py-2 px-3 text-right font-semibold">{fmt(row.etot, 2)}</td>
                  <td className="py-2 px-3 text-right">{fmt(row.predictedPosition, 0)}</td>
                  <td className="py-2 px-3 text-right">{fmt(row.finalPosition, 0)}</td>
                  <td className={`py-2 px-3 text-right font-bold ${Number(row.valueAdded) > 0 ? "text-green-700" : Number(row.valueAdded) < 0 ? "text-red-700" : "text-gray-700"}`}>{signed(row.valueAdded)}</td>
                  <td className="py-2 px-3 text-right">{signed(row.pva, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-5">
          <h3 className="font-black text-gray-900 text-xl mb-3">Club history</h3>
          <input
            value={clubQuery}
            onChange={(event) => setClubQuery(event.target.value)}
            placeholder="Search for a club..."
            className="w-full border rounded-lg px-3 py-2 mb-3"
          />
          <div className="flex flex-wrap gap-2 mb-4">
            {matchingClubs.map((club) => (
              <button
                key={club}
                onClick={() => {
                  setSelectedClub(club);
                  setClubQuery(club);
                }}
                className={`px-3 py-1 rounded-lg text-sm font-semibold ${selectedClub === club ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
              >
                {club}
              </button>
            ))}
          </div>
          {clubHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left py-2 px-3">Season</th>
                    <th className="text-left py-2 px-3">Div</th>
                    <th className="text-right py-2 px-3">ETOT</th>
                    <th className="text-right py-2 px-3">Pre</th>
                    <th className="text-right py-2 px-3">Fin</th>
                    <th className="text-right py-2 px-3">VA</th>
                    <th className="text-right py-2 px-3">PVA</th>
                  </tr>
                </thead>
                <tbody>
                  {clubHistory.map((row) => (
                    <tr key={`${row.sourceFile}-${row.sourceRow}`} className="border-t">
                      <td className="py-2 px-3 font-bold">S{row.season}</td>
                      <td className="py-2 px-3">D{row.division}</td>
                      <td className="py-2 px-3 text-right">{fmt(row.etot, 2)}</td>
                      <td className="py-2 px-3 text-right">{fmt(row.predictedPosition, 0)}</td>
                      <td className="py-2 px-3 text-right">{fmt(row.finalPosition, 0)}</td>
                      <td className="py-2 px-3 text-right font-bold">{signed(row.valueAdded)}</td>
                      <td className="py-2 px-3 text-right">{signed(row.pva, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Choose a club to see its stats history.</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-5">
          <h3 className="font-black text-gray-900 text-xl mb-3">Early headline records</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-bold text-green-800 mb-2">Biggest VA overachievers</h4>
              <ol className="space-y-1 text-sm">
                {topOverachievers.map((row, index) => (
                  <li key={`${row.sourceFile}-${row.sourceRow}`} className="flex justify-between gap-3 border-b py-1">
                    <span>{index + 1}. S{row.season}D{row.division} {row.club}</span>
                    <strong className="text-green-700">{signed(row.valueAdded)}</strong>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h4 className="font-bold text-red-800 mb-2">Biggest VA underachievers</h4>
              <ol className="space-y-1 text-sm">
                {biggestFalls.map((row, index) => (
                  <li key={`${row.sourceFile}-${row.sourceRow}`} className="flex justify-between gap-3 border-b py-1">
                    <span>{index + 1}. S{row.season}D{row.division} {row.club}</span>
                    <strong className="text-red-700">{signed(row.valueAdded)}</strong>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoricalStatsArchive;
