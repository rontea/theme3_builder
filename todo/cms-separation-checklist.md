# CMS Separation Update TODO

This checklist tracks the remaining work needed to separate the standalone CMS from the visual builder.

## Current State

- [x] `theme-cms/` exists with its own admin UI, server app, service, repository, config, seed data, and SQLite storage.
- [x] `th3 cms serve`, `th3 cms export`, and `th3 cms migrate-content` exist.
- [x] CMS export writes normalized bridge JSON into `html/data/cms/`.
- [x] Builder layout JSON stores `cmsBinding` metadata.
- [x] Builder no longer serves `theme-cms/admin` at `/cms`.
- [x] Builder no longer registers CMS authoring routes at `/api/cms/*`.
- [x] Builder no longer exposes CMS create/update/delete methods through `_builder/client/modules/api-client.js`.
- [ ] `BuilderTask` still owns CMS binding render logic.
- [x] CMS binding data resolution is shared between `BuilderTask.js` and `_builder/client/app.js`; HTML rendering adapters remain separate.

## Phase 1 - Define The Runtime Boundary

- [x] Decide the builder CMS read mode:
  - exported JSON only from `html/data/cms/`, or
  - live CMS API for preview plus exported JSON fallback.
- [x] Add a builder config option for `cmsBaseUrl` if live CMS API access is needed.
- [x] Add a builder config option for `cmsAdminUrl`, defaulting to `http://localhost:3100/cms`.
- [x] Document that `th3 builder` and `th3 cms serve` are separate processes.
- [x] Update `docs/cms-builder-workflow.md` and `docs/cms-runbook.md` with the final runtime model.

## Phase 2 - Stop Builder Hosting CMS

- [x] Remove `this.cmsAdminPath` from `func/gulp/classes/BuilderTask.js`.
- [x] Remove `this.app.use("/cms", express.static(...))` from builder startup.
- [x] Remove the builder `/cms` route.
- [x] Change `_builder/client/app.js` `openCmsModal()` to open configured `cmsAdminUrl` instead of `/cms/`.
- [x] Make the builder show a useful message when the CMS admin URL is unavailable.
- [x] Verify `th3 builder` no longer serves the CMS admin shell.

## Phase 3 - Remove Builder-Owned CMS Authoring API

- [x] Remove `registerCmsRoutes(this.app, this.cmsController)` from builder startup.
- [x] Remove `initCmsSlice()` from `BuilderTask`.
- [x] Remove `func/gulp/classes/builder-backend/routes/cms.routes.js` if nothing else imports it.
- [x] Remove `func/gulp/classes/builder-backend/controllers/cms.controller.js` if nothing else imports it.
- [x] Remove `func/gulp/classes/builder-backend/services/cms.service.js` if nothing else imports it.
- [x] Remove `func/gulp/classes/builder-backend/repositories/cms.repository.js` if nothing else imports it.
- [x] Remove CMS exports from `func/gulp/classes/builder-backend/index.js`.
- [x] Verify `/api/cms/*` exists only in `theme-cms/server`.

## Phase 4 - Trim Builder Client CMS Mutations

- [x] Remove `createCmsCollection()` from `_builder/client/modules/api-client.js`.
- [x] Remove `updateCmsCollection()` from `_builder/client/modules/api-client.js`.
- [x] Remove `deleteCmsCollection()` from `_builder/client/modules/api-client.js`.
- [x] Remove `createCmsEntry()` from `_builder/client/modules/api-client.js`.
- [x] Remove `updateCmsEntry()` from `_builder/client/modules/api-client.js`.
- [x] Remove `deleteCmsEntry()` from `_builder/client/modules/api-client.js`.
- [x] Keep only read methods needed for binding selection and preview.
- [x] Confirm all CMS authoring mutations live in `theme-cms/admin/app.js`.

## Phase 5 - Replace BuilderTask CMS Authoring Methods

- [x] Remove `createCmsCollection()`, `updateCmsCollection()`, and `deleteCmsCollection()` from `BuilderTask`.
- [x] Remove `createCmsEntry()`, `updateCmsEntry()`, and `deleteCmsEntry()` from `BuilderTask`.
- [x] Remove `exportCmsContent()` from `BuilderTask`.
- [x] Replace `listCmsCollections()` with a read-only adapter that reads exported JSON or calls `cmsBaseUrl`.
- [x] Replace `listCmsEntries()` with a read-only adapter that reads exported JSON or calls `cmsBaseUrl`.
- [x] Remove `initCmsAuthoringSlice()` once builder no longer needs direct CMS repository/service access.
- [x] Remove direct imports from `BuilderTask` to `theme-cms/server/services/cms.service`.

## Phase 6 - Consolidate CMS Binding Rendering

- [x] Extract CMS binding data mapping into one shared module, or clearly designate one authoritative renderer.
- [x] Remove duplicated alias, filter, sort, field-map, group, and collection rendering logic where possible.
- [x] Decide whether final CMS HTML is produced by:
  - builder page generation,
  - CMS export,
  - or the final Panini/theme build layer.
  - Decision: final CMS-bound page HTML is still produced by builder page generation for now; CMS export only publishes data, and Panini/theme build remains outside this contract.
- [x] If builder keeps preview rendering, mark it as preview-only and keep static partial fallback behavior.
  - Browser rendering is preview-only and consumes the same resolved binding payload as final page generation.
- [x] Add tests proving preview output and final output use the same binding contract.

## Phase 7 - Tests And Verification

- [x] Add a test that `th3 builder` does not mount `/api/cms/*`.
- [x] Add a test that `th3 cms serve` mounts `/api/cms/*`.
- [x] Add a test that builder can load CMS collections from `html/data/cms/collections/index.json`.
- [x] Add a test that builder can load CMS entries from `html/data/cms/entries/<collection>.json`.
- [x] Add a test for missing or stale CMS export fallback behavior.
- [x] Add a test for `cmsBinding` compatibility with existing saved layouts.
- [x] Run the existing builder tests after removing embedded CMS routes.

## Phase 8 - Documentation Cleanup

- [x] Update `todo/cms-separation-plan.md` so completed items match the actual code.
- [x] Remove claims that CMS CRUD has already been fully removed from builder runtime until it is true.
- [x] Update `docs/builder-architecture.md` to describe builder as a CMS client.
- [x] Update `docs/builder-api-contracts.md` to remove builder-hosted CMS endpoints.
- [x] Add a short migration note for developers currently opening CMS through `th3 builder`.

## Completion Criteria

- [ ] Running `th3 builder` serves only builder UI and builder APIs.
- [ ] Running `th3 cms serve` serves CMS admin and CMS APIs.
- [ ] Builder stores only `cmsBinding` metadata, not CMS authoring data.
- [ ] Builder cannot create, update, delete, or export CMS content.
- [ ] Builder can preview CMS-bound components through the agreed read-only contract.
- [ ] Final build/export flow is documented and covered by tests.
