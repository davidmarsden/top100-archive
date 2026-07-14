import React, { useEffect, useState } from "react";
import HistoricalStatsArchive from "./HistoricalStatsArchive";

const STORAGE_KEY = "top100StatsImporterWorkspace";
const PUBLIC_ARCHIVE_URL = "/data/statsArchive.json";

const normaliseArchive = (value) => ({
  rows: Array.isArray(value?.rows) ? value.rows : [],
  summaries: Array.isArray(value?.summaries) ? value.summaries : [],
  warnings: Array.isArray(value?.warnings) ? value.warnings : [],
});

const PublicHistoricalStatsArchive = () => {
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Loading public stats archive…");

  useEffect(() => {
    let cancelled = false;

    const loadPublicArchive = async () => {
      try {
        const response = await fetch(`${PUBLIC_ARCHIVE_URL}?v=${Date.now()}`, {
          headers: { Accept: "application/json" },
        });

        if (!response.ok) throw new Error(`Public archive not found (${response.status})`);

        const parsed = await response.json();
        const archive = normaliseArchive(parsed);

        if (!archive.rows.length) throw new Error("Public archive JSON contains no rows.");

        localStorage.setItem(STORAGE_KEY, JSON.stringify(archive));
        if (!cancelled) {
          setStatus("loaded");
          setMessage("");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("fallback");
          setMessage(
            "Public archive JSON could not be loaded, so this page is using any saved browser workspace data instead."
          );
        }
      }
    };

    loadPublicArchive();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 text-gray-700 font-semibold">
        {message}
      </div>
    );
  }

  return (
    <>
      {status === "fallback" && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 font-semibold">
          {message}
        </div>
      )}
      <HistoricalStatsArchive allowImport={false} />
    </>
  );
};

export default PublicHistoricalStatsArchive;
