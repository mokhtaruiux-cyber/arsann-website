/** Header navigation links. The items are clickable already; set the real destination here when it is ready (an internal path such as '/en/solutions' or a full URL).
 *  `null` = no page yet: the item still responds to hover, focus and click, but does not navigate. Labels live in src/content/scene01.ts (DICT.<lang>.nav). */
export const NAV_LINKS: Record<string, string | null> = {
  solutions: null,
  technology: null,
  projects: null,
  about: null,
  contact: null,
};
