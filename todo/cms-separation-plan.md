# CMS Separation Plan

## Recommendation

- Do not keep growing CMS as a builder-owned feature.
- Treat the current in-builder CMS as a prototype only.
- Build a separate `theme-cms/` app and let the builder become a CMS client instead of the CMS host.

## Current Review

The current CMS is still tightly fused to the builder:

- `BuilderTask` creates the CMS tables in the same SQLite database as layout and page data.
- `BuilderTask` also owns CMS binding resolution and CMS-based component rendering during page generation.
- CMS routes are mounted on the same Express app that serves the builder UI.
- `cms.service.js` and `cms.repository.js` are thin wrappers around `BuilderTask`, so the CMS does not yet have an independent backend boundary.
- `_builder/client/app.js` owns CMS collection CRUD, entry CRUD, binding editing, and in-canvas CMS rendering behavior.
- The theme build pipeline still targets `build/`, while the CMS has no separate publish/export contract.

That is why the current direction feels wrong: the builder is doing layout editing, CMS storage, CMS rendering, and CMS administration all at once.

## Target Direction

Split the system into three clear parts:

1. Builder
   Owns page layout, component placement, section ordering, and `cmsBinding` references only.

2. CMS
   Owns collections, entries, media, content preview, publish state, and export/publish routines.

3. Theme Build
   Owns Panini/page compilation and final output into `build/`.

## Proposed Folder Structure

```text
theme-cms/
  admin/
  server/
  data/
    cms.sqlite
    uploads/
  schemas/
  preview/
  README.md

html/
  data/
    cms/
      manifest.json
      collections/
      entries/
```

### Notes On This Structure

- `theme-cms/` becomes the CMS app boundary.
- `theme-cms/data/cms.sqlite` becomes the CMS database instead of `_builder/layouts/builder.sqlite`.
- `html/data/cms/` becomes the publish bridge into the existing Panini/theme build.
- `build/` stays the final public artifact.
- `theme-cms/preview/` can mirror a lightweight `build/` shape for CMS-only preview if needed, but should not become a second permanent asset pipeline.

## Ownership Boundaries

### Builder Should Own

- page creation
- visual layout composition
- section order
- component instance props
- `cmsBinding` references
- fallback rendering when CMS content is unavailable

### CMS Should Own

- collection definitions
- entry CRUD
- entry status and scheduling later
- media uploads
- reusable content blocks
- menus/navigation later
- SEO/page metadata later
- publish/export jobs

### Shared Contract

The only builder-to-CMS contract should be a stable binding shape plus published content data.

Example:

```json
{
  "cmsBinding": {
    "source": "cms",
    "collection": "projects",
    "mode": "collection",
    "selection": {
      "filter": {
        "active": true
      },
      "sort": "sort_order:asc",
      "limit": 4
    },
    "fieldMap": {
      "title": "title",
      "text": "summary",
      "imageSrc": "image_src",
      "linkHref": "detail_url"
    },
    "fallback": "static"
  }
}
```

The builder should store this contract, but the CMS should own the data behind it.

## Recommended Runtime Model

1. `th3 cms` starts the CMS admin/API from `theme-cms/`.
2. Editors manage collections and entries in the CMS app.
3. CMS saves authoring data into `theme-cms/data/cms.sqlite`.
4. CMS publish/export writes normalized JSON into `html/data/cms/`.
5. Builder reads CMS data through API or through the published manifest, but does not own CMS storage.
6. Panini/theme build reads `html/data/cms/` and compiles final pages into `build/`.

## Why This Is Better

- It separates content editing from layout editing.
- It keeps the theme build pipeline intact instead of replacing it.
- It gives us a cleaner path to a lightweight WordPress/Drupal-style system without copying all of WordPress/Drupal.
- It reduces risk inside `BuilderTask`, which is already carrying too much responsibility.
- It makes future CMS features easier to add without touching builder internals every time.

## Important Architectural Decisions

### 1. Do Not Keep CMS Tables In Builder Storage

Move CMS data out of:

- `_builder/layouts/builder.sqlite`

Move CMS data into:

- `theme-cms/data/cms.sqlite`

Builder storage should stay focused on:

- saved layouts
- builder projects
- builder pages

### 2. Do Not Keep CMS CRUD In `_builder/client/app.js`

The builder can keep:

- binding selection
- "Open CMS" launch action
- basic binding preview

The builder should lose:

- collection manager
- entry manager
- CMS modal as the main editing experience

### 3. Do Not Resolve Final CMS HTML Inside Builder Long-Term

Today the builder resolves CMS content while generating page output. Long-term that responsibility should move to:

- CMS export, or
- the final Panini build layer

That keeps the builder focused on composition rather than content publishing.

### 4. Keep `build/` As The Final Site Output

Do not create a second full production build system under `theme-cms/`.

Use:

- `theme-cms/preview/` for CMS-only preview if needed
- `html/data/cms/` as the integration bridge
- `build/` as the final compiled site output

## Lightweight WordPress/Drupal-Like MVP

The first CMS should feel like a lightweight structured-content system, not a full platform clone.

### MVP Features

- collections/content types
- entries
- status: draft, published, archived
- sort order
- slugs/keys
- media upload folder
- publish/export
- reusable CTA and listing data

### Later Features

- revisions/history
- SEO metadata
- menus and site settings
- relations between entries
- scheduled publishing
- user roles/auth if multi-user editing becomes necessary

## Phased TODO Plan

### Phase 0 - Freeze The Prototype

- [x] Stop adding new major CMS editing features directly inside the builder.
- [x] Treat `todo/cms-builder-plan.md` as the prototype path, not the final architecture.
- [x] Freeze the `cmsBinding` contract so extraction does not break saved layouts.
- [x] Decide whether builder reads CMS through API, export manifest, or both.

### Phase 1 - Extract CMS Backend

- [x] Create `theme-cms/server/` with its own routes, controllers, services, and repositories.
- [x] Move CMS table creation and CMS CRUD out of `BuilderTask`.
- [x] Create a dedicated CMS server entrypoint instead of mounting CMS inside builder startup.
- [x] Move CMS SQLite storage to `theme-cms/data/cms.sqlite`.
- [x] Add a CMS-specific config file for storage, preview, export, and uploads.

### Phase 2 - Extract CMS Admin UI

- [x] Create `theme-cms/admin/` as a separate admin shell.
- [x] Move collection and entry management UI out of `_builder/client/app.js`.
- [x] Replace the builder CMS modal with an "Open CMS" flow.
- [x] Keep only lightweight binding controls inside builder properties.

### Phase 3 - Add Publish / Export Bridge

- [x] Add `th3 cms export` or `th3 cms build`.
- [x] Publish normalized CMS JSON into `html/data/cms/`.
- [x] Generate a manifest that builder and theme build can read consistently.
- [x] Add optional `theme-cms/preview/` output for CMS preview pages.

### Phase 4 - Rewire Builder To Become A CMS Client

- [x] Make builder load CMS collections through the CMS boundary, not from its own DB tables.
- [x] Keep builder layout JSON storing only `cmsBinding` metadata.
- [x] Remove direct CMS CRUD ownership from builder startup and runtime.
- [x] Keep static partial fallback behavior for resilience.

### Phase 5 - Migrate First Content Areas

- [x] Move `supporters` into the standalone CMS path.
- [x] Move `projects` into the standalone CMS path.
- [x] Move `insights` into the standalone CMS path.
- [x] Move `cta_blocks` into the standalone CMS path.
- [ ] Add site settings and navigation after those collections are stable.

### Phase 6 - Hardening

- [ ] Add tests for CMS export compatibility with Panini.
- [ ] Add migration tooling from builder-stored CMS data into `theme-cms/data/cms.sqlite`.
- [ ] Add rollback/fallback behavior if CMS export is missing or stale.
- [x] Add docs for editor workflow, builder workflow, and publish flow.

## Immediate Next Step

The best next move is not more in-builder CMS work.

The best next move is:

1. freeze the current prototype boundary
2. create `theme-cms/` as a separate app shell
3. move CMS storage out of builder
4. publish CMS data into `html/data/cms/`
5. let builder keep only `cmsBinding` and preview responsibilities

That gives us a realistic lightweight CMS path without overcommitting to a full WordPress clone.
