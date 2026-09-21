#!/usr/bin/env node
/**
 * Converts the MDX posts in src/content/blog/ into an EmDash seed file at
 * seed/seed.json (collection schema, tag taxonomy, and every post as
 * Portable Text).
 *
 * The seed is bundled into the Worker by the EmDash integration: on a fresh
 * database the collections are created automatically, and the setup wizard's
 * "include content" option imports the posts. Locally, `astro dev` exposes
 * GET /_emdash/api/setup/dev-bypass?content=1 which does the same thing.
 *
 * Usage: node scripts/mdx-to-seed.mjs
 */
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { toString as mdastToString } from "mdast-util-to-string";
import { parse as parseYaml } from "yaml";

const ROOT = new URL("..", import.meta.url).pathname;
const POSTS_DIR = join(ROOT, "src/content/blog");
const OUT_FILE = join(ROOT, "seed/seed.json");

// --- Frontmatter -----------------------------------------------------------

function splitFrontmatter(source) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) throw new Error("Missing frontmatter");
  return { frontmatter: parseYaml(match[1]), body: source.slice(match[0].length) };
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-");
}

// --- Markdown -> Portable Text --------------------------------------------

/**
 * Per-post converter. Keys are deterministic (`<slug>-b<n>`) so re-running the
 * script produces a stable diff.
 */
function createConverter(slug) {
  const blocks = [];
  let blockIndex = 0;

  const nextBlockKey = () => `${slug}-b${blockIndex++}`;

  /** Flattens inline mdast nodes into Portable Text spans + markDefs. */
  function inline(nodes, blockKey) {
    const children = [];
    const markDefs = [];
    let spanIndex = 0;

    const push = (text, marks) => {
      if (!text) return;
      const last = children.at(-1);
      // Merge adjacent spans with identical marks to keep the output tidy.
      if (last && sameMarks(last.marks, marks)) {
        last.text += text;
        return;
      }
      children.push({
        _type: "span",
        _key: `${blockKey}-s${spanIndex++}`,
        text,
        marks: [...marks],
      });
    };

    const walk = (node, marks) => {
      switch (node.type) {
        case "text":
          // Soft line breaks inside hard-wrapped paragraphs become spaces.
          push(node.value.replace(/\r?\n/g, " "), marks);
          return;
        case "break":
          push("\n", marks);
          return;
        case "inlineCode":
          push(node.value, [...marks, "code"]);
          return;
        case "strong":
          node.children.forEach((c) => walk(c, [...marks, "strong"]));
          return;
        case "emphasis":
          node.children.forEach((c) => walk(c, [...marks, "em"]));
          return;
        case "delete":
          node.children.forEach((c) => walk(c, [...marks, "strike-through"]));
          return;
        case "link": {
          const key = `${blockKey}-l${markDefs.length}`;
          markDefs.push({ _type: "link", _key: key, href: node.url });
          node.children.forEach((c) => walk(c, [...marks, key]));
          return;
        }
        case "html":
          // Inline HTML inside a paragraph: keep the visible text only.
          return;
        case "image":
          push(node.alt ?? node.url, marks);
          return;
        default:
          if (node.children) node.children.forEach((c) => walk(c, marks));
          else if (node.value) push(node.value, marks);
      }
    };

    nodes.forEach((n) => walk(n, []));
    return { children, markDefs };
  }

  function textBlock(nodes, style, extra = {}) {
    const key = nextBlockKey();
    const { children, markDefs } = inline(nodes, key);
    blocks.push({ _type: "block", _key: key, style, markDefs, children, ...extra });
  }

  function list(node, level) {
    const listItem = node.ordered ? "number" : "bullet";
    for (const item of node.children) {
      for (const child of item.children) {
        if (child.type === "list") {
          list(child, level + 1);
        } else if (child.type === "paragraph") {
          textBlock(child.children, "normal", { listItem, level });
        } else {
          textBlock([{ type: "text", value: mdastToString(child) }], "normal", {
            listItem,
            level,
          });
        }
      }
    }
  }

  function html(node) {
    // Twitter embeds: the renderer strips <script> and the embedded <a> has
    // no text, so emit a blockquote linking to the tweet instead.
    const tweetUrl = /<blockquote class="twitter-tweet">[\s\S]*?href="([^"]+)"/.exec(node.value)?.[1];
    if (tweetUrl) {
      textBlock([{ type: "link", url: tweetUrl, children: [{ type: "text", value: tweetUrl }] }], "blockquote");
      return;
    }
    if (/^<script[\s>]/.test(node.value.trim())) return;
    blocks.push({ _type: "htmlBlock", _key: nextBlockKey(), html: node.value });
  }

  function block(node) {
    switch (node.type) {
      case "paragraph":
        textBlock(node.children, "normal");
        return;
      case "heading":
        textBlock(node.children, `h${node.depth}`);
        return;
      case "blockquote":
        // Portable Text has no nested blocks; each paragraph becomes its own
        // blockquote-styled block.
        for (const child of node.children) {
          if (child.type === "paragraph") textBlock(child.children, "blockquote");
          else block(child);
        }
        return;
      case "list":
        list(node, 1);
        return;
      case "code":
        blocks.push({
          _type: "code",
          _key: nextBlockKey(),
          code: node.value,
          ...(node.lang ? { language: node.lang } : {}),
        });
        return;
      case "html":
        html(node);
        return;
      case "thematicBreak":
        blocks.push({ _type: "break", _key: nextBlockKey() });
        return;
      default:
        throw new Error(`Unsupported block type "${node.type}" in ${slug}`);
    }
  }

  return {
    convert(markdown) {
      const tree = fromMarkdown(markdown, {
        extensions: [gfm()],
        mdastExtensions: [gfmFromMarkdown()],
      });
      tree.children.forEach(block);
      return blocks;
    },
  };
}

function sameMarks(a, b) {
  return a.length === b.length && a.every((m, i) => m === b[i]);
}

// --- Seed assembly ---------------------------------------------------------

async function main() {
  const files = (await readdir(POSTS_DIR)).filter((f) => f.endsWith(".mdx")).sort();
  const tags = new Map();
  const posts = [];

  for (const file of files) {
    const slug = basename(file, ".mdx");
    const { frontmatter, body } = splitFrontmatter(await readFile(join(POSTS_DIR, file), "utf8"));
    const date = frontmatter.date instanceof Date ? frontmatter.date : new Date(frontmatter.date);
    if (Number.isNaN(date.getTime())) throw new Error(`Invalid date in ${file}`);

    const tagSlugs = (frontmatter.tags ?? []).map((tag) => {
      const tagSlug = slugify(tag);
      tags.set(tagSlug, tag);
      return tagSlug;
    });

    posts.push({
      id: `post-${slug}`,
      slug,
      status: "published",
      data: {
        title: frontmatter.title,
        excerpt: frontmatter.excerpt ?? "",
        date: date.toISOString(),
        content: createConverter(slug).convert(body),
      },
      taxonomies: { tag: tagSlugs },
    });
  }

  // Oldest first so the admin's default ordering reads chronologically.
  posts.sort((a, b) => a.data.date.localeCompare(b.data.date));

  const seed = {
    $schema: "https://emdashcms.com/seed.schema.json",
    version: "1",
    defaultLocale: "en",
    meta: {
      name: "martinnormark.com",
      description: "Blog posts migrated from the MDX content collection",
      author: "Martin Høst Normark",
    },
    settings: {
      title: "Martin Høst Normark",
      tagline: "engineering the uncertain",
      url: "https://www.martinnormark.com",
    },
    collections: [
      {
        slug: "posts",
        label: "Posts",
        labelSingular: "Post",
        description: "Blog posts",
        supports: ["drafts", "revisions", "scheduling", "search", "seo"],
        urlPattern: "/blog/{slug}",
        routable: true,
        titleField: "title",
        dateField: "date",
        admin: { listColumns: ["date"] },
        fields: [
          { slug: "title", label: "Title", type: "string", required: true, searchable: true },
          {
            slug: "excerpt",
            label: "Excerpt",
            type: "text",
            searchable: true,
            options: { rows: 4 },
          },
          { slug: "date", label: "Date", type: "datetime", required: true, indexed: true },
          { slug: "content", label: "Content", type: "portableText", searchable: true },
        ],
      },
    ],
    taxonomies: [
      {
        name: "tag",
        label: "Tags",
        labelSingular: "Tag",
        hierarchical: false,
        collections: ["posts"],
        terms: [...tags]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([tagSlug, label]) => ({ slug: tagSlug, label })),
      },
    ],
    content: { posts },
  };

  await mkdir(join(ROOT, "seed"), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(seed, null, 2) + "\n");
  console.log(`Wrote ${posts.length} posts and ${tags.size} tags to seed/seed.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
