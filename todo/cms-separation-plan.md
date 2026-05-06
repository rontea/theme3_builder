# CMS Separation Plan

## Recommendation

- Keep the CMS outside the visual builder runtime.
- Treat the builder as a CMS client that stores `cmsBinding` metadata and reads published CMS data.
- Keep content authoring, CMS storage, and CMS APIs inside `theme-cms/`.

## Current State

The CMS extraction is mostly complete:

- `theme-cms/` owns the CMS admin UI, server app, routes, controllers, services, repositories, seed/migration flow, and SQLite storage.
- `th3 cms serve` serves the CMS admin at `/cms` and CMS authoring APIs at `/api/cms/*`.
- `th3 cms export` writes normalized bridge data into `html/data/cms/`.
- `th3 cms migrate-content` seeds the baseline `supporters`, `projects`, `insights`, and `cta_blocks` collections and exports them.
- `th3 builder` no longer serves the CMS admin shell at `/cms`.
- `th3 builder` no longer mounts CMS authoring APIs at `/api/cms/*`.
- Builder client code no longer exposes CMS create, update, delete, or export methods.
- Builder layouts store `cmsBinding` metadata only, not CMS authoring records.
- CMS binding data resolution is shared by `BuilderTask` and browser preview through `_builder/client/modules/cms-binding.js`.

Remaining architectural debt:

- `BuilderTask` still owns the final HTML adapter that applies resolved CMS data to partial markup during page generation.
- Browser preview has its own DOM HTML adapter over the same resolved binding payload.
- Panini/theme build compatibility with `html/data/cms/` still needs deeper coverage before final CMS HTML responsibility can move out of builder page generation.

## Target Direction

Split the system into three clear parts:

1. Builder
   Owns page layout, component placement, section ordering, component props, and `cmsBinding` references.

2. CMS
   Owns collection definitions, entries, media, content status, content authoring APIs, and publish/export routines.

3. Theme Build
   Owns Panini/page compilation and final output into `build/`.

## Folder Structure

```text
theme-cms/
  admin/
  server/
  data/
    cms.sqlite
    uploads/
  seeds/
  preview/

html/
  data/
    cms/
      manifest.json
      collections/
        index.json
        <collection>.json
      entries/
        index.json
        <collection>.json
```

## Runtime Model

1. Run `th3 cms serve` to start the standalone CMS admin and `/api/cms/*`.
2. Editors manage collections and entries in the CMS app.
3. CMS saves authoring data into `theme-cms/data/cms.sqlite`.
4. Run `th3 cms export` to write normalized JSON into `html/data/cms/`.
5. Run `th3 builder` to compose layouts and preview CMS-bound components from the exported bridge data.
6. Saving a layout currently generates CMS-resolved page HTML into `html/pages`.

Builder CMS options:

```bash
th3 builder --cms-admin-url http://localhost:3100/cms
th3 builder --cms-read-mode export
th3 builder --cms-read-mode live --cms-base-url http://localhost:3100
```

Use `export` mode as the default workflow. `live` mode is a preview-oriented read path and does not replace publishing bridge data.

## Ownership Boundaries

### Builder Owns

- page creation
- visual layout composition
- section order
- component instance props
- `cmsBinding` metadata
- read-only CMS binding selection and preview
- static partial fallback when CMS data is missing or stale

### CMS Owns

- collection definitions
- entry CRUD
- entry status
- CMS storage in `theme-cms/data/cms.sqlite`
- CMS admin UI
- `/api/cms/*` authoring APIs
- publish/export jobs
- reusable structured content

### Shared Contract

The builder-to-CMS contract is a stable binding shape plus exported content data.

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

## Important Decisions

### CMS Storage Is Not Builder Storage

CMS data lives in:

- `theme-cms/data/cms.sqlite`

Builder storage stays focused on:

- saved layouts
- builder projects
- builder pages

### Builder Does Not Host CMS Authoring APIs

Builder read-only CMS endpoints:

- `GET /api/builder/cms/collections`
- `GET /api/builder/cms/entries?collection=<slug>`

Standalone CMS authoring endpoints:

- `GET/POST/PUT/DELETE /api/cms/collections`
- `GET/POST/PUT/DELETE /api/cms/entries`
- `POST /api/cms/export`

### Final CMS HTML Is Still Builder-Generated For Now

The current final page generation path resolves CMS bindings in `BuilderTask` and writes HTML to `html/pages`.

Long-term, final CMS HTML should move to:

- CMS export, or
- the final Panini/theme build layer

That move should wait until `html/data/cms/` compatibility with Panini is covered by tests.

## Migration Note

Developers who previously opened CMS through `th3 builder` should now run the CMS separately:

```bash
th3 cms serve
```

Then open:

- `http://localhost:3100/cms`

The builder `Open CMS` button only opens the configured `cmsAdminUrl`; it does not serve or host the CMS admin shell. After editing CMS content, run:

```bash
th3 cms export
```

Then refresh the builder or save the page again so CMS-bound components use the latest exported data.

## Completed Phases

### Phase 0 - Freeze The Prototype

- [x] Stop adding new major CMS editing features directly inside the builder.
- [x] Treat `todo/cms-builder-plan.md` as the prototype path, not the final architecture.
- [x] Freeze the `cmsBinding` contract so extraction does not break saved layouts.
- [x] Decide that builder defaults to exported CMS data, with optional live API reads.

### Phase 1 - Extract CMS Backend

- [x] Create `theme-cms/server/` with its own routes, controllers, services, and repositories.
- [x] Move CMS table creation and CMS CRUD out of `BuilderTask`.
- [x] Create a dedicated CMS server entrypoint instead of mounting CMS inside builder startup.
- [x] Move CMS SQLite storage to `theme-cms/data/cms.sqlite`.
- [x] Add CMS-specific config for storage, preview, export, and uploads.

### Phase 2 - Extract CMS Admin UI

- [x] Create `theme-cms/admin/` as a separate admin shell.
- [x] Move collection and entry management UI out of `_builder/client/app.js`.
- [x] Replace builder-hosted CMS access with an `Open CMS` handoff.
- [x] Keep only lightweight binding controls inside builder properties.

### Phase 3 - Add Publish / Export Bridge

- [x] Add `th3 cms export`.
- [x] Publish normalized CMS JSON into `html/data/cms/`.
- [x] Generate a manifest and per-collection entry payloads that builder can read.
- [x] Keep optional `theme-cms/preview/` output as a CMS preview artifact.

### Phase 4 - Rewire Builder To Become A CMS Client

- [x] Make builder load CMS collections through the exported bridge or configured live CMS API.
- [x] Keep builder layout JSON storing only `cmsBinding` metadata.
- [x] Remove direct CMS CRUD ownership from builder startup and runtime.
- [x] Keep static partial fallback behavior for resilience.

### Phase 5 - Migrate First Content Areas

- [x] Move `supporters` into the standalone CMS path.
- [x] Move `projects` into the standalone CMS path.
- [x] Move `insights` into the standalone CMS path.
- [x] Move `cta_blocks` into the standalone CMS path.
- [ ] Add site settings and navigation after those collections are stable.

### Phase 6 - Consolidate CMS Binding Rendering

- [x] Extract aliasing, filtering, sorting, field mapping, grouping, and mapped record resolution into `_builder/client/modules/cms-binding.js`.
- [x] Use the shared binding data contract from browser preview and `BuilderTask`.
- [x] Keep separate HTML adapters for preview DOM rendering and final builder page generation.
- [x] Add tests proving preview and final output use the same binding contract.

### Phase 7 - Tests And Verification

- [x] Verify `th3 builder` does not mount `/api/cms/*`.
- [x] Verify `th3 cms serve` mounts `/api/cms/*`.
- [x] Verify builder reads exported CMS collections and entries.
- [x] Verify missing or stale CMS export fallback behavior.
- [x] Verify saved layouts preserve `cmsBinding`.
- [x] Run the existing builder integration tests.

## Remaining Work

### Phase 8 - Documentation Cleanup

- [x] Update this plan to match the actual code.
- [x] Remove stale claims that builder still owns CMS CRUD.
- [x] Document builder as a CMS client.
- [x] Remove builder-hosted CMS endpoints from builder API docs.
- [x] Add the migration note above.

### Later Hardening

- [ ] Add tests for CMS export compatibility with Panini/theme build.
- [ ] Add migration tooling for any legacy builder-stored CMS data if a real project still has it.
- [ ] Decide when final CMS HTML generation moves from builder page generation to CMS export or Panini/theme build.
