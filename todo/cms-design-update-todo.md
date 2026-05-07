# CMS Design Update TODO

This checklist tracks the implementation work needed to bring the real Theme 3 CMS, builder, theme manager, and publish workflow in line with the updated reference build in `CMSDESIGNLOOKUP/cms-gen`.

Reference sources:

- `CMSDESIGNLOOKUP/cms-gen/`
- `CMSDESIGNLOOKUP/cms-gen/CMS_UI_ALIGNMENT_NOTES.md`
- `docs/cms-ui-design.md`
- `docs/cms-design-system-workflow.md`

Last reviewed: 2026-05-07.

## Goal

Use `cms-gen` as the visual and interaction reference for the next CMS build while keeping the architecture from the current repo:

- `theme-cms/` owns CMS authoring, content storage, forms, media metadata, publishing, and `/api/cms/*`.
- `_builder/` owns page layout, visual block placement, preview, and read-only CMS bindings.
- `html/` and future `themes/` output own layouts, partials, fallback content, assets, and binding metadata.

## Current Baseline

- [x] Standalone CMS exists under `theme-cms/`.
- [x] Builder and CMS are separated into different runtime processes.
- [x] CMS exports bridge JSON into `html/data/cms/`.
- [x] Builder stores `cmsBinding` metadata on component instances.
- [x] `cms-gen` reference UI covers the target app shell, CMS screens, builder regions, templates, theme manager, forms, API, settings, media picker, action menus, feedback states, accessibility pass, and responsive behavior.
- [ ] Real CMS admin still uses the older single-file `theme-cms/admin` implementation.
- [ ] Real builder UI does not yet match the region/template/page builder model shown in `cms-gen`.
- [x] Theme export is implemented as a portable `themes/<theme-name>/` package.

## Phase 1 - Reference Audit And Mapping

- [x] Inventory `CMSDESIGNLOOKUP/cms-gen/src/pages/*` and map each reference screen to a real repo target.
  - See `docs/cms-design-implementation-mapping.md`.
- [x] Decide whether the real CMS admin should remain plain HTML/CSS/JS or move to a bundled React admin shell based on `cms-gen`.
  - Decision: keep `theme-cms/admin` as the real implementation target for the next pass and use `cms-gen` as the visual/interaction reference. Defer a React/Vite admin migration until the CMS API, region model, templates, and theme export contract are stable.
- [x] Document route mapping from `cms-gen` to the real app:
  - `/` Dashboard
  - `/content` Collections
  - `/content/collections/:slug` Entries
  - `/content/collections/:slug/entries/:id` Entry editor
  - `/media` Media
  - `/forms` Forms
  - `/builder` Builder handoff or embedded builder route
  - `/templates` Page templates
  - `/themes` Theme manager
  - `/api` API console
  - `/publish` Preview and publish
  - `/settings` Settings
- [x] Identify shared UI primitives to port first:
  - app shell
  - top bar
  - sidebar
  - action menu
  - confirmation dialog
  - empty state
  - loading state
  - error state
  - media picker modal
- [x] Create an implementation notes file if route ownership needs decisions that should not live only in TODO form.
  - Added `docs/cms-design-implementation-mapping.md`.

## Phase 2 - CMS Admin App Shell

- [x] Replace or refactor `theme-cms/admin/index.html`, `theme-cms/admin/styles.css`, and `theme-cms/admin/app.js` to match the `cms-gen` shell.
- [x] Add stable top bar with:
  - project/site name
  - environment badge
  - global search
  - save/export status
  - notifications affordance
  - user/menu placeholder
- [x] Add sidebar navigation for:
  - Dashboard
  - Content
  - Media
  - Forms
  - Builder
  - Templates
  - Themes
  - API
  - Publish
  - Settings
- [x] Ensure the Builder item opens the configured builder URL instead of mixing CMS writes into the builder process.
- [x] Add responsive sidebar behavior for tablet and mobile.
- [x] Add accessible labels and focus states for all icon-only controls.

## Phase 3 - Dashboard

- [x] Build the CMS dashboard from the `cms-gen` Dashboard reference.
- [x] Add metrics for:
  - drafts
  - published entries
  - active theme status
  - validation warnings
- [x] Add recent activity using available CMS data.
- [x] Add quick actions:
  - create collection
  - create entry
  - upload media
  - open builder
  - export content
  - export theme
- [x] Add empty, loading, success, and error states.

## Phase 4 - Content Modeling And Entries

- [x] Port the collection list UX from `cms-gen/src/pages/CollectionsList.tsx`.
- [x] Add collection table columns:
  - name
  - slug
  - entry count
  - required by active theme
  - last updated
  - actions
- [x] Port schema-driven collection builder behavior from `CollectionBuilder.tsx`.
- [x] Support field controls:
  - add field
  - reorder field
  - duplicate field
  - delete field
  - required toggle
  - field type select
- [x] Support field types:
  - text
  - textarea
  - rich text
  - number
  - boolean
  - select
  - date
  - image
  - URL
  - slug
  - reference
  - repeater
- [x] Port entry list controls from `EntriesList.tsx`:
  - collection selector
  - search
  - real status filter
  - sort
  - bulk selection
  - bulk actions
  - row action menu
- [x] Port schema-driven entry editor behavior from `EntryEditor.tsx`.
- [x] Replace raw JSON editing as the normal editor path.
- [x] Connect validation errors to the relevant fields.
- [x] Keep raw JSON/debug view available only as an advanced fallback.

## Phase 5 - Media Library And Picker

- [x] Port the media library layout from `cms-gen/src/pages/MediaLibrary.tsx`.
- [x] Add grid and list views.
- [x] Add media detail drawer.
- [x] Add actions:
  - upload
  - rename
  - copy URL
  - replace file
  - delete
- [x] Add media metadata storage if missing:
  - file name
  - file type
  - dimensions
  - size
  - URL
  - used by count
- [x] Port reusable media picker from `cms-gen/src/components/MediaPickerModal.tsx`.
- [ ] Open the picker from:
  - [x] entry image fields
  - form/image field settings
  - builder component properties
- [x] Add picker empty, loading, and error states.

## Phase 6 - Forms

- [x] Port forms list from `cms-gen/src/pages/FormsList.tsx`.
- [x] Add form definition storage and API support if missing.
- [x] Port form builder from `FormBuilder.tsx`.
- [x] Support form field settings:
  - label
  - type
  - required
  - placeholder
  - validation
- [x] Support form settings:
  - success message
  - store submissions toggle
  - notification email
  - submit button label
- [x] Port submission inbox from `FormSubmissions.tsx`.
- [x] Add submission statuses:
  - new
  - reviewed
  - archived
- [x] Add endpoints:
  - `GET /api/forms/:slug`
  - `POST /api/forms/:slug/submissions`
  - `GET /api/cms/forms/:slug/submissions`

## Phase 7 - Builder Region Model

- [x] Port the region-based builder concepts from `cms-gen/src/pages/Builder.tsx` into `_builder/client`.
- [x] Add named layout regions:
  - header
  - hero
  - main
  - side navigation
  - content above
  - content below
  - footer
- [x] Treat placed components as block instances with:
  - instance ID
  - component path
  - region
  - order
  - block config
  - CMS binding
  - visibility
- [x] Store layout JSON grouped by region.
- [x] Add per-region empty, locked, and validation states.
- [x] Add component library filtering by allowed region.
- [x] Add block movement between compatible regions.
- [x] Add duplicate, delete, hide, move up, and move down block actions.
- [x] Preserve static fallback rendering when CMS data is unavailable.

## Phase 8 - Block Configuration And CMS Binding

- [x] Add properties panel tabs:
  - Content
  - Style
  - CMS Binding
  - Region
  - Advanced
- [x] Generate block configuration controls from component config schema when available.
- [x] Keep inferred props as an MVP fallback for components without manifests.
- [x] Add CMS record binding UI:
  - collection
  - entry
  - field map
  - fallback mode
- [x] Add CMS collection binding UI:
  - collection
  - filters
  - sort
  - limit
  - grouping
  - field map
- [x] Add binding status messages:
  - bound and resolved
  - bound but no matching entries
  - missing collection
  - missing mapped field
  - using static fallback
- [x] Keep advanced raw binding JSON visible for debugging only.

## Phase 9 - Page Templates

- [x] Port template list from `cms-gen/src/pages/TemplateList.tsx`.
- [x] Port template detail/editor from `TemplateEditor.tsx`.
- [x] Add template records with:
  - template ID
  - label
  - route pattern
  - content type
  - layout ID
  - regions
  - default blocks
  - locked regions
- [x] Add template list columns:
  - name
  - route pattern
  - content type
  - layout
  - regions
  - validation status
  - actions
- [x] Add content preview mode that renders a selected CMS entry through the template.
- [x] Validate:
  - template route without content type or layout
  - missing required region
  - locked region changes
  - default block in unsupported region
  - binding references missing collection or field

## Phase 10 - Theme Manager And Theme Export

- [x] Port theme manager UI from `cms-gen/src/pages/ThemeManager.tsx`.
- [x] Add theme list columns:
  - theme name
  - version
  - active status
  - required collections
  - validation status
  - last exported
  - actions
- [x] Add theme detail sections:
  - overview
  - required collections
  - layout regions
  - page templates
  - assets
  - bindings
  - validation warnings
  - export history
- [x] Implement `th3 theme export`.
- [x] Generate portable theme output:
  - `theme.json`
  - `layouts/`
  - `pages/`
  - `regions/`
  - `partials/`
  - `components/`
  - `assets/`
  - `data/fallback/`
  - `bindings/`
  - `README.md`
- [x] Add export dialog options:
  - theme name
  - output folder
  - include compiled assets
  - include fallback data
  - include draft bindings
  - overwrite existing export
- [x] Add validation for required CMS collections, fields, regions, layouts, bindings, and component config schemas.

## Phase 11 - Preview And Publish

- [x] Port preview and publish workflow from `cms-gen/src/pages/PreviewPublish.tsx`.
- [x] Add preview controls:
  - device size
  - content source
  - draft/published status
  - active theme
  - refresh data
- [x] Add publish actions:
  - export CMS content
  - build theme
  - generate static output
  - open build folder
- [x] Add publish checklist:
  - required collections exist
  - required fields exist
  - no broken media links
  - no missing CMS bindings
  - theme export is current
  - content export is current
- [x] Add publish result states:
  - content exported
  - theme built
  - static output generated
  - build folder opened
  - publish failed
- [x] Add error details for failed checklist items.

## Phase 12 - API Console

- [x] Port API console from `cms-gen/src/pages/APIOverview.tsx`.
- [x] Add sections or tabs:
  - content endpoints
  - form endpoints
  - API tokens
  - CORS settings
  - webhooks placeholder
- [x] Add public content endpoints:
  - `GET /api/content/collections`
  - `GET /api/content/:collection`
  - `GET /api/content/:collection/:entryKey`
- [x] Add form endpoints to the console.
- [x] Add sample response previews.
- [x] Add copy buttons for endpoints, tokens, and sample responses.
- [x] Add API token states:
  - no tokens
  - token created
  - token revoked
  - token copied
- [x] Add loading and error states for endpoint/token data.

## Phase 13 - Settings

- [x] Port settings UI from `cms-gen/src/pages/Settings.tsx`.
- [x] Add sections:
  - General
  - CMS storage
  - Builder URLs
  - Theme paths
  - API
  - Users and roles placeholder
  - Import/export
- [x] Add settings for:
  - CMS admin URL
  - CMS base URL
  - Builder preview URL
  - local storage path
  - active theme
  - default content export path
  - default theme export path
- [x] Add import/export controls:
  - export CMS data
  - import CMS seed/content
  - validate imported schema/content
- [x] Add save success, validation warning, loading, and error states.

## Phase 14 - Shared UI Behavior

- [x] Port action menu behavior from `cms-gen/src/components/ActionMenu.tsx`.
- [x] Port confirmation dialog behavior from `ConfirmDialog.tsx`.
- [x] Replace `alert()` and `confirm()` flows with app-native dialogs and toast/inline feedback.
- [x] Add consistent feedback for:
  - save
  - publish
  - archive
  - duplicate
  - export
  - delete
- [x] Add disabled and loading states for long-running actions.
- [x] Apply empty/loading/success/error components across all major screens.
- [x] Normalize compact visual styling:
  - neutral backgrounds
  - clear borders
  - compact spacing
  - 8px or smaller card radius
  - restrained status colors
  - no decorative app gradients

## Phase 15 - Accessibility And Responsive Pass

- [x] Add accessible names for all icon-only buttons.
- [x] Add dialog semantics for modal surfaces.
- [x] Verify keyboard navigation for:
  - tables
  - dialogs
  - menus
  - tabs
  - drawers
- [x] Ensure visible focus states on all controls.
- [x] Connect validation errors to fields.
- [x] Avoid conveying status by color alone.
- [x] Add tablet behavior:
  - collapsible sidebar
  - properties panel as drawer
  - compact table/list rows
- [x] Add mobile behavior:
  - entry editing remains usable
  - tables convert to stacked rows
  - builder canvas becomes preview-only or simplified
- [x] Verify major screens at desktop, tablet, and mobile widths.

## Phase 16 - Build Performance Follow-Up

- [ ] If the real CMS admin moves to React/Vite, add route-level lazy imports for page components.
- [ ] Consider manual chunks for large shared dependencies.
- [ ] Track the `cms-gen` Vite warning about main JS chunk size over 500 KB as a reference risk.
- [ ] Keep performance optimization secondary until the feature port is stable.

## Verification

- [x] Run existing test suite with `npm test`.
- [ ] Add CMS admin tests for collection and entry CRUD.
- [ ] Add builder tests for region-based layout JSON and CMS binding compatibility.
- [ ] Add export tests for `html/data/cms/` and future `themes/<theme-name>/`.
- [ ] Verify `th3 builder` still does not mount CMS authoring routes.
- [ ] Verify `th3 cms serve` owns CMS admin and `/api/cms/*`.
- [ ] Verify static fallback partials still render when CMS data is missing.
- [ ] Verify exported CMS data can compile through the existing Panini/theme build path.

## Suggested Implementation Order

1. Reference audit and route ownership decisions.
2. CMS admin shell and shared UI primitives.
3. Dashboard, content modeling, and entry editing.
4. Media library and reusable media picker.
5. Forms and submissions.
6. Builder region model.
7. Block config and CMS binding panel.
8. Page template list/detail.
9. Theme manager and `th3 theme export`.
10. Preview and publish workflow.
11. API console and settings.
12. Accessibility, responsive behavior, and performance follow-up.

## Definition Of Done

- [ ] Editors can manage collections, fields, entries, media, and forms without editing raw JSON.
- [ ] Designers can place component blocks into named regions and bind them to CMS content without editing files.
- [ ] Page templates define route/content-type mappings, default region blocks, and locked regions.
- [ ] Developers can export and inspect a separated portable theme package.
- [ ] Publishers can validate, preview, export content, build the theme, and see clear result states.
- [ ] Public content and form APIs are visible in the API console with sample responses.
- [ ] Every important screen has useful empty, loading, success, and error states.
- [ ] The interface is compact, accessible, responsive, and operational.
