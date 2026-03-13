# Build & Developer Tooling Improvements

Scope: observations and suggested updates for build/developer tooling. No code changes are made here; this is a tracking doc.

## High Priority

- **README vs reality drift**
  The README claims “Gulpfile.js removed” but `gulpfile.js` exists and is used.
  Action:
  - Update README to reflect current build commands and Gulp usage.
  - Add a clear “Supported build flow” section (Gulp vs CLI).
  Sub-todo:
  - Remove `gulpfile.js` from repo and remove README references to gulpfile and gulp docs.

- **`/config/config.js` path assumption**
  Many CLI flows assume a project-level `config/config.js`. Add a documented “first-run” step or a guard that creates it if missing.
  Action:
  - Document `th3 set-config` and expected config layout.
  - Add a helpful error message if missing.
  Sub-todo:
  - Auto-create `config/config.js` from default config on first run and log where it was created.

## Medium Priority

- **Semantic-release branch config**
  `.releaserc.js` only lists `main` and `next`. If release should happen from `development` or `dev/feature`, add them explicitly.
  Action:
  - Align release branches with your actual git flow.

- **Test entry points**
  `npm test` only runs `test/builder-fix.test.js`. There are other test files present.
  Action:
  - Decide on a test runner or aggregate script.
  - Create `test:all` (node script) or add a minimal harness.

- **Gulp task discoverability**
  Gulp tasks are not documented in a single place and naming is inconsistent (`keyJS`, `KeyCSS`).
  Action:
  - Add a `gulp --tasks` section to docs.
  - Normalize naming casing and add short aliases.

- **Local dev server entry**
  No `dev` or `build` script in `package.json` for common workflows.
  Action:
  - Add `scripts` for `build`, `watch`, and `builder` that map to CLI or gulp.

## Low Priority

- **Commitlint / Commitizen**
  Config exists, but README doesn’t document usage.
  Action:
  - Add “commit workflow” section (optional).

- **Docs location**
  `docs/` contains multiple assets but no index for dev tooling.
  Action:
  - Add `docs/dev-tooling.md` or consolidate notes.

## Notes

- `gulpfile.js` is active and still contains core build tasks.
- The CLI is used as the primary interface (`th3`), but README implies older/removed Gulp flow.
