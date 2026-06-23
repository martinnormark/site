import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/blog" }),
  schema: ({ image }) =>
    z
      .object({
        author: z.string().default("Martin Høst Normark"),
        title: z.string(),
        tags: z.array(z.string()),
        cover: image().optional(),
        date: z.coerce.date(),
        excerpt: z.string(),
        type: z.enum(["post", "link"]).default("post"),
        externalUrl: z.url().optional(),
      })
      .superRefine((data, ctx) => {
        if (data.type === "link" && !data.externalUrl) {
          ctx.addIssue({
            code: "custom",
            message: "externalUrl is required when type is 'link'",
            path: ["externalUrl"],
          });
        }
      }),
});

export const collections = { blog };
