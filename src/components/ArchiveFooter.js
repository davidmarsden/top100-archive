import React from "react";

const MAIN_SITE_URL = "https://smtop100.micro.blog/";

const ArchiveFooter = () => (
  <footer className="mt-16 border-t border-white/10 bg-[#071526] text-slate-300">
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <a href={MAIN_SITE_URL} className="inline-flex items-baseline no-underline">
          <span className="text-xl font-black text-white">Top</span>
          <span className="text-xl font-black text-[#10B981]">100</span>
          <span className="ml-3 text-xs font-black uppercase tracking-[0.18em] text-slate-300">Stats &amp; History</span>
        </a>

        <nav className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold" aria-label="Top 100 footer navigation">
          <a href={MAIN_SITE_URL} className="text-slate-300 no-underline hover:text-white">Top 100</a>
          <a href={`${MAIN_SITE_URL}rules/`} className="text-slate-300 no-underline hover:text-white">Rules</a>
          <a href={`${MAIN_SITE_URL}support/`} className="text-slate-300 no-underline hover:text-white">Support</a>
          <a href="https://youth-cup.smtop100.blog/" className="text-slate-300 no-underline hover:text-white">Tournaments</a>
          <a href="https://awards.smtop100.blog/" className="text-slate-300 no-underline hover:text-white">Awards</a>
        </nav>
      </div>
      <p className="mt-6 border-t border-white/10 pt-5 text-xs text-slate-300">
        The historical record of the Top 100 Soccer Manager community.
      </p>
    </div>
  </footer>
);

export default ArchiveFooter;
