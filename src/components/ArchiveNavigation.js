import React from "react";
import { BarChart3, Database, Search, Trophy, Users } from "lucide-react";
import { PUBLIC_ARCHIVE_TABS } from "../config/archiveTabs";

const ICONS = {
  BarChart3,
  Database,
  Search,
  Trophy,
  Users,
};

const baseClass =
  "flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-[#10B981]/60";

const ArchiveNavigation = ({ activeTab, setActiveTab, tabs = PUBLIC_ARCHIVE_TABS }) => (
  <div className="sticky top-0 z-50 border-b border-slate-200 bg-[#F8FAFC]/95 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#071526]/95">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="flex gap-2 overflow-x-auto py-3" aria-label="Stats and History sections">
        {tabs.map((tab) => {
          const Icon = ICONS[tab.icon] || BarChart3;
          const isActive = activeTab === tab.id;
          const className = `${baseClass} ${
            isActive
              ? "border-[#10B981] bg-[#10B981] text-[#0B1F3B] shadow-sm"
              : "border-slate-300 bg-white text-slate-700 hover:border-[#10B981] hover:text-[#0B1F3B] dark:border-white/20 dark:bg-[#0B1F3B] dark:text-slate-200 dark:hover:border-[#10B981] dark:hover:text-white"
          }`;

          if (tab.type === "route") {
            return (
              <a key={tab.id} href={tab.href || `#${tab.id}`} className={className}>
                <Icon className="w-4 h-4" />
                {tab.label}
              </a>
            );
          }

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                window.location.hash = tab.id;
              }}
              className={className}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

export default ArchiveNavigation;
