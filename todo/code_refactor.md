# Code Refactor TODO

## Goal
- Gradually modularize the builder codebase to reduce complexity and future bugs.
- Avoid a full rewrite; keep feature delivery moving while refactoring in slices.

## Current Assessment
- Backend is centralized in `BuilderTask.js` (routes + DB + sync/parse + page generation).
- Frontend is centralized in `_builder/client/app.js`.
- Refactor is not immediately required, but code size now justifies modular split.

## Phase 0 - Baseline and Guardrails
- [x] Freeze endpoint contracts for current builder APIs (request/response shape docs).
- [x] Add or confirm regression tests for page sync/save/load/edit flows before moving code.
- [x] Add lightweight logging boundaries (route -> service -> repo) to validate behavior parity.

## Phase 1 - Backend Folder Structure (No Logic Change)
- [x] Create backend module structure: `routes/`, `controllers/`, `services/`, `repositories/`, `utils/`.
- [x] Move shared helpers (path safety, validation, formatting) to `utils/`.
- [x] Keep existing behavior intact; only relocate code with thin wrappers.

## Phase 2 - Pages Slice (Pilot Refactor)
- [x] Extract page endpoints first (`/api/pages`, `/api/pages/sync`, page create/update/delete if present).
- [x] Implement `pages.controller` for HTTP parsing/response handling.
- [x] Implement `pages.service` for business logic (sync/scan/partial detection).
- [x] Implement `pages.repository` for SQLite operations.
- [x] Wire routes through `pages.routes` and keep legacy routes as fallback until validated.

## Phase 3 - Layout/Editor Slice
- [x] Extract layout save/load endpoints into `layouts.controller/service/repository`.
- [x] Move composition logic (partial include generation, file write rules) into service layer.
- [x] Ensure save behavior still writes page content in partial-include format (no full HTML shell).

## Phase 4 - Components/Partials Slice
- [x] Extract partial listing/read endpoints into dedicated modules.
- [x] Centralize partial parsing and dependency detection in `partials.service`.
- [x] Keep traversal/path protections in one reusable validator utility.

## Phase 5 - Frontend Modularization
- [x] Split `_builder/client/app.js` into feature modules:
- [x] `api-client`, `state-store`, `pages-dashboard`, `editor-canvas`, `modals`, `notifications`.
- [x] Move drag/drop and sync logic into isolated modules with explicit interfaces.
- [x] Keep current UI behavior and Tailwind styling while reducing file size and coupling.

## Phase 6 - Cleanup and Decommission
- [x] Remove dead/duplicate logic from legacy `BuilderTask.js` and monolithic frontend code.
- [x] Add architecture notes (`docs/builder-architecture.md`) for module responsibilities.
- [x] Run full regression pass and verify watch/preview/sync/save/edit flows end-to-end.

## Delivery Strategy
- [ ] Ship per phase in small PRs.
- [ ] Start with Phase 2 (pages endpoints only) as the first safe evaluation slice.
- [ ] Roll back by route toggle if parity issues appear.
