# CMS Design Implementation Mapping

This document maps the `CMSDESIGNLOOKUP/cms-gen` reference UI to the real Theme 3 Builder implementation targets.

Reference reviewed: 2026-05-07.

## Implementation Decision

Use `CMSDESIGNLOOKUP/cms-gen` as the visual, interaction, and screen-coverage reference, not as a direct app replacement.

For the next implementation pass, keep the existing ownership model:

- `theme-cms/` remains the standalone CMS authoring app and owns CMS writes.
- `_builder/` remains the visual builder and owns layout composition plus read-only CMS binding preview.
- `html/` remains the current theme/page output surface.
- Future `themes/<theme-name>/` output becomes the portable generated theme package.

Do not move the real CMS admin to React/Vite as part of the first port. The root project currently uses a plain `theme-cms/admin` shell, and the repo does not yet have a root admin bundling pipeline. Port the UX, route structure, components, and states from `cms-gen` into the existing admin first. A bundled React admin can be reconsidered after the CMS API, region model, templates, and theme export contract are stable.

## Route And Ownership Mapping

| `cms-gen` route | Reference screen | Real owner | Real target |
| --- | --- | --- | --- |
| `/` | Dashboard | CMS | `theme-cms/admin` dashboard view backed by `theme-cms/server` summary APIs |
| `/content` | Collection list | CMS | `theme-cms/admin` collections view and `/api/cms/collections` |
| `/content/collections/new` | Collection builder | CMS | `theme-cms/admin` schema editor and `/api/cms/collections` |
| `/content/collections/:slug` | Entry list | CMS | `theme-cms/admin` entries view and `/api/cms/entries?collection=:slug` |
| `/content/collections/:slug/entries/new` | Entry editor | CMS | `theme-cms/admin` schema-driven entry editor |
| `/content/collections/:slug/entries/:id` | Entry editor | CMS | `theme-cms/admin` schema-driven entry editor |
| `/media` | Media library | CMS | New CMS media screen, metadata storage, and media APIs under `theme-cms/` |
| `/forms` | Form list | CMS | New CMS forms screen and form definition APIs |
| `/forms/new` | Form builder | CMS | New CMS form builder |
| `/forms/:formId` | Form builder | CMS | New CMS form builder |
| `/forms/:formId/submissions` | Submission inbox | CMS | New CMS submission inbox and submission APIs |
| `/builder` | Visual builder | Builder | `_builder/client` page editor; CMS admin should open configured builder URL |
| `/templates` | Template list | Builder and Theme | Builder/template management UI backed by saved layouts and future theme metadata |
| `/templates/:id` | Template editor | Builder and Theme | Builder/template editor for route/content-type mapping and region defaults |
| `/themes` | Theme manager | Theme and CMS | New theme manager UI for active theme, validation, and export history |
| `/api` | API console | CMS | CMS API console backed by `/api/cms/*`, `/api/content/*`, and form endpoints |
| `/publish` | Preview and publish | CMS, Builder, Theme | CMS content export, theme export/build, static output checklist |
| `/settings` | Settings | CMS | CMS settings UI for storage, URLs, theme paths, API, import/export |

## Reference Screen Inventory

| Reference file | Purpose | Port target |
| --- | --- | --- |
| `src/App.tsx` | Route map and global toaster | Use as route coverage checklist for `theme-cms/admin` and builder/theme features |
| `src/layout/AppLayout.tsx` | App shell composition | `theme-cms/admin/index.html`, `styles.css`, `app.js` shell refactor |
| `src/layout/TopBar.tsx` | Project, environment, search, status, user actions | CMS top bar |
| `src/layout/Sidebar.tsx` | Primary navigation | CMS sidebar with builder handoff link |
| `src/pages/Dashboard.tsx` | Metrics, activity, warnings, quick actions | CMS dashboard |
| `src/pages/CollectionsList.tsx` | Collection table and actions | CMS content modeling |
| `src/pages/CollectionBuilder.tsx` | Schema-driven field editor | CMS collection editor |
| `src/pages/EntriesList.tsx` | Entry table, filters, bulk actions | CMS entry list |
| `src/pages/EntryEditor.tsx` | Schema-driven entry editor | CMS entry editor |
| `src/pages/MediaLibrary.tsx` | Media grid/list/detail/actions | CMS media library |
| `src/components/MediaPickerModal.tsx` | Shared media picker | CMS fields and builder properties integration |
| `src/pages/FormsList.tsx` | Form list | CMS forms |
| `src/pages/FormBuilder.tsx` | Form structure editor | CMS forms |
| `src/pages/FormSubmissions.tsx` | Submission inbox | CMS forms |
| `src/pages/Builder.tsx` | Region canvas, block config, CMS binding concepts | `_builder/client` region model and properties panel |
| `src/pages/TemplateList.tsx` | Page template list | Builder/theme template management |
| `src/pages/TemplateEditor.tsx` | Route/content-type mapping and region defaults | Builder/theme template management |
| `src/pages/ThemeManager.tsx` | Theme list, validation, export dialog | Theme manager and `th3 theme export` workflow |
| `src/pages/PreviewPublish.tsx` | Preview controls and publish checklist | CMS publish screen plus theme build/export actions |
| `src/pages/APIOverview.tsx` | Developer API console | CMS API screen |
| `src/pages/Settings.tsx` | CMS settings sections | CMS settings |

## Shared UI Primitive Inventory

Port these first because they unlock consistent behavior across later screens:

- `AppLayout`: stable top bar, sidebar, workspace shell.
- `TopBar`: project/site identity, environment badge, search, status, user/menu placeholder.
- `Sidebar`: primary navigation and active state.
- `ActionMenu`: row and object action menus.
- `ConfirmDialog`: destructive-action confirmation.
- `EmptyState`: useful no-data and no-match states.
- `LoadingState`: screen and panel loading states.
- `ErrorState`: retryable failures.
- `MediaPickerModal`: reusable asset selection and upload workflow.

## Boundary Rules

- CMS authoring mutations stay in `theme-cms/server` under `/api/cms/*`.
- Builder CMS reads stay under `/api/builder/cms/*` and read exported JSON by default.
- Builder opens CMS through configured `cmsAdminUrl`.
- CMS opens Builder through configured builder URL.
- CMS entries supply content only; they do not own page layout.
- Builder layout JSON owns block placement, order, props, and `cmsBinding`.
- Theme export owns portable templates, assets, fallback data, and binding metadata.
- Static partial fallback behavior must remain intact.

## Follow-Up Decisions

These are intentionally deferred until the mapped features are more stable:

- Whether to replace `theme-cms/admin` with a React/Vite bundled admin.
- Whether template management lives primarily in the CMS admin, the builder UI, or both with different editing modes.
- Whether server-render mode should be implemented after static export mode.
- Whether media files are copied into `theme-cms/`, `html/`, generated `themes/`, or all three through explicit export options.
