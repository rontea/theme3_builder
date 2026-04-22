# CMS Separation Checklist

This checklist maps the current codebase against [cms-separation-plan.md](/c:/Design/theme_3-main/todo/cms-separation-plan.md:1) so extraction work can happen in a controlled order.

## Current State Snapshot

- Builder currently owns CMS storage in `_builder/layouts/builder.sqlite`.
- Builder currently mounts CMS routes in the same Express app used by the visual builder.
- Builder currently renders CMS-bound content during page generation and preview.
- Builder client currently owns CMS collection CRUD, entry CRUD, and component binding editing.
- No standalone `theme-cms/` app exists yet.
- No CMS export bridge exists yet under `html/data/cms/`.

## Phase 0 - Freeze The Prototype

- [x] Confirm the current in-builder CMS is a prototype, not the target architecture.
- [x] Keep the `cmsBinding` contract as the builder-side source of truth for saved layouts.
- [ ] Decide whether the builder should read from CMS API, exported manifest, or both during migration.
- [ ] Stop adding new major CMS authoring features inside `_builder/client/app.js`.

## Phase 1 - Extract CMS Backend

- [x] Create `theme-cms/server/` with its own app entrypoint.
- [x] Move CMS table creation out of `func/gulp/classes/BuilderTask.js`.
- [x] Move CMS CRUD logic out of `BuilderTask` methods into CMS-owned services/repositories.
- [x] Move CMS storage from `_builder/layouts/builder.sqlite` to `theme-cms/data/cms.sqlite`.
- [x] Add CMS config for storage, uploads, preview, and export paths.

## Phase 2 - Extract CMS Admin UI

- [x] Create `theme-cms/admin/`.
- [x] Move collection and entry management UI out of `_builder/client/app.js`.
- [x] Replace builder-owned CMS management with an `Open CMS` handoff.
- [x] Keep only lightweight binding controls in the builder properties panel.

## Phase 3 - Publish / Export Bridge

- [x] Add a CMS export command such as `th3 cms export`.
- [x] Publish normalized JSON into `html/data/cms/`.
- [x] Generate a manifest that both builder and theme build can read.
- [x] Add optional preview output under `theme-cms/preview/` if needed.

## Phase 4 - Rewire Builder As CMS Client

- [x] Make builder read CMS data through the CMS boundary instead of builder tables.
- [x] Keep builder layout JSON storing only `cmsBinding` metadata.
- [x] Remove direct CMS CRUD ownership from builder startup/runtime.
- [x] Keep static fallback rendering when CMS data is unavailable.

## Phase 5 - Content Migration

- [x] Migrate `supporters`.
- [x] Migrate `projects`.
- [x] Migrate `insights`.
- [x] Migrate `cta_blocks`.
- [ ] Add site settings/navigation only after core collections are stable.

## Immediate Code Hotspots

- `func/gulp/classes/BuilderTask.js`
  Still creates CMS tables, owns CMS CRUD, and resolves CMS rendering.
- `func/gulp/classes/builder-backend/controllers/cms.controller.js`
  Mounted inside the builder app instead of a standalone CMS server.
- `func/gulp/classes/builder-backend/services/cms.service.js`
  Still delegates back into `BuilderTask`.
- `func/gulp/classes/builder-backend/repositories/cms.repository.js`
  Still uses builder DB helpers directly.
- `_builder/client/app.js`
  Still owns CMS management UI and binding editing.
- `_builder/client/index.html`
  Should remain builder-focused; any richer CMS admin should move out during extraction.
