// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";

// https://astro.build/config
export default defineConfig({
  site: "https://www.martinnormark.com",
  output: "server",

  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),

  integrations: [
    tailwind(),
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
