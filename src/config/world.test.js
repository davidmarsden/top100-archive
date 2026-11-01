import { archiveWorldHref, getArchiveWorld, worldFromSlug, worldQuery } from "./world";

const at = (href) => window.history.replaceState(null, "", href);

test("the world comes from the address and falls back to Top 100", () => {
  at("/?world=regen#tables");
  expect(getArchiveWorld().name).toBe("Top 100 Regen");
  at("/?world=nonsense");
  expect(getArchiveWorld().slug).toBe("top-100");
  at("/");
  expect(getArchiveWorld().sheet).toBe(true);
  expect(worldFromSlug(undefined).slug).toBe("top-100");
});

test("switching world keeps the tab and drops the parameter for Top 100", () => {
  at("/?world=regen#honours");
  expect(archiveWorldHref("top-100")).toMatch(/\/#honours$/);
  at("/#tables");
  expect(archiveWorldHref("regen")).toMatch(/\/\?world=regen#tables$/);
  expect(worldQuery(worldFromSlug("regen"))).toBe("world=regen");
});
