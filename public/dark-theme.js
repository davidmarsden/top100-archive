// Dark by default. Tailwind's palette is remapped by use, so the existing classes stay:
// light backgrounds, borders and gradient stops become dark tints, dark text becomes light,
// and dark backgrounds (headers, buttons with white text) keep their colours.
(function () {
  var P = {
    red: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#450a0a'],
    orange: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12', '#431407'],
    amber: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#451a03'],
    yellow: ['#fefce8', '#fef9c3', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12', '#422006'],
    green: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16'],
    emerald: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'],
    teal: ['#f0fdfa', '#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a', '#042f2e'],
    cyan: ['#ecfeff', '#cffafe', '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63', '#083344'],
    sky: ['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e', '#082f49'],
    blue: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'],
    indigo: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81', '#1e1b4b'],
    violet: ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#2e1065'],
    purple: ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87', '#3b0764'],
    fuchsia: ['#fdf4ff', '#fae8ff', '#f5d0fe', '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf', '#86198f', '#701a75', '#4a044e'],
    pink: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843', '#500724'],
    rose: ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337', '#4c0519'],
  };
  // Greys become the navy scale of the other Top 100 sites, lightest last.
  var NAVY = ['#08162d', '#0f2443', '#132b50', '#18335c', '#24406b', '#2c4a78', '#5b6f8f', '#8a9bb6', '#a9b8d0', '#c4d0e2', '#dbe3ef', '#e8eef8', '#f4f7fb'];
  var STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
  var GREYS = ['gray', 'slate', 'zinc', 'neutral', 'stone'];
  function scale(values) { var out = {}; STEPS.forEach(function (step, i) { out[step] = values[i]; }); return out; }
  // Backgrounds and gradient stops: 50-300 become dark tints (950, 900, 800, 800); the rest stay.
  function darkBg(c) { return scale([c[10], c[9], c[8], c[8], c[4], c[5], c[6], c[7], c[8], c[9], c[10]]); }
  // Text: 600-950 become light (400, 300, 200, 100, 50); 50-500 stay.
  function lightText(c) { return scale([c[0], c[1], c[2], c[3], c[4], c[5], c[4], c[3], c[2], c[1], c[0]]); }
  // Borders and rings: 50-300 become dark (900, 800, 700, 700).
  function darkLine(c) { return scale([c[9], c[8], c[7], c[7], c[4], c[5], c[6], c[7], c[8], c[9], c[10]]); }
  var greyBg = scale(['#0a1a33', NAVY[2], NAVY[3], NAVY[5], NAVY[6], NAVY[7], '#475569', '#334155', '#1e293b', '#0f172a', '#020617']);
  var greyText = scale(['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', NAVY[7], NAVY[8], NAVY[8], NAVY[9], NAVY[10], NAVY[11], NAVY[12]]);
  var greyLine = scale([NAVY[3], NAVY[4], NAVY[5], NAVY[5], NAVY[6], NAVY[7], NAVY[7], NAVY[6], NAVY[5], NAVY[4], NAVY[3]]);
  function build(hueFn, grey, white) {
    var out = { transparent: 'transparent', current: 'currentColor', inherit: 'inherit', black: '#000000', white: white };
    Object.keys(P).forEach(function (hue) { out[hue] = hueFn(P[hue]); });
    GREYS.forEach(function (name) { out[name] = grey; });
    return out;
  }
  var bg = build(darkBg, greyBg, '#0f2443');
  window.tailwind = window.tailwind || {};
  // The few dark: classes (written for devices set to dark mode) now always apply.
  document.documentElement.classList.add('dark');
  window.tailwind.config = {
    darkMode: 'class',
    theme: {
      backgroundColor: bg,
      gradientColorStops: bg,
      textColor: build(lightText, greyText, '#ffffff'),
      borderColor: build(darkLine, greyLine, '#ffffff'),
      divideColor: build(darkLine, greyLine, '#ffffff'),
      ringColor: build(darkLine, greyLine, '#ffffff'),
      placeholderColor: build(lightText, greyText, '#ffffff'),
    },
  };
})();
