# The Reset

A free, static course for men who want to stop porn, quit gaming and the phone, leave alcohol, and build a disciplined life. Christian-rooted, plain, and open to anyone.

The public name is the `siteName` constant in `theme.config.ts`. Templates read `themeConfig.name`. Change that one string to rename the site.

This project was scaffolded with `npm create stardrive@latest` (Stardrive, by Jens Kuerschner). Output is fully static HTML in `dist/`. There is no Workers adapter, no paid API, and no secrets.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

Node.js 22.22.3 or newer matches the Stardrive engine field. The build writes a static site to `dist/`.

## Add a lesson

Lessons are Markdown in `src/content/lessons/`. Tracks are Markdown in `src/content/tracks/`.

1. Copy an existing lesson file.
2. Set `track` to the track id (the track filename, without `.md`).
3. Set `order`, `title`, `description`, and `targetQuery`. Put the query near the front of the title and in the description.
4. Include `keyPoints`, `scripture` (`reference` and `text`), `action`, and `reflection`.
5. Optional `inspiredBy` with a real `label` and `url`.
6. Keep the body a 5–10 minute read. Answer the query in the first sentences.
7. Link to at least two other lessons or tracks.
8. Run `npm run build`.

Mark a track `status: coming-soon` until it has lessons. Available tracks use `status: available`.

Sponsors live in `src/data/sponsors.json`. Until a real sponsor exists, the entries are “Your brand here – Advertise” and point at `/advertise`. Links get `utm_medium=sponsor` and `utm_content` set to the placement (`mobile-strip`, `rail-left`, `rail-right`, or `course-card`).

The advertise price and the Book a spot URL are `advertise.priceMonthly` and `advertise.bookingUrl` in `theme.config.ts`. The booking URL is a placeholder (`https://example.com/book-a-spot`) until a real checkout exists.

## Cloudflare Pages

Static hosting. No environment variables and no secrets.

Create a Pages project and use these build settings:

| Setting | Value |
| --- | --- |
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |
| Node.js version | `22` (22.22.3 or newer) |
| Environment variables | none |

`wrangler.jsonc` sets `pages_build_output_dir` to `./dist` for Wrangler Pages deploys:

```bash
npm run build
npx wrangler pages deploy dist --project-name the-reset
```

Change `themeConfig.site` before launch so canonical URLs, the sitemap, and RSS use the real origin. The placeholder origin is `https://the-reset.pages.dev`.

In the Cloudflare dashboard, disable Speed Brain (Speed → Optimization → Speed Brain). Astro prefetch and Speed Brain can double-fetch.

The file `public/the-reset-indexnow-placeholder.txt` is an IndexNow key placeholder. Replace the key and the filename with a real IndexNow key before you submit URLs. The file body must be the key.

`public/_headers` sends a `Link` header pointing at `/llms.txt`. `public/_redirects` sends `/sitemap` and `/sitemap.xml` to `/sitemap-index.xml`.

## SEO files the build emits

- `/sitemap-index.xml` and the sitemap parts
- `/robots.txt`
- Canonical URLs on each page
- `/llms.txt` (generated in `postbuild`)
- `/rss.xml`
- Course, Article, FAQ, and Breadcrumb JSON-LD
- `public/the-reset-indexnow-placeholder.txt`
