# Call to Reset

A free, static course for anyone breaking free from addiction — porn, gaming, the phone, alcohol, substances, or another habit — and building discipline and initiative. Christian-rooted, plain, and open to anyone.

The public name is the `siteName` constant in `theme.config.ts`. Templates read `themeConfig.name`. Change that one string to rename the site.

This project was scaffolded with `npm create stardrive@latest` (Stardrive, by Jens Kuerschner). Pages are static HTML in `dist/`. There is no Workers adapter and no ad pixel.

The free check at `/check` is the exception: a Pages Function at `functions/api/check.ts` can store anonymous answers in D1 (free tier) and, when someone opts in with an email, send the 30-day plan through Plunk. The quiz still shows the plan if that save or send fails. See [Cloudflare D1](#cloudflare-d1) below.

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
5. Keep the body a 5–10 minute read. Answer the query in the first sentences.
6. Link to at least two other lessons or tracks.
7. Run `npm run build`.

Mark a track `status: coming-soon` until it has lessons. Available tracks use `status: available`.

Sponsors live in `src/data/sponsors.json`. Each entry has a `tier`: `directory` (the `/sponsors` directory only) or `premium` (the directory, plus the top slot on phones and both side rails on desktop). The Harvest is the premium sponsor and only renders in the placements listed in its optional `placements` array (`directory`, `mobile-strip`, `rail-right`), so it sits in the right rail only. Without `placements`, a sponsor appears in every placement its tier allows — the “Your brand here” card uses that and stays under The Harvest on the right and alone on the left rail. One “Your brand here” card points at `/sponsor`. Sponsor logos keep their own colors in both themes (never inverted). Links get `utm_medium=sponsor` and `utm_content` set to the placement (`directory`, `mobile-strip`, `rail-left`, or `rail-right`). Dollar amounts stay on `/sponsor` only. There are two monthly tiers: $100 for a directory listing, and $200 for the directory plus those side slots. Sponsors cancel themselves on Dodo's static customer portal (`sponsorPortalUrl` in `theme.config.ts`). That page emails a sign-in link to the address they paid with. No Dodo API key is required for that link. Help mail goes to `support@calltoreset.site`.

Starting prices and the Dodo Payments checkout URLs are `sponsorTiers` in `theme.config.ts`. Dollar amounts are shown only on `/sponsor`. `/advertise` redirects there. The price rises as traffic grows.

## Cloudflare D1

Anonymous self-check rows live in D1. The schema is `migrations/0001_check_responses.sql`. Plan-gate emails live in `migrations/0002_plan_emails.sql`. Newsletter emails live in `migrations/0003_newsletter_subscribers.sql`. The binding is `DB` in `wrangler.jsonc`. `database_id` in that file is the production database. It is not a secret. Apply `0002` before the plan form can store an address. Apply `0003` before the newsletter form can store an address.

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

No API token or ad pixel belongs in the repo. Email addresses are stored only when someone types one. If they do, `functions/email/send-plan.ts` posts the plan to Plunk (`POST /v1/send`) using the Pages secret `PLUNK_API_KEY`. Set that secret in Cloudflare. Do not commit it. The sender is `plan@calltoreset.site` and that domain has to be verified in Plunk before mail will deliver. If the key is missing or Plunk rejects the message, the page says so. Days 1 to 7 stay on the page. The PDF is not linked until the send succeeds. The check uses `/api/check`. The phase gate uses `/api/plan`. The newsletter form uses `/api/newsletter`, which stores the address and adds a Plunk contact with `subscribed` set to true. It does not send a message. `/support` asks `POST /api/support-checkout` to open an embedded Dodo checkout. That function uses the Pages secret `DODO_API_KEY` and allows only the four support product ids. Do not commit the key.

## Cloudflare Pages

Static pages, plus the `/api/check`, `/api/plan`, `/api/newsletter`, and `/api/support-checkout` Functions. The Pages secrets are `PLUNK_API_KEY` and `DODO_API_KEY`, set in the Cloudflare dashboard, not in the repo.

Create a Pages project and use these build settings:

| Setting                | Value                                           |
| ---------------------- | ----------------------------------------------- |
| Framework preset       | Astro                                           |
| Build command          | `npm run build`                                 |
| Build output directory | `dist`                                          |
| Root directory         | `/`                                             |
| Node.js version        | `22` (22.22.3 or newer)                         |
| Environment variables  | `PLUNK_API_KEY`, `DODO_API_KEY` (Pages secrets) |

`wrangler.jsonc` sets `pages_build_output_dir` to `./dist` for Wrangler Pages deploys:

```bash
npm run build
npx wrangler pages deploy dist --project-name the-reset
```

The production origin is `https://calltoreset.site`, set as `themeConfig.site`. Canonical URLs, the sitemap, robots.txt, RSS, llms.txt, and JSON-LD use that origin.

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
