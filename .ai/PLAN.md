# PLAN - Call to Reset

Living checklist for `project` mode (see [`CONFIG_GUIDE.md`](./CONFIG_GUIDE.md)).
The `STARDRIVE_AGENT_MODE.md` marker file was missing on this checkout, so it was
re-created with the value `project`. The configuration below was already in place
and has been verified against the current source, not re-applied.

## Configuration status

- [x] 1. Trim demo content - repository was created via `npm create stardrive` (no `TRIMMING_GUIDE.md` present).
- [x] 2. `package.json` - name `the-reset`, description set, `stardriveVersion` pinned.
- [x] 3. `README.md` - project name set as headline.
- [ ] 4. Favicons - see [`FAVICON_GUIDE.md`](./FAVICON_GUIDE.md); `public/logo/ctr-logo.png` is wired up, manifest generation is on.
- [ ] 5. Social fallback images - `og.png`, `x.png`, `structured-preview.png` in `./public/images/` still need a final project-specific pass.
- [x] 6. `theme.config.ts` - site URL, primary color, single locale (`en`), promo slots, `llms` intro, sponsor tiers, community/grow URLs.
- [x] 7. Webfonts - Inter + Ancizar Serif + Azeret Mono via fontsource, imported in `./src/layouts/default.astro`.
- [x] 8. `./src/styles/tailwind.config.css` - branding and utility colors.
- [x] 9. CSS layering - `global.css` base, `course.css` and `aureum.css` per-surface files, scoped styles in components.
- [x] 10. Languages pruned - `en` only; no `./src/pages/[lang]`.
- [ ] 11. Open Graph / X meta - review `./src/components/head/ogx.astro` once the social fallback images are final.
- [x] 12. Page structure - `./src/pages/` holds `index`, `check`, `plan`, `tracks`, `sponsor(s)`, `about`, `privacy`, `legal-notice`, 404s.
- [x] 13. Rendering mode - static SSG, `onDemandRenderedCollections: []`.
- [x] 14. Navigation - `./src/components/layout/nav`.
- [x] 15. Layout - `./src/layouts/default.astro` + `./src/components/layout`.
- [x] 16. i18n strings - `./src/i18n/en.json`.
- [x] 17. Map data - demo `office.pmtiles` already removed; `./public/map/` is empty and no map feature is wired up.
- [x] 18. Images - project art lives in `./public/aureum/`.
- [x] 19. Validate - `npm run check`.
- [x] 20. Agent Skills - `./public/.well-known/` does not exist, so the boilerplate skill is already gone.
- [x] 21. Cloudflare files - `public/_headers`, `public/_redirects`.
- [x] 22. Deployment - `wrangler.jsonc` configured for Cloudflare Workers.

## Open items

- Social fallback images (`og.png`, `x.png`, `structured-preview.png`) still show the boilerplate art.
- Decide whether the demo map (`./public/map/office.pmtiles`) is dropped or replaced.
- Review `./public/.well-known/agent-skills` and update digests in `index.json` after any change.

## Done - sponsor pass

- [x] Sponsor logo keeps its colors in dark mode (removed the global `invert(1)` filter in `src/styles/course.css`).
- [x] The Harvest sponsor renders only in the right desktop rail (optional `placements` array in `src/data/sponsors.json`, honored by `src/utils/sponsors.ts`); the "Your brand here" card stays on both rails. Without `placements`, a sponsor appears in every placement its tier allows.
