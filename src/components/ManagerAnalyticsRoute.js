import React, { useEffect, useState } from "react";
import ManagerAnalyticsTab from "./ManagerAnalyticsTab";
import SuccessEvidencePanel from "./SuccessEvidencePanel";

const PUBLIC_ARCHIVE_URL = "/data/statsArchive.json";
const WINNERS_SHEET_ID = process.env.REACT_APP_WINNERS_SHEET_ID;
const WINNERS_CLUBS_RANGE = process.env.REACT_APP_WINNERS_CLUBS_RANGE || "Clubs!A:Z";
const WINNERS_MANAGERS_RANGE = process.env.REACT_APP_WINNERS_MANAGERS_RANGE || "Managers!A:Z";
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;

const normaliseArchiveRows = (value) => (Array.isArray(value?.rows) ? value.rows : []);

const sheetToObjects = (values) => {
  if (!Array.isArray(values) || !values.length) return [];
  const [headers, ...rows] = values;
  const keys = headers.map((header) => String(header || "").trim().toLowerCase());

  return rows
    .filter((row) => row && row.length)
    .map((row) => {
      const object = {};
      keys.forEach((key, index) => {
        object[key] = String(row[index] ?? "").trim();
      });
      return object;
    });
};

const fetchSheetRange = async (range) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    WINNERS_SHEET_ID
  )}/values/${encodeURIComponent(range)}?key=${encodeURIComponent(API_KEY)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Honours range failed (${response.status})`);
  const parsed = await response.json();
  return sheetToObjects(parsed.values || []);
};

const ManagerAnalyticsRoute = ({ archiveRows = [] }) => {
  const [statsRows, setStatsRows] = useState([]);
  const [honours, setHonours] = useState({ clubHonours: [], managerHonours: [] });
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Loading Malcolm stats archive…");

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const response = await fetch(`${PUBLIC_ARCHIVE_URL}?v=${Date.now()}`, {
          headers: { Accept: "application/json" },
        });

        if (!response.ok) throw new Error(`Stats archive not found (${response.status})`);

        const parsed = await response.json();
        const rows = normaliseArchiveRows(parsed);

        if (!rows.length) throw new Error("Stats archive JSON contains no rows.");

        let clubHonours = [];
        let managerHonours = [];

        if (WINNERS_SHEET_ID && API_KEY) {
          try {
            [clubHonours, managerHonours] = await Promise.all([
              fetchSheetRange(WINNERS_CLUBS_RANGE),
              fetchSheetRange(WINNERS_MANAGERS_RANGE),
            ]);
          } catch {
            clubHonours = [];
            managerHonours = [];
          }
        }

        if (!cancelled) {
          setStatsRows(rows);
          setHonours({ clubHonours, managerHonours });
          setStatus("loaded");
          setMessage("");
        }
      } catch (error) {
        if (!cancelled) {
          setStatsRows([]);
          setHonours({ clubHonours: [], managerHonours: [] });
          setStatus("error");
          setMessage(error.message || "Stats archive could not be loaded.");
        }
      }
    };

    loadData();

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

  return (
    <div className="space-y-8">
      <ManagerAnalyticsTab archiveRows={archiveRows} statsRows={statsRows} />
      <SuccessEvidencePanel archiveRows={archiveRows} statsRows={statsRows} honours={honours} />
    </div>
  );
};

export default ManagerAnalyticsRoute;
