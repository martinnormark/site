# martinnormark.com

Personal site and blog for Martin Høst Normark — built with [Astro](https://astro.build), MDX, Tailwind CSS, and React, deployed as a static site to [Cloudflare Pages](https://pages.cloudflare.com).

Live at **[www.martinnormark.com](https://www.martinnormark.com)**.

## Tech stack

- **[Astro 7](https://astro.build)** in `static` output mode
- **MDX** for blog content, with a typed content collection
- **Tailwind CSS 4** (`@tailwindcss/vite`) + `@tailwindcss/typography`, plus a shadcn/ui-style color system via CSS variables
- **React 19** for interactive islands, with shadcn/ui-style components
- **[rehype-pretty-code](https://rehype-pretty.pages.dev)** (github-dark theme) for syntax highlighting and **rehype-slug** for heading anchors
- **Cloudflare Pages** for hosting, via Wrangler

## Getting started

Requires Node `>=22.12.0` (see `.nvmrc`).

```sh
npm install
npm run dev
```

The dev server runs at [localhost:4321](http://localhost:4321).

## Commands

All commands are run from the root of the project:

| Command           | Action                                                   |
| :---------------- | :------------------------------------------------------- |
| `npm run dev`     | Start the local dev server at `localhost:4321`           |
| `npm run build`   | Type-check with `astro check`, then build to `./dist/`   |
| `npm run preview` | Build and preview locally with `wrangler pages dev`      |
| `npm run deploy`  | Build and deploy to Cloudflare Pages                     |
| `npm run astro`   | Run Astro CLI commands like `astro add` or `astro check` |

## Project structure

```text
/
├── public/                 # Static assets (avatar, favicon, etc.)
├── src/
│   ├── components/         # Astro + React components (incl. ui/ for shadcn-style)
│   ├── content/
│   │   └── blog/           # Blog posts as .mdx files
│   ├── content.config.ts   # Blog content collection schema
│   ├── layouts/
│   │   └── Layout.astro     # Base layout with header/footer
│   ├── pages/
│   │   ├── index.astro      # Home page
│   │   ├── 404.astro
│   │   └── blog/
│   │       ├── index.astro  # Blog listing
│   │       └── [slug].astro # Dynamic post rendering
│   ├── lib/                 # Shared utilities
│   └── styles/              # Global styles
├── astro.config.mjs         # Astro + MDX + markdown pipeline config
└── wrangler.toml            # Cloudflare Pages config
```

## Writing posts

Posts live in `src/content/blog/` as `.mdx` files. Frontmatter is validated by the
schema in `src/content.config.ts`:

```yaml
---
title: "Post title"
date: 2026-06-23
excerpt: "Short summary used in listings and metadata."
tags: [tag-one, tag-two]
author: "Martin Høst Normark"   # optional, defaults to this
cover: ./cover.png              # optional cover image
---
```

There are two kinds of posts:

- **Standard posts** (`type: "post"`, the default) — regular articles.
- **Link posts** (`type: "link"`) — commentary on an external article. These
  require an `externalUrl` field.

```yaml
---
title: "Commentary on something elsewhere"
date: 2026-06-23
excerpt: "Why this external piece is worth reading."
tags: [links]
type: "link"
externalUrl: "https://example.com/article"
---
```

## Deployment

The site is statically built and deployed to Cloudflare Pages:

```sh
npm run deploy
```

Configuration lives in `wrangler.toml`.
