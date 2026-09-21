# martinnormark.com

Personal site and blog for Martin Høst Normark — built with [Astro](https://astro.build), MDX, Tailwind CSS, and React, with [EmDash CMS](https://emdashcms.com) for database-backed content, deployed to [Cloudflare Workers](https://workers.cloudflare.com).

Live at **[www.martinnormark.com](https://www.martinnormark.com)**.

## Tech stack

- **[Astro 7](https://astro.build)** in `server` output mode on the `@astrojs/cloudflare` adapter; the home page is prerendered, blog pages render on demand from EmDash
- **[EmDash CMS](https://docs.emdashcms.com)** for blog content — admin UI at `/_emdash/admin`, backed by Cloudflare D1 (content) and R2 (media)
- **Tailwind CSS 4** (`@tailwindcss/vite`) + `@tailwindcss/typography`, plus a shadcn/ui-style color system via CSS variables
- **React 19** for interactive islands, with shadcn/ui-style components
- **[rehype-pretty-code](https://rehype-pretty.pages.dev)** (github-dark theme) for syntax highlighting and **rehype-slug** for heading anchors
- **Cloudflare Workers** for hosting, via Wrangler

## Getting started

Requires Node `>=22.16.0` (see `.nvmrc`).

```sh
npm install
npx emdash secrets generate --write .env   # once; creates EMDASH_ENCRYPTION_KEY
npm run dev
```

The dev server runs at [localhost:4321](http://localhost:4321). It runs inside
`workerd` with local D1/R2 emulation (state in `.wrangler/state/`), so
`/_emdash/admin` works in dev too — the first visit opens the setup wizard.

## Commands

All commands are run from the root of the project:

| Command           | Action                                                   |
| :---------------- | :------------------------------------------------------- |
| `npm run dev`     | Start the local dev server at `localhost:4321`           |
| `npm run build`   | Type-check with `astro check`, then build to `./dist/`   |
| `npm run preview` | Build and run the production Worker locally with `wrangler dev` |
| `npm run deploy`  | Build and deploy to Cloudflare Workers                   |
| `npm run astro`   | Run Astro CLI commands like `astro add` or `astro check` |
| `npx emdash`      | EmDash CLI (`migrate`, `secrets`, `schema`, `content`, …) |

## Project structure

```text
/
├── public/                 # Static assets (avatar, favicon, etc.)
├── src/
│   ├── components/         # Astro + React components (incl. ui/ for shadcn-style)
│   ├── content/
│   │   └── blog/           # Legacy .mdx posts (migration source only)
│   ├── content.config.ts   # Legacy blog collection schema (unused by pages)
│   ├── live.config.ts      # EmDash live collection (getEmDashCollection/Entry)
│   ├── worker.ts           # Cloudflare Worker entry (Astro handler + EmDash cron)
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
├── scripts/mdx-to-seed.mjs  # Converts legacy MDX posts into seed/seed.json
├── seed/seed.json           # EmDash schema + migrated posts (bundled into the Worker)
├── emdash-env.d.ts          # Generated entry types for EmDash collections
├── astro.config.mjs         # Astro + MDX + markdown pipeline + EmDash config
└── wrangler.jsonc           # Cloudflare Workers config (domain, D1, R2, cron)
```

## Writing posts

Posts are written in the EmDash admin (`/_emdash/admin` → Posts). The `posts`
collection has `title`, `excerpt`, `date` (drives ordering and the displayed
date), and a Portable Text `content` body; tags come from the `tag` taxonomy.
Publish to make a post appear at `/blog/<slug>`.

## EmDash CMS

Blog posts live in EmDash (the `posts` collection, tagged via the `tag`
taxonomy). `src/pages/blog/` queries them with `getEmDashCollection()` /
`getEmDashEntry()` from `emdash` and renders bodies with `<PortableText>` (see
[Querying Content](https://docs.emdashcms.com/guides/querying-content/)).
Entry types come from `emdash-env.d.ts`, which EmDash regenerates from the
schema on dev-server start — commit it when the schema changes.

- Admin: `/_emdash/admin`. The first visit runs the setup wizard and creates the
  first admin account with a passkey. **Tick "include content"** in the wizard:
  that imports `seed/seed.json` (see below).
- `seed/seed.json` holds the collection schema, tags, and the migrated posts.
  It is bundled into the Worker; on a fresh database EmDash creates the
  collections automatically and the wizard imports the content. Regenerate it
  from the legacy MDX files with `node scripts/mdx-to-seed.mjs`; validate with
  `npx emdash seed seed/seed.json --validate`.
- Local content: with `npm run dev` running, open
  `http://localhost:4321/_emdash/api/setup/dev-bypass?content=1` once to import
  the seed and create a dev admin (`.wrangler/state/` holds the local D1; delete
  `.wrangler/state/v3/d1` to start fresh).
- Code blocks render through `src/components/CodeBlock.astro` (no syntax
  highlighting yet — the MDX pipeline's rehype-pretty-code does not apply to
  EmDash content).
- `src/content/blog/*.mdx` and `src/content.config.ts` are the migration
  source and are no longer read by any page; remove them once the content is
  verified live.
- Database: Cloudflare D1, binding `DB`. Media: R2, binding `MEDIA`. Both are
  declared in `wrangler.jsonc`; the binding names must not change.
- Core database migrations run automatically on the first request after a
  deploy (`migrations.runtime: "auto"`), and in dev/build against the local D1.
  To inspect or apply them against production D1 explicitly:
  `npx emdash migrate --status --account-id <id> --d1 martinnormark-com-emdash`.
- The cron trigger in `wrangler.jsonc` drives scheduled publishing via
  `src/worker.ts`.

## Deployment

The site is built and deployed as the Cloudflare Worker `martinnormark-com`,
served only on `www.martinnormark.com` (`workers_dev` is off so admin passkeys
can only be registered against the real origin):

```sh
npm run deploy
```

Resources (all in `wrangler.jsonc`): D1 `martinnormark-com-emdash`, R2
`martinnormark-com-media`, KV `martinnormark-com-session` (Astro sessions,
provisioned by the adapter), an `IMAGES` binding, and a cron every 10 minutes
for EmDash scheduled publishing. The `EMDASH_ENCRYPTION_KEY` secret must match the
local `.env` value — never rotate it once content exists
(`npx wrangler secret put EMDASH_ENCRYPTION_KEY`).

Until the setup wizard has been completed, EmDash redirects every on-demand
page (including `/blog`) to `/_emdash/admin/setup`; prerendered pages such as
`/` still serve.

Configuration lives in `wrangler.jsonc`; the Astro adapter emits the final
Worker config to `dist/server/wrangler.json` at build time.
