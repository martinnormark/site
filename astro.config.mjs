// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { unified } from "@astrojs/markdown-remark";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import emdash from "emdash/astro";
import { d1, r2 } from "@emdash-cms/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: "https://www.martinnormark.com",

  // EmDash needs a server runtime for the admin UI and content API. The
  // existing MDX pages opt back into static output with `export const
  // prerender = true`, so they are still built ahead of time.
  output: "server",
  adapter: cloudflare(),

  vite: {
    plugins: [tailwindcss()],
  },

  markdown: {
    // Disable Astro's built-in highlighter so rehype-pretty-code owns it
    syntaxHighlight: false,
    // Astro 7 defaults to the native Sätteri pipeline, which does not run
    // remark/rehype plugins. Use the unified() processor from
    // @astrojs/markdown-remark to keep the remark/rehype pipeline. MDX
    // inherits this top-level markdown config automatically.
    processor: unified({
      rehypePlugins: [
        /**
         * Adds ids to headings
         */
        rehypeSlug,
        [
          /**
           * Enhances code blocks with syntax highlighting, line numbers,
           * titles, and allows highlighting specific lines and words
           */
          rehypePrettyCode,
          {
            theme: "github-dark",
          },
        ],
      ],
    }),
  },

  integrations: [
    react(),
    mdx(),
    emdash({
      // Binding names must match wrangler.jsonc (DB, MEDIA).
      database: d1({ binding: "DB" }),
      storage: r2({ binding: "MEDIA" }),
    }),
  ],
});
