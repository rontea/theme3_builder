# Builder Architecture

## Overview
The builder is split into backend slices and frontend feature modules.

- Backend entrypoint: `func/gulp/classes/BuilderTask.js`
- Backend modules: `func/gulp/classes/builder-backend/`
- Frontend entrypoint: `_builder/client/app.js`
- Frontend modules: `_builder/client/modules/`

The runtime behavior remains route-compatible with existing clients; refactor work focuses on module boundaries and ownership.

## Backend Structure

### Routing
- `routes/partials.routes.js`: `/api/partials`, `/api/partial`
- `routes/layouts.routes.js`: `/api/save-layout`, `/api/saved-layouts`, `/api/saved-layout`
- `routes/pages.routes.js`: `/api/pages`, `/api/pages/sync`, `/api/pages/partials`, `/api/pages/partials/sync-state`

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
