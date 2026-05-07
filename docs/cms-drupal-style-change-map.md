# CMS Drupal-Style Change Map

This document identifies the concrete implementation changes needed to align Theme 3 Builder with the clarified CMS direction: Drupal-style layout sections, regions, blocks, Views-style displays, and a portable `themes/<theme-name>/` folder.

For the executable implementation checklist, see `todo/cms-drupal-style-todo.md`.

## Current State

Several foundation pieces already exist.

### Builder Regions And Blocks

The builder already supports region-aware block placement in several places:

- `_builder/client/app.js` has region-aware properties, block config, `cmsBinding`, and a `Region` tab.
- `_builder/client/app.js` exports layout data with `meta.layoutModel = "regions"`, a grouped `regions` object, and a flattened `layout` fallback.
- `func/gulp/classes/builder-backend/services/layouts.service.js` can flatten `layoutData.regions`.
- `func/gulp/classes/builder-backend/utils/validation.js` validates region-based layouts.
- `func/gulp/classes/BuilderTask.js` has template records, default blocks, locked regions, and `/api/templates`.

### Theme Folder Export

The portable theme folder is already partially implemented:

- `th3 theme export` exists in `bin/cli.js`.
- `theme-cms/server/services/cms.service.js` exports `themes/<theme-name>/`.
- Existing exported structure includes `theme.json`, `layouts`, `pages`, `regions`, `templates`, `partials`, `components`, `assets`, `data/fallback`, and `bindings`.
- `themes/theme-3/theme.json` already includes `regions`, `regionDefinitions`, `templates`, counts, validation, and file inventory.

### CMS Content And Theme Manager

The CMS already supports:

- collections and entries
- schema-driven fields
- media records
- forms and submissions
- theme validation and export UI
- publish preflight checks
- fallback data export

## Main Gaps

### 1. Views Are Not Implemented Yet

Views are the biggest missing feature from the Drupal-like direction.

Needed changes:

- Add a persisted View model, probably `cms_views`.
- Add View APIs under `/api/cms/views`.
- Add a CMS admin `Views` screen.
- Add View display types: `block`, `page`, and later `feed` or `embed`.
- Add query config: collection, filters, sort, limit, pagination, status rules.
- Add row template/component selection.
- Add empty-state template/component selection.
- Add View preview using exported CMS data or live CMS data.
- Add View placement in builder regions as a block type.
- Export View definitions under `themes/<theme-name>/views/`.
- Add `views` metadata to `theme.json`.
- Validate Views against existing collections, fields, components, and routes.

Likely files:

- `theme-cms/server/repositories/cms.repository.js`
- `theme-cms/server/services/cms.service.js`
- `theme-cms/server/controllers/cms.controller.js`
- `theme-cms/server/routes/cms.routes.js`
- `theme-cms/admin/index.html`
- `theme-cms/admin/app.js`
- `theme-cms/admin/styles.css`
- `_builder/client/app.js`
- `func/gulp/classes/BuilderTask.js`

### 2. CMS Admin Templates Screen Is Still A Placeholder

The backend already has builder template APIs, but the CMS admin still shows:

```text
Route/content-type mapping and region defaults are scheduled for Phase 9.
```

Needed changes:

- Replace the placeholder with a template list.
- Add create/edit/delete flows for page templates.
- Surface route pattern, content type, layout ID, region defaults, locked regions, and validation.
- Add template preview with a selected CMS entry.
- Decide whether template editing is CMS-owned, builder-owned, or split:
  - CMS: route/content-type mapping and active theme validation.
  - Builder: visual region/block defaults and preview.

Likely files:

- `theme-cms/admin/index.html`
- `theme-cms/admin/app.js`
- `theme-cms/admin/styles.css`
- `_builder/client/app.js`
- `func/gulp/classes/BuilderTask.js`

### 3. Theme Folder Is Exported, But Not Yet The Full Source Of Truth

The exported theme is real, but many runtime paths still treat `html/` as the main workspace and `themes/` as an output artifact.

Needed changes:

- Add active-theme settings that point to `themes/theme-3`.
- Let the CMS read active theme metadata from `themes/<theme-name>/theme.json`.
- Let the builder scan components from the active theme first:
  - `themes/<theme-name>/partials`
  - `themes/<theme-name>/components`
  - fallback to `html/partials` where needed
- Let theme validation inspect the active theme folder, not only builder DB source.
- Add a clear rule for `html/`:
  - temporary builder output, or
  - legacy compatibility bridge, not the long-term theme contract.

Likely files:

- `theme-cms/server/config.js`
- `theme-cms/server/services/cms.service.js`
- `func/gulp/classes/BuilderTask.js`
- `func/gulp/classes/builder-backend/services/partials.service.js`
- `_builder/client/modules/api-client.js`
- `theme-cms/admin/app.js`

### 4. Region ID Naming Is Inconsistent

The theme folder uses hyphenated region IDs:

- `side-navigation`
- `content-above`
- `content-below`

Some builder/backend code normalizes to underscored IDs:

- `side_nav`
- `content_above`
- `content_below`

Needed changes:

- Pick one canonical external region ID format.
- Recommended external format: hyphenated IDs, because exported theme files already use them.
- Keep underscore aliases internally only for backwards compatibility.
- Normalize all saved/exported layout, template, binding, and theme metadata to the canonical IDs.
- Add tests for region alias migration.

Likely files:

- `_builder/client/app.js`
- `func/gulp/classes/BuilderTask.js`
- `func/gulp/classes/builder-backend/services/layouts.service.js`
- `func/gulp/classes/builder-backend/utils/validation.js`
- `theme-cms/server/services/cms.service.js`

### 5. Theme Export Needs Views And Stronger Theme Contract

Theme export currently creates the major folders, but it does not create `views/` or include View metadata in `theme.json`.

Needed changes:

- Add `views` to export directories.
- Write one JSON file per View under `views/`.
- Include `views` count in validation and `theme.json`.
- Include View route conflicts in validation.
- Include missing View collection/field/template/component checks.
- Update generated README to mention Views.

Likely files:

- `theme-cms/server/services/cms.service.js`
- `bin/cli.js`
- `theme-cms/admin/app.js`

### 6. Builder Needs A View Block Type

The builder currently treats placed items mainly as partials/components with optional `cmsBinding`. A View block should be first-class.

Needed changes:

- Add `type: "view"` component/block records.
- Add a View picker in the component library or a separate Views panel.
- Place View displays into layout regions.
- Add a View tab or View-specific config in the properties panel.
- Render View preview using selected display config.
- Save View block records in `regions`.
- Validate View blocks against allowed regions and route/display constraints.

Likely files:

- `_builder/client/app.js`
- `_builder/client/styles.css`
- `_builder/client/modules/api-client.js`
- `func/gulp/classes/BuilderTask.js`
- `func/gulp/classes/builder-backend/utils/validation.js`

### 7. Runtime Page Generation Does Not Yet Compose Region Templates

`createPageFromLayout` currently flattens layout items and joins markup. That is enough for simple output but not a Drupal-like theme runtime.

Needed changes:

- Generate pages through the active theme page template.
- Render each named region using `templates/regions/<region>.html`.
- Inject region blocks into the matching region template.
- Preserve fallback rendering when CMS/View data is unavailable.
- Support page templates and View page displays as route owners.

Likely files:

- `func/gulp/classes/builder-backend/services/layouts.service.js`
- `func/gulp/classes/BuilderTask.js`
- `theme-cms/server/services/cms.service.js`
- `themes/theme-3/templates/page.html`
- `themes/theme-3/templates/regions/*.html`

## Suggested Implementation Order

### Phase A: Normalize The Existing Region Contract

Goal: make the current region/block system stable before adding Views.

- Pick canonical region IDs.
- Add tests for old and new region IDs.
- Ensure saved layouts, template records, exported themes, and validation agree.
- Update docs if the final names differ from current examples.

### Phase B: Make Templates Usable In The Admin

Goal: expose the template model that already exists.

- Replace the Templates placeholder with a real list/detail editor.
- Wire the existing builder `/api/templates` or add CMS-side template proxy APIs.
- Add route/content-type validation and preview entry selection.

### Phase C: Add Views Data Model And APIs

Goal: persist Views without touching builder UI yet.

- Add `cms_views`.
- Add CRUD APIs.
- Add server-side validation and preview resolution.
- Add export support under `themes/<theme-name>/views/`.

### Phase D: Add Views UI In CMS

Goal: let users create Views without JSON.

- Add Views nav item.
- Add View list.
- Add View editor with query settings and displays.
- Add preview and validation states.

### Phase E: Add View Blocks To Builder

Goal: allow Views to be placed in layout regions.

- Add View display picker.
- Add `type: "view"` blocks.
- Add View-specific properties.
- Render View previews.
- Save View blocks inside `regions`.

### Phase F: Theme Runtime Composition

Goal: render like a theme system, not a flat partial concat.

- Use active theme page templates.
- Render named region templates.
- Resolve component blocks and View blocks.
- Keep static fallback behavior.

## First Practical PR Candidates

1. Region ID normalization tests and fixes.
2. CMS admin Templates screen using the existing `/api/templates` backend.
3. Minimal `cms_views` CRUD model and APIs.
4. Add `views/` folder and `theme.json.views` export support.
5. Builder View block placement.

## Open Decisions

- Should Views be CMS-owned only, or should the Builder be able to create Views too?
- Should page templates be edited in CMS admin, builder, or both?
- Should active theme files be editable from the UI or only exported/read?
- Should View definitions live in the CMS database, the theme folder, or both with sync/export?
- Should canonical region IDs use hyphens everywhere, or preserve underscores internally and only export hyphens?
