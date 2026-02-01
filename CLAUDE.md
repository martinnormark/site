# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server at localhost:4321
npm run build      # Type-check with astro check, then build to ./dist/
npm run preview    # Build and preview with wrangler pages dev
npm run deploy     # Build and deploy to Cloudflare Pages
```

## Architecture

Personal blog site built with Astro (static output mode) + MDX + Tailwind CSS + React.

**Content Collection**: Blog posts in `src/content/blog/` as MDX files. Schema in `src/content/config.ts` defines frontmatter:
- Standard posts: title, author, tags, date, excerpt, optional cover image
- Link posts: `type: "link"` with required `externalUrl` for external article commentary

**Key Files**:
- `src/layouts/Layout.astro` - Base layout with header/footer
- `src/pages/blog/[slug].astro` - Dynamic blog post rendering with cover images and link post handling
- `src/pages/blog/index.astro` - Blog listing page
- `astro.config.mjs` - MDX configured with rehype-pretty-code (github-dark theme) and rehype-slug

**Styling**: Tailwind with @tailwindcss/typography for prose, shadcn/ui color system via CSS variables.

## Previewing Changes

Use Playwright MCP server to see visual changes when editing posts or templates.
