<!-- Scope: living checklist for project mode. Created manually after initial setup; the site was already configured. -->

# Plan — Call to Reset

## Open

_(none)_

## Done

- Repository initialized in `project` mode (`STARDRIVE_AGENT_MODE.md`).
- [x] Sponsor logo keeps its colors in dark mode (removed the global `invert(1)` filter in `src/styles/course.css`).
- [x] The Harvest sponsor renders only in the right desktop rail (optional `placements` array in `src/data/sponsors.json`, honored by `src/utils/sponsors.ts`); the "Your brand here" card stays on both rails.

## Notes

- Sponsors are data-driven: `src/data/sponsors.json` + `src/utils/sponsors.ts`. A per-sponsor `placements` array restricts where a sponsor renders (default: all placements its tier allows).
