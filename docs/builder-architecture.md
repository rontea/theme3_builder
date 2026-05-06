# Builder Architecture

## Overview
The builder is split into backend slices and frontend feature modules. It owns visual page composition, saved layouts, page records, partial editing, and read-only CMS binding preview.

- Backend entrypoint: `func/gulp/classes/BuilderTask.js`
- Backend modules: `func/gulp/classes/builder-backend/`
- Frontend entrypoint: `_builder/client/app.js`
- Frontend modules: `_builder/client/modules/`

The builder is no longer the CMS host. CMS authoring routes and the CMS admin shell live under `theme-cms/`.

## CMS Boundary

The builder is a CMS client, not the long-term CMS owner.

- Default CMS read mode: exported bridge data from `html/data/cms/`
- Optional live CMS API base URL: `cmsBaseUrl`
- CMS admin handoff URL: `cmsAdminUrl`, defaulting to `http://localhost:3100/cms`
- Standalone CMS process: `th3 cms serve`
- Builder read endpoints: `/api/builder/cms/collections` and `/api/builder/cms/entries`
- CMS authoring endpoints: `/api/cms/*` on the standalone CMS server only

The builder should store `cmsBinding` metadata on component instances. CMS collection and entry authoring belongs to `theme-cms/`.

The current final page generation path still resolves CMS-bound partial HTML in `BuilderTask`; browser preview uses a separate DOM adapter. Both adapters consume the shared binding data contract from `_builder/client/modules/cms-binding.js`. If exported CMS data is missing or stale, the builder falls back to static partial markup.

## Migration Note

Do not open CMS through the builder server anymore. Start the CMS separately:

```bash
th3 cms serve
```

Then open `http://localhost:3100/cms`, or configure the builder handoff:

```bash
th3 builder --cms-admin-url http://localhost:3100/cms
```

After editing content, run `th3 cms export` so builder export mode can read the latest `html/data/cms/` bridge data.

## Backend Structure

### Routing
- `routes/partials.routes.js`: `/api/partials`, `/api/partial`
- `routes/layouts.routes.js`: `/api/save-layout`, `/api/saved-layouts`, `/api/saved-layout`
- `routes/pages.routes.js`: `/api/pages`, `/api/pages/sync`, `/api/pages/partials`, `/api/pages/partials/sync-state`
- Inline builder-owned routes in `BuilderTask`: runtime config, read-only CMS bridge reads, media upload/listing, watch startup, and preview/build helpers

### Controller Layer
Controllers parse request data, validate required HTTP params/body fields, and shape responses or errors.

- `controllers/partials.controller.js`
- `controllers/layouts.controller.js`
- `controllers/pages.controller.js`

### Service Layer
Services contain business behavior and flow orchestration.

- `services/partials.service.js`
  - partial scan/read
  - partial token extraction from page HTML
  - dependency resolution from tokens to partial paths
- `services/layouts.service.js`
  - layout save/read/delete flows (delegated to existing behavior)
  - page composition output as partial includes (`{{> partialName}}`)
- `services/pages.service.js`
  - page create/list/delete
  - filesystem sync into DB
  - partial-sync state updates

### Repository Layer
Repositories isolate persistence and filesystem access wrappers used by services.

- DB repositories: `builder.repository.js`, `layouts.repository.js`, `pages.repository.js`
- File/glob repository: `partials.repository.js`

### Utility Layer
Reusable helpers for cross-slice safety and formatting:

- `utils/pathSafety.js`: traversal-safe path resolution and boundary checks
- `utils/validation.js`: layout payload validation
- `utils/formatting.js`: preview/category formatting helpers
- `utils/sanitizers.js`: name/page normalization

## Frontend Structure

### Core Modules
- `modules/api-client.js`
  - typed wrappers around builder API endpoints
- `modules/cms-binding.js`
  - shared CMS binding data contract for aliasing, filtering, sorting, grouping, and field mapping
- `modules/state-store.js`
  - undo/redo snapshots and history bounds
- `modules/pages-dashboard.js`
  - landing dashboard page list, page sync, page partial sync
- `modules/editor-canvas.js`
  - Sortable setup, drag/drop behavior, canvas rendering and reorder/removal handlers
- `modules/modals.js`
  - modal show/hide utility
- `modules/notifications.js`
  - toast rendering and lifecycle

### Entry App
`_builder/client/app.js` remains the integration point for:
- element binding
- event wiring
- editor/page orchestration
- delegating feature concerns to modules above

## Request Flow (Example)
1. Browser calls `/api/pages/sync`.
2. `pages.routes` dispatches to `pages.controller`.
3. `pages.controller` parses request and calls `pages.service`.
4. `pages.service` executes sync logic and repository calls.
5. Controller returns `{ success, data }` response.

## Decommission Status
- Legacy route fallback registration in `BuilderTask` has been removed.
- Backend routes now register exclusively through module route files.
- Frontend dead wrappers from pre-module canvas flow were removed from `app.js`.
- Builder-hosted `/cms` and `/api/cms/*` have been removed.
- Builder CMS mutations have been removed from `_builder/client/modules/api-client.js`.
- Builder CMS reads are limited to `/api/builder/cms/*`.
