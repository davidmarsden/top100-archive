export const PUBLIC_ARCHIVE_TABS = [
  { id: "search", label: "Search", icon: "Search", color: "blue", type: "tab" },
  { id: "tables", label: "League Tables", icon: "BarChart3", color: "purple", type: "tab" },
  { id: "insights", label: "Insights", icon: "BarChart3", color: "green", type: "tab" },
  { id: "charts", label: "Charts", icon: "BarChart3", color: "indigo", type: "tab" },
  { id: "managers", label: "Manager Profiles", icon: "Users", color: "teal", type: "tab" },
  { id: "manager-analytics", label: "Manager Analytics", icon: "Users", color: "purple", type: "tab" },
  { id: "honours", label: "Honours", icon: "Trophy", color: "amber", type: "tab" },
  { id: "legends", label: "Legends", icon: "Trophy", color: "amber", type: "route", href: "/legends/" },
  { id: "stats-archive", label: "Stats Archive", icon: "Database", color: "pink", type: "route", href: "#stats-archive" },
];

export const ADMIN_ARCHIVE_TABS = [
  { id: "import", label: "Import Stats", icon: "Database", color: "pink", type: "tab" },
];

// Malcolm's stats archive, Manager Analytics and Legends cover Top 100 only.
const TOP_100_ONLY = new Set(["manager-analytics", "legends", "stats-archive"]);
export const tabsForWorld = (world) =>
  world?.sheet === false ? PUBLIC_ARCHIVE_TABS.filter((tab) => !TOP_100_ONLY.has(tab.id)) : PUBLIC_ARCHIVE_TABS;
