# The Reset

A free, static course for men who want to stop porn, quit gaming and the phone, leave alcohol, and build a disciplined life. Christian-rooted, plain, and open to anyone.

The public name is the `siteName` constant in `theme.config.ts`. Templates read `themeConfig.name`. Change that one string to rename the site.

This project was scaffolded with `npm create stardrive@latest` (Stardrive, by Jens Kuerschner). Pages are static HTML in `dist/`. There is no Workers adapter, no paid API, and no secrets.

The free check at `/check` is the one exception: a Pages Function at `functions/api/check.ts` can store anonymous answers in D1 (free tier). The quiz still shows the plan if that save fails. See [Cloudflare D1](#cloudflare-d1) below.

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

Sponsors live in `src/data/sponsors.json`. Each entry has a `tier`: `directory` (the `/sponsors` directory only), `affiliate` (directory plus the recommended link on course pages), or `premium` (those, plus the mobile strip and desktop side rails). Until a real sponsor exists, the entries are “Your brand here” and point at `/sponsor`. Links get `utm_medium=sponsor` and `utm_content` set to the placement (`directory`, `course-card`, `mobile-strip`, `rail-left`, or `rail-right`).

Starting prices and the Dodo Payments checkout URLs are `sponsorTiers` in `theme.config.ts`. Dollar amounts are shown only on `/sponsor`. `/advertise` redirects there. The price rises as traffic grows.

## Cloudflare D1

Anonymous self-check rows live in D1. The schema is `migrations/0001_check_responses.sql`. The binding is `DB` in `wrangler.jsonc`. `database_id` in that file is a placeholder, not a secret. Replace it before a production deploy.

```bash
npx wrangler d1 create the-reset-check
```

Copy the printed `database_id` into `wrangler.jsonc`, then apply the migration:

```bash
npx wrangler d1 migrations apply the-reset-check --local
npx wrangler d1 migrations apply the-reset-check --remote
```

Local Pages preview, with the function and a local database:

```bash
npm run build
npx wrangler d1 migrations apply the-reset-check --local
npx wrangler pages dev dist
```

No API token, mail key, or ad pixel belongs in the repo. Email addresses are stored only when someone types one. This version does not send mail.

## Cloudflare Pages

Static pages, plus the `/api/check` Function above. No environment variables and no secrets.

Create a Pages project and use these build settings:

| Setting                | Value                   |
| ---------------------- | ----------------------- |
| Framework preset       | Astro                   |
| Build command          | `npm run build`         |
| Build output directory | `dist`                  |
| Root directory         | `/`                     |
| Node.js version        | `22` (22.22.3 or newer) |
| Environment variables  | none                    |

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
