# Builder Fix TODO

## Phase 0 - Completed
- [x] Add integration tests for `/api/partials`, `/api/layouts`, and `/api/save-layout`.
- [x] Add tests for path traversal attempts (`../`) on `/api/partial` and `/api/layout`.
- [x] Add validation/size limits for `layoutData` payload before saving.
- [x] Expose saved layout files via read APIs.
- [x] Document save location (`_builder/layouts`) in README.
- [x] Add project-first lock flow in Builder UI.
- [x] Save generated page output to `html/pages`.
- [x] Show partial preview text in left component sidebar.

## Phase 1 - Core Component Builder
- [x] Map all `html/partials/**/*.html` files into component records (`id`, `name`, `category`, `path`, `preview`).
- [x] Standardize folder-to-category naming for sidebar grouping.
- [x] Normalize canvas state into `pageComponents[]` with `instanceId`, `componentPath`, `order`, `props`.
- [x] Ensure drag payload passes component identity only (not raw rendered HTML).
- [x] On drop, render partial content into canvas and bind instance actions.
- [x] Add duplicate action for canvas component instances.

## Phase 2 - Page Composer Save/Load
- [x] Require project + page context (`projectName`, `pageName`, `pageTitle`) before editing/saving.
- [x] Save editable layout JSON with version + timestamps.
- [x] Compose final HTML from ordered components and write to `html/pages/<pageName>.html`.
- [x] Add overwrite vs Save As behavior for existing page names.
- [x] Standardize save response (`layoutPath`, `pagePath`, `pageName`) across API/UI.
- [x] Add load workflow to reopen saved layouts into canvas.

## Phase 3 - Validation, Security, and Errors
- [x] Validate all component paths resolve under `html/partials`.
- [x] Enforce limits: payload size, component count, text field lengths.
- [x] Keep traversal protections on all builder read/write endpoints.
- [x] Improve API error payloads with actionable details.
- [x] Show UI toasts that identify failed component/path when compose fails.

## Phase 4 - UX Enhancements (Wix-like)
- [x] Add properties panel MVP for common fields (text, link, image src, alt).
- [x] Persist per-instance `props` in layout JSON and apply to composed page.
- [x] Add full-page live preview from current canvas model.
- [x] Improve sidebar browsing: search + category filter + empty states.
- [x] Add undo/redo history for canvas operations.

## Phase 5 - Testing and Docs
- [x] Add integration tests for drop/reorder/delete/duplicate + save/load/update flows.
- [x] Add regression tests for malicious/invalid input payloads.
- [x] Add README builder workflow section (create project -> drag components -> save page).
- [x] Add troubleshooting section for global `th3` linking/version conflicts.
