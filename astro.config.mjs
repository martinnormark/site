// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { unified } from "@astrojs/markdown-remark";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";

// https://astro.build/config
export default defineConfig({
  site: "https://www.martinnormark.com",
  output: "static",

  // Removed Cloudflare adapter to generate a static site for Pages

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

  integrations: [react(), mdx()],
});
