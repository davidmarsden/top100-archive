// The archive covers two game worlds. Top 100's history comes from the Full
// History sheet (plus the live season from Sync); Top 100 Regen has no sheet,
// so every season comes from Sync (Game World History tables and the live table).
// The world is chosen in the address (?world=regen), so links can be shared.

export const ARCHIVE_WORLDS = [
  { slug: "top-100", name: "Top 100", sheet: true },
  { slug: "regen", name: "Top 100 Regen", sheet: false },
];

export const worldFromSlug = (slug) => ARCHIVE_WORLDS.find((world) => world.slug === slug) || ARCHIVE_WORLDS[0];

export const getArchiveWorld = () => {
  try {
    return worldFromSlug(new URLSearchParams(window.location.search).get("world"));
  } catch {
    return ARCHIVE_WORLDS[0];
  }
};

// The address for the same page in another world (the tab hash is kept).
export const archiveWorldHref = (slug) => {
  const url = new URL(window.location.href);
  if (worldFromSlug(slug).slug === ARCHIVE_WORLDS[0].slug) url.searchParams.delete("world");
  else url.searchParams.set("world", slug);
  return url.toString();
};

// Query string for the Netlify functions that read Sync data.
export const worldQuery = (world = getArchiveWorld()) => `world=${encodeURIComponent(world.slug)}`;
