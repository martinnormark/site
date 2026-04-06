// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";

// https://astro.build/config
export default defineConfig({
  site: "https://www.martinnormark.com",
  output: "static",

  // Removed Cloudflare adapter to generate a static site for Pages

  integrations: [
    react(),
    mdx({
      syntaxHighlight: false,
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
  ],
});
