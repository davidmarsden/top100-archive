import React from "react";
import { Trophy } from "lucide-react";

const ArchiveFooter = () => (
  <footer className="bg-gradient-to-r from-slate-800 to-slate-900 text-white mt-16">
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <Trophy className="w-12 h-12 text-yellow-400" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Soccer Manager Worlds Top 100</h3>
        <p className="text-gray-300 mb-6">Elite Community • Historical Database • 27 Seasons</p>
        <div className="mt-8 pt-6 border-t border-gray-700">
          <p className="text-sm text-gray-400">
            Built for the Soccer Manager Worlds Top 100 Community •
            <span className="text-blue-300"> Professional Football Management</span>
          </p>
        </div>
      </div>
    </div>
  </footer>
);

export default ArchiveFooter;
