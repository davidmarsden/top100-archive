import { useEffect } from "react";

const IMPORT_LABEL = "Import Stats";
const STATS_LINK_ID = "legacy-public-stats-archive-tab";

const makeStatsArchiveLink = () => {
  const link = document.createElement("a");
  link.id = STATS_LINK_ID;
  link.href = "#stats-archive";
  link.className =
    "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 bg-[#e9a6ad] hover:bg-[#de8f99] text-gray-900";
  link.innerHTML = '<span class="w-4 h-4 inline-flex items-center justify-center">📊</span><span>Stats Archive</span>';
  return link;
};

const applyPublicNavBridge = () => {
  const buttons = [...document.querySelectorAll("button")];
  const importButton = buttons.find((button) => button.textContent?.trim() === IMPORT_LABEL);

  if (!importButton) return;

  const navContainer = importButton.parentElement;
  if (!navContainer) return;

  importButton.style.display = "none";

  if (!document.getElementById(STATS_LINK_ID)) {
    navContainer.insertBefore(makeStatsArchiveLink(), importButton);
  }
};

const redirectPublicImportRoute = () => {
  if (window.location.hash === "#import") {
    window.location.hash = "#search";
  }
};

const LegacyAppPublicNavBridge = () => {
  useEffect(() => {
    redirectPublicImportRoute();
    applyPublicNavBridge();

    const observer = new MutationObserver(() => {
      redirectPublicImportRoute();
      applyPublicNavBridge();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("hashchange", redirectPublicImportRoute);

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", redirectPublicImportRoute);
    };
  }, []);

  return null;
};

export default LegacyAppPublicNavBridge;
