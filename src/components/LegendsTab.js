import React from "react";

const FeatureCard = ({ eyebrow, title, children }) => (
  <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0B1F3B]">
    <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
      {eyebrow}
    </p>
    <h3 className="mb-3 text-xl font-black text-[#0B1F3B] dark:text-white">{title}</h3>
    <div className="space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{children}</div>
  </article>
);

const RankingRow = ({ position, club, titles, breakdown }) => (
  <tr className="border-b border-slate-100 last:border-0 dark:border-white/10">
    <td className="px-4 py-3 font-black text-slate-500 dark:text-slate-400">{position}</td>
    <td className="px-4 py-3 font-bold text-[#0B1F3B] dark:text-white">{club}</td>
    <td className="px-4 py-3 text-center font-black text-[#0B1F3B] dark:text-white">{titles}</td>
    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{breakdown}</td>
  </tr>
);

const LegendsTab = () => (
  <div className="space-y-8">
    <section className="overflow-hidden rounded-3xl bg-[#0B1F3B] p-7 text-white shadow-lg sm:p-10">
      <div className="max-w-4xl">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
          10th anniversary archive · Season 25 snapshot
        </p>
        <h2 className="text-3xl font-black sm:text-5xl">Legends of Top 100</h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200 sm:text-lg">
          The managers, clubs, dynasties and moments that defined Top 100's first 25 seasons. This section preserves the 2025 tenth-anniversary feature as a historical snapshot; live honours and records elsewhere in Stats & History remain the current source of truth.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-4">
        {[
          ["25", "Seasons"],
          ["10", "Years"],
          ["100", "Managers"],
          ["125", "Trophies in the anniversary snapshot"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-2xl border border-white/15 bg-white/10 p-4">
            <div className="text-3xl font-black text-emerald-300">{value}</div>
            <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-300">{label}</div>
          </div>
        ))}
      </div>
    </section>

    <section>
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">The first 25 seasons</p>
        <h3 className="text-2xl font-black text-[#0B1F3B] dark:text-white">The defining stories</h3>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <FeatureCard eyebrow="Manager legend" title="Scott Mckenzie: the benchmark">
          <p>Eight Division 1 titles with Barcelona made Scott Mckenzie the defining manager of Top 100's first decade, from early success in Seasons 2 and 3 through the four-title run from Seasons 9–12.</p>
          <p>The anniversary feature described that record as the standard every later dynasty would be measured against.</p>
        </FeatureCard>

        <FeatureCard eyebrow="Modern dynasty" title="Hellas Verona's rise">
          <p>By Season 25, Luis André Libras-Boas and Hellas Verona had become the modern counterweight to the old giants: four league titles in five seasons and success across multiple competitions.</p>
          <p>This entry is deliberately frozen at the Season 25 anniversary point rather than updated retrospectively.</p>
        </FeatureCard>

        <FeatureCard eyebrow="Club dynasty" title="Barcelona's first-quarter-century supremacy">
          <p>The anniversary snapshot credited Barcelona with 15 major trophies: ten Division 1 titles, four World Club Cups and a Youth Cup.</p>
          <p>For current totals, use the Honours section; this is the historical picture as it stood at the tenth anniversary.</p>
        </FeatureCard>

        <FeatureCard eyebrow="Specialists" title="Different routes to greatness">
          <p>Arsenal's World Club Cup record, Levante's extraordinary five consecutive Youth Cups under Salvatore Zerbo, and André Guerra's knockout success showed that Top 100 greatness was never only about Division 1.</p>
          <p>The variety of specialists became one of the defining characteristics of the game world.</p>
        </FeatureCard>
      </div>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0B1F3B] sm:p-7">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Anniversary snapshot</p>
        <h3 className="text-2xl font-black text-[#0B1F3B] dark:text-white">Ultimate club rankings at Season 25</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Preserved from the original Legends feature. These figures are archival, not live standings.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-slate-400">
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Club</th>
              <th className="px-4 py-3 text-center">Titles</th>
              <th className="px-4 py-3">Anniversary breakdown</th>
            </tr>
          </thead>
          <tbody>
            <RankingRow position="1" club="FC Barcelona" titles="15" breakdown="10 Division 1 · 4 World Club Cup · 1 Youth Cup" />
            <RankingRow position="2" club="Bayern Munich" titles="13" breakdown="3 Division 1 · 4 Cup · 3 Shield · 2 World Club Cup · 1 Youth Cup" />
            <RankingRow position="3" club="Hellas Verona" titles="9" breakdown="4 Division 1 · 3 Cup · 2 Shield" />
          </tbody>
        </table>
      </div>

      <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
        For complete and current honours, use the <a href="#honours" className="font-bold text-emerald-600 hover:underline dark:text-emerald-400">Honours</a> tab.
      </p>
    </section>

    <section className="grid gap-5 md:grid-cols-3">
      <FeatureCard eyebrow="Era" title="The early years">
        <p>Manchester United's inaugural triumph and Bayern Munich's early successes established the competitive baseline before the great long-running dynasties emerged.</p>
      </FeatureCard>
      <FeatureCard eyebrow="Era" title="The Barcelona age">
        <p>Scott Mckenzie's Barcelona transformed sustained excellence into the defining story of the middle period, including the four-in-a-row run from Seasons 9–12.</p>
      </FeatureCard>
      <FeatureCard eyebrow="Era" title="The new order">
        <p>By Season 25, Hellas Verona had become the symbol of a newer generation capable of challenging the historical giants across league and cup competition.</p>
      </FeatureCard>
    </section>
  </div>
);

export default LegendsTab;
