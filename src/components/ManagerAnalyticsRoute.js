import React, { useEffect, useState } from "react";
import ManagerAnalyticsTab from "./ManagerAnalyticsTab";

const PUBLIC_ARCHIVE_URL = "/data/statsArchive.json";

const normaliseArchiveRows = (value) => (Array.isArray(value?.rows) ? value.rows : []);

const ManagerAnalyticsRoute = ({ archiveRows = [] }) => {
  const [statsRows, setStatsRows] = useState([]);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Loading Malcolm stats archive…");

  useEffect(() => {
    let cancelled = false;

    const loadStatsArchive = async () => {
      try {
        const response = await fetch(`${PUBLIC_ARCHIVE_URL}?v=${Date.now()}`, {
          headers: { Accept: "application/json" },
        });

        if (!response.ok) throw new Error(`Stats archive not found (${response.status})`);

        const parsed = await response.json();
        const rows = normaliseArchiveRows(parsed);

        if (!rows.length) throw new Error("Stats archive JSON contains no rows.");

        if (!cancelled) {
          setStatsRows(rows);
          setStatus("loaded");
          setMessage("");
        }
      } catch (error) {
        if (!cancelled) {
          setStatsRows([]);
          setStatus("error");
          setMessage(error.message || "Stats archive could not be loaded.");
        }
      }
    };

    loadStatsArchive();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
        {message}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-900 font-semibold">
        {message}
      </div>
    );
  }

  return <ManagerAnalyticsTab archiveRows={archiveRows} statsRows={statsRows} />;
};

export default ManagerAnalyticsRoute;
