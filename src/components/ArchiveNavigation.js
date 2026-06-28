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

const colourClasses = {
  blue: "from-blue-500 to-blue-600",
  purple: "from-purple-500 to-purple-600",
  green: "from-green-500 to-green-600",
  indigo: "from-indigo-500 to-indigo-600",
  teal: "from-teal-500 to-teal-600",
  amber: "from-amber-500 to-amber-600",
  pink: "from-pink-500 to-pink-600",
};

const baseClass =
  "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105";

const inactiveClass = "bg-[#e9a6ad] hover:bg-[#de8f99] text-gray-900";

const ArchiveNavigation = ({ activeTab, setActiveTab, tabs = PUBLIC_ARCHIVE_TABS }) => (
  <div className="bg-white shadow-xl sticky top-0 z-50 border-b border-gray-200">
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex flex-wrap gap-2 py-4">
        {tabs.map((tab) => {
          const Icon = ICONS[tab.icon] || BarChart3;
          const activeClass = `bg-gradient-to-r ${colourClasses[tab.color] || colourClasses.blue} text-white shadow-lg`;
          const className = `${baseClass} ${activeTab === tab.id ? activeClass : inactiveClass}`;

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
