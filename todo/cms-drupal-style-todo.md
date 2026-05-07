# CMS Drupal-Style TODO

This checklist tracks the implementation work needed to align Theme 3 Builder with the Drupal-style direction documented in:

- `docs/cms-design-system-workflow.md`
- `docs/cms-drupal-style-change-map.md`
- `docs/cms-ui-design.md`
- `docs/cms-usage-guide.md`

Last reviewed: 2026-05-08.

## Goal

Make Theme 3 CMS feel like a theme-based site builder with Drupal-style layout sections, regions, blocks, Views-style displays, page templates, and a portable active theme folder.

The center of the product should be:

- layout sections and named regions
- block placement into regions
- reusable components and block config
- Views-style listing/detail displays
- page templates with route/content-type mapping
- active theme folders under `themes/<theme-name>/`

Content, media, forms, publishing, and APIs support this workflow, but they should not replace the theme/block/View model.

## Current Baseline

- [x] Builder has region-aware block placement in `_builder/client/app.js`.
- [x] Builder layout export includes grouped `regions` data.
- [x] Builder backend can flatten region-based layout data.
- [x] Builder has page template records and `/api/templates`.
- [x] CMS has collections, entries, media, forms, submissions, theme manager, and publish UI.
- [x] `th3 theme export` generates a portable `themes/<theme-name>/` package.
- [x] `themes/theme-3/` already contains `theme.json`, `layouts`, `pages`, `regions`, `templates`, `partials`, `components`, `assets`, `data/fallback`, and `bindings`.
- [ ] Views-style displays are not implemented.
- [ ] CMS admin Templates screen is still a placeholder.
- [x] Active theme folder is now the source of truth for CMS validation and builder scans.
- [ ] Region IDs are inconsistent between hyphenated and underscored forms.
- [x] Runtime page generation composes builder pages through active theme page and region templates.

## Phase 1 - Region Contract Stabilization

Goal: make the existing region/block system stable before adding Views.

- [x] Choose the canonical external region ID format.
  - Recommendation: use hyphenated IDs such as `side-navigation`, `content-above`, and `content-below`.
- [x] Keep underscore aliases for backward compatibility:
  - `side_nav`
  - `content_above`
  - `content_below`
- [x] Normalize saved builder layouts to canonical region IDs.
- [x] Normalize builder template records to canonical region IDs.
- [x] Normalize theme export metadata to canonical region IDs.
- [x] Normalize binding records to canonical region IDs.
- [x] Update region validation to accept aliases but emit canonical IDs.
- [x] Add tests for alias migration and canonical export.

Likely files:

- `_builder/client/app.js`
- `func/gulp/classes/BuilderTask.js`
- `func/gulp/classes/builder-backend/services/layouts.service.js`
- `func/gulp/classes/builder-backend/utils/validation.js`
- `theme-cms/server/services/cms.service.js`
- `test/builder-fix.test.js`

## Phase 2 - Templates Admin

Goal: replace the placeholder CMS Templates screen with usable template management.

- [x] Replace the `Templates` placeholder view in `theme-cms/admin/index.html`.
- [x] Add a template list table with:
  - template name
  - route pattern
  - content type
  - layout ID
  - region count
  - validation status
  - actions
- [x] Add create/edit/delete flows for page templates.
- [x] Add template fields:
  - template ID
  - label
  - description
  - route pattern
  - content type
  - layout ID
  - locked regions
- [x] Add region default block editing or handoff to builder.
- [x] Add template preview with selected CMS entry.
- [x] Surface validation errors and warnings from the backend.
- [x] Decide final ownership split:
  - CMS owns route/content-type mapping and active theme validation.
  - Builder owns visual region/block defaults and preview.

Likely files:

- `theme-cms/admin/index.html`
- `theme-cms/admin/app.js`
- `theme-cms/admin/styles.css`
- `_builder/client/app.js`
- `func/gulp/classes/BuilderTask.js`

## Phase 3 - Views Data Model And APIs

Goal: persist Views and expose APIs before wiring the UI.

- [x] Add `cms_views` table.
- [x] Add schema fields:
  - view ID
  - label
  - description
  - collection
  - query JSON
  - displays JSON
  - created at
  - updated at
- [x] Add View normalization and validation helpers.
- [x] Add `GET /api/cms/views`.
- [x] Add `GET /api/cms/views/:viewId`.
- [x] Add `POST /api/cms/views`.
- [x] Add `PUT /api/cms/views/:viewId`.
- [x] Add `DELETE /api/cms/views/:viewId`.
- [x] Add View preview endpoint.
- [x] Validate View references:
  - collection exists
  - fields exist
  - sort fields exist
  - display IDs are unique
  - page display routes do not conflict
  - component paths exist where possible
- [x] Add tests for View CRUD and validation.

Likely files:

- `theme-cms/server/repositories/cms.repository.js`
- `theme-cms/server/services/cms.service.js`
- `theme-cms/server/controllers/cms.controller.js`
- `theme-cms/server/routes/cms.routes.js`
- `theme-cms/server/utils/cms-utils.js`

## Phase 4 - Views Export And Theme Contract

Goal: make Views part of the portable theme package.

- [x] Add `views/` to generated theme export directories.
- [x] Write one View JSON file per View under `themes/<theme-name>/views/`.
- [x] Add `views` metadata to `theme.json`.
- [x] Add View counts to validation totals.
- [x] Add View validation issues to theme validation.
- [x] Update generated README to mention `views/`.
- [x] Add CLI output for exported View count.
- [x] Add publish checklist item for View validity.

Likely files:

- `theme-cms/server/services/cms.service.js`
- `bin/cli.js`
- `theme-cms/admin/app.js`

## Phase 5 - Views UI In CMS Admin

Goal: let users create Views without editing raw JSON.

- [x] Add `Views` to CMS sidebar navigation.
- [x] Add Views list screen.
- [x] Add View editor screen.
- [x] Add query controls:
  - collection selector
  - status filter
  - field filters
  - sort controls
  - limit
  - pagination toggle
- [x] Add display controls:
  - block display
  - page display
  - route for page display
  - layout/template selection
  - row component
  - empty component
- [x] Add View preview panel.
- [x] Add empty, loading, success, and error states.
- [x] Add validation messages for missing collections, fields, routes, and components.

Likely files:

- `theme-cms/admin/index.html`
- `theme-cms/admin/app.js`
- `theme-cms/admin/styles.css`

## Phase 6 - Builder View Blocks

Goal: allow Views to be placed as blocks into layout regions.

- [x] Add builder read API for Views.
- [x] Add View display picker in builder.
- [x] Add `type: "view"` block records.
- [x] Save View block fields:
  - instance ID
  - type
  - view ID
  - display ID
  - region
  - order
  - config
  - visibility
- [x] Add View-specific properties panel controls.
- [x] Render View previews from exported CMS data or live CMS data.
- [x] Support static fallback when View data is unavailable.
- [x] Validate View blocks against allowed regions and display type.
- [x] Ensure View blocks save inside the grouped `regions` layout model.

Likely files:

- `_builder/client/app.js`
- `_builder/client/styles.css`
- `_builder/client/modules/api-client.js`
- `func/gulp/classes/BuilderTask.js`
- `func/gulp/classes/builder-backend/utils/validation.js`

## Phase 7 - Active Theme Source Of Truth

Goal: treat `themes/<theme-name>/` as the active theme contract, not only an export artifact.

- [x] Add active theme path settings.
- [x] Read active theme metadata from `themes/<theme-name>/theme.json`.
- [x] Let CMS theme validation inspect the active theme folder.
- [x] Let builder scan active theme partials before legacy `html/partials`.
- [x] Let builder scan active theme components before legacy component paths.
- [x] Keep `html/` as builder output or compatibility bridge only.
- [x] Document the rule for when files live in `html/` versus `themes/`.

Likely files:

- `theme-cms/server/config.js`
- `theme-cms/server/services/cms.service.js`
- `theme-cms/admin/app.js`
- `func/gulp/classes/BuilderTask.js`
- `func/gulp/classes/builder-backend/services/partials.service.js`
- `_builder/client/modules/api-client.js`

## Phase 8 - Theme Runtime Region Composition

Goal: generate pages through theme templates and region templates instead of flat block concatenation.

- [x] Load the active theme page template.
- [x] Render each named region through `templates/regions/<region>.html`.
- [x] Inject ordered component blocks into matching regions.
- [x] Inject View blocks into matching regions.
- [x] Preserve static fallback rendering.
- [ ] Support page templates as route owners.
- [ ] Support View page displays as route owners.
- [x] Add tests for region-template page generation.

Likely files:

- `func/gulp/classes/builder-backend/services/layouts.service.js`
- `func/gulp/classes/BuilderTask.js`
- `theme-cms/server/services/cms.service.js`
- `themes/theme-3/templates/page.html`
- `themes/theme-3/templates/regions/*.html`

## Phase 9 - Verification And Tests

- [ ] Run existing tests with `npm test`.
- [ ] Add tests for region ID alias normalization.
- [ ] Add tests for View CRUD.
- [ ] Add tests for View validation.
- [x] Add tests for theme export with `views/`.
- [x] Add tests for `theme.json.views`.
- [ ] Add tests for builder View block save/load.
- [ ] Add tests for View block preview fallback.
- [x] Add tests for page generation through region templates.

## First Practical Implementation Order

1. Region ID normalization tests and fixes.
2. CMS admin Templates screen using the existing template backend.
3. Minimal `cms_views` table and CRUD APIs.
4. Add `views/` export and `theme.json.views`.
5. Add CMS Views UI.
6. Add builder View block placement.
7. Add theme runtime region composition.

## Open Decisions

- [ ] Should Views be CMS-owned only, or can the Builder create Views too?
- [ ] Should page templates be edited in CMS admin, builder, or both?
- [ ] Should active theme files be editable from the UI or read/export only?
- [ ] Should View definitions live in the CMS database, theme folder, or both with sync/export?
- [ ] Should the canonical region ID format be hyphenated everywhere?

## Definition Of Done

- [ ] Users can define Views-style listings without editing JSON.
- [ ] Users can place View displays into builder regions as blocks.
- [ ] Page displays can own routes for listing/detail pages.
- [ ] CMS admin has a usable Templates screen.
- [x] Active theme metadata comes from `themes/<theme-name>/theme.json`.
- [x] Theme export includes `views/` and View metadata in `theme.json`.
- [ ] Saved layouts, templates, bindings, and theme export use one canonical region ID format.
- [ ] Runtime generation composes pages through theme page and region templates.
- [ ] Static fallback rendering still works when CMS or View data is missing.
