import { defineLiveCollection } from "astro:content";
import { emdashLoader } from "emdash/runtime";

// Registers the live collection that backs getEmDashCollection() /
// getEmDashEntry(). File-based collections stay in src/content.config.ts.
export const collections = {
  _emdash: defineLiveCollection({ loader: emdashLoader() }),
};
