import React from "react";
import { AlertCircle, Database, Loader } from "lucide-react";

const LOGO_URL = "/top100-logo.svg";

const ArchiveHeroHeader = ({ loading, error, dataLoaded }) => (
  <header className="relative overflow-hidden bg-black text-pink-100 border-b-4 border-pink-300">
    <div className="absolute inset-0 bg-gradient-to-r from-black via-black to-[#e9a6ad]" />
    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_70%_40%,#f9a8d4_0,transparent_35%)]" />

    <div className="relative border-b border-white/15 bg-black/25 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
        <a
          href="https://smtop100.blog/"
          aria-label="Visit the Top 100 main site"
          className="inline-flex self-start rounded-2xl border border-white/35 bg-white/90 px-4 py-2 shadow-2xl transition hover:-translate-y-0.5 hover:bg-white"
        >
          <img src={LOGO_URL} alt="Top 100 — Probably the best GW in SM" className="h-14 sm:h-16 w-auto object-contain" />
        </a>

        <div className="hidden lg:block leading-tight">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-[#f4c8d6]">Top 100</div>
          <div className="text-xl font-black text-white">Historical Archive</div>
        </div>

        <nav className="lg:ml-auto flex gap-2 overflow-x-auto pb-1 lg:pb-0" aria-label="Top 100 websites">
          <a href="https://smtop100.blog/" className="shrink-0 rounded-full border border-white/20 bg-black/25 px-4 py-2 text-sm font-bold text-white no-underline transition hover:border-white/50 hover:bg-white/15">Main site</a>
          <a href="https://archive.smtop100.blog/" aria-current="page" className="shrink-0 rounded-full border border-white/45 bg-white/15 px-4 py-2 text-sm font-bold text-white no-underline">Archive</a>
          <a href="https://youth-cup.smtop100.blog/" className="shrink-0 rounded-full border border-white/20 bg-black/25 px-4 py-2 text-sm font-bold text-white no-underline transition hover:border-white/50 hover:bg-white/15">Tournaments</a>
          <a href="https://youth-cup.smtop100.blog/manager" className="shrink-0 rounded-full border border-white/50 bg-[#f4c8d6] px-4 py-2 text-sm font-black text-[#211820] no-underline transition hover:bg-white">Manager portal</a>
        </nav>
      </div>
    </div>

    <div className="relative max-w-7xl mx-auto px-6 py-12">
      <div className="text-center">
        <div
          className="absolute right-0 top-0 w-[700px] h-[700px] opacity-10"
          style={{
            backgroundImage: "url('/football-watermark.png')",
            backgroundRepeat: "no-repeat",
            backgroundSize: "contain",
          }}
        />

        <div className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-[#f0b6be]">Top 100 · Historical database</div>

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
  </header>
);

export default ArchiveHeroHeader;
