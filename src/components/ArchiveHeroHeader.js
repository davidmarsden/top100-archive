import React from "react";
import { AlertCircle, Database, Loader } from "lucide-react";

const ArchiveHeroHeader = ({ loading, error, dataLoaded }) => (
  <div className="relative overflow-hidden bg-black text-pink-100 border-b-4 border-pink-300">
    <div className="absolute inset-0 bg-gradient-to-r from-black via-black to-[#e9a6ad]" />
    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_70%_40%,#f9a8d4_0,transparent_35%)]" />

    <div className="relative max-w-7xl mx-auto px-6 py-12">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <img
            src="https://anotherurl.wordpress.com/wp-content/uploads/2026/07/edited-photo.png"
            alt="Top 100"
            className="h-28 md:h-36 drop-shadow-lg"
          />
        </div>

        <div
          className="absolute right-0 top-0 w-[700px] h-[700px] opacity-10"
          style={{
            backgroundImage: "url('/football-watermark.png')",
            backgroundRepeat: "no-repeat",
            backgroundSize: "contain",
          }}
        />

        <h1 className="text-5xl md:text-7xl font-black tracking-tight uppercase mb-6 text-[#f4c8d6]">
          FULL 27 SEASONS DATA ARCHIVE
        </h1>

        <div className="text-xl md:text-2xl text-[#f0b6be] mb-8">
          Soccer Manager Worlds Elite Community • Complete Historical Database
        </div>

        <div className="flex items-center justify-center gap-3 text-lg">
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin text-yellow-300" />
              <span className="text-pink-100">Loading historical data...</span>
            </>
          ) : error ? (
            <>
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-300">Database Error: {error}</span>
            </>
          ) : dataLoaded ? (
            <>
              <Database className="w-5 h-5 text-green-300" />
              <span className="text-green-300">✅ Live Database Connected</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-yellow-300" />
              <span className="text-yellow-300">⚙️ Setup Required</span>
            </>
          )}
        </div>
      </div>
    </div>
  </div>
);

export default ArchiveHeroHeader;
