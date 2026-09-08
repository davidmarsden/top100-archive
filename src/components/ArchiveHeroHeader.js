import React from "react";
import { AlertCircle, Database, Loader } from "lucide-react";

const MAIN_SITE_URL = "https://smtop100.micro.blog/";

const ArchiveHeroHeader = ({ loading, error, dataLoaded }) => (
  <header className="relative overflow-hidden bg-[#0B1F3B] text-white border-b border-white/10">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(16,185,129,0.18),transparent_34%)]" />

    <div className="relative border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <a href={MAIN_SITE_URL} aria-label="Visit the Top 100 main site" className="inline-block no-underline">
          <div className="text-4xl sm:text-5xl font-black tracking-tight leading-none">
            <span className="text-white">Top</span><span className="text-[#10B981]">100</span>
          </div>
          <div className="mt-3 flex items-center gap-0 max-w-[360px]" aria-hidden="true">
            <span className="h-px flex-1 bg-slate-300" />
            <span className="w-5 h-5 rounded-full border-2 border-slate-300" />
            <span className="h-px flex-1 bg-slate-300" />
          </div>
          <div className="mt-2 text-[10px] sm:text-xs font-black uppercase tracking-[0.28em] text-slate-300">
            Managers. Stories. A bigger game.
          </div>
        </a>

        <nav className="mt-6 flex gap-2 overflow-x-auto pb-1" aria-label="Top 100 websites">
          <a href={MAIN_SITE_URL} className="shrink-0 rounded-2xl border border-slate-300/80 px-4 py-2.5 text-sm font-bold text-slate-200 no-underline transition hover:border-white hover:text-white">Top 100</a>
          <a href="https://archive.smtop100.blog/" aria-current="page" className="shrink-0 rounded-2xl border border-[#10B981] bg-[#10B981] px-4 py-2.5 text-sm font-black text-[#0B1F3B] no-underline">Stats &amp; History</a>
          <a href="https://youth-cup.smtop100.blog/" className="shrink-0 rounded-2xl border border-slate-300/80 px-4 py-2.5 text-sm font-bold text-slate-200 no-underline transition hover:border-white hover:text-white">Tournaments</a>
          <a href="https://awards.smtop100.blog/" className="shrink-0 rounded-2xl border border-slate-300/80 px-4 py-2.5 text-sm font-bold text-slate-200 no-underline transition hover:border-white hover:text-white">Awards</a>
          <a href="https://top100regen.website/" className="shrink-0 rounded-2xl border border-slate-300/80 px-4 py-2.5 text-sm font-bold text-slate-200 no-underline transition hover:border-white hover:text-white">Regen</a>
        </nav>
      </div>
    </div>

    <div className="relative max-w-7xl mx-auto px-6 py-12 md:py-16">
      <div className="max-w-4xl">
        <div className="text-sm font-black uppercase tracking-[0.18em] text-[#10B981]">Top 100 · Stats &amp; History</div>
        <h1 className="mt-4 text-4xl md:text-6xl font-black tracking-tight leading-[0.98] text-white">
          Every season. Every manager. <span className="text-[#10B981]">The story in numbers.</span>
        </h1>
        <p className="mt-6 text-lg md:text-xl leading-relaxed text-slate-300 max-w-3xl">
          League tables, careers, honours, records and historical trends from across the Top 100 game world.
        </p>

        <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold">
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin text-[#10B981]" />
              <span className="text-slate-200">Loading historical data…</span>
            </>
          ) : error ? (
            <>
              <AlertCircle className="w-4 h-4 text-red-300" />
              <span className="text-red-200">Database error: {error}</span>
            </>
          ) : dataLoaded ? (
            <>
              <Database className="w-4 h-4 text-[#10B981]" />
              <span className="text-slate-200">Live database connected</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-amber-300" />
              <span className="text-amber-200">Setup required</span>
            </>
          )}
        </div>
      </div>
    </div>
  </header>
);

export default ArchiveHeroHeader;
