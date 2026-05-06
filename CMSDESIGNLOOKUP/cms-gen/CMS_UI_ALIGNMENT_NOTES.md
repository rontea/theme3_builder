# CMS UI Alignment Notes

This file tracks the updates needed for `cms-gen` to fully match the target UI described in:

```text
docs/cms-ui-design.md
```

## Current Match

`cms-gen` already matches the main UI direction:

- App shell with top bar, sidebar, and main workspace.
- Primary navigation for Dashboard, Content, Media, Forms, Builder, Themes, API, and Settings.
- Dashboard with metrics, recent activity, warnings, and quick actions.
- Content screens for collections, collection fields, entry lists, and entry editing.
- Visual builder screen with component library, canvas, toolbar, and properties panel.
- CMS binding panel concept with record mode and field mapping.
- Theme manager concept with active theme, validation, and export actions.
- Form builder concept with field settings and form settings.
- API overview with tokens and endpoint examples.
- Settings screen for project, ports, URLs, content export, and theme export paths.

## Required Updates

### 1. Media Library

Current state:

- `/media` is only a placeholder route in `src/App.tsx`.

Needed:

- Add `src/pages/MediaLibrary.tsx`.
- Add grid and list views.
- Add upload action.
- Add media cards with thumbnail, file name, type, dimensions, size, and used-by count.
- Add detail drawer or side panel.
- Add actions: rename, copy URL, replace file, delete.
- Add empty, loading, and error states.

### 2. Preview And Publish

Current state:

- Export buttons exist in Dashboard, Builder, and Theme Manager.
- There is no dedicated preview/publish workflow screen.

Needed:

- Add `src/pages/PreviewPublish.tsx` or add this workflow under Theme Manager.
- Add preview controls:
  - device size
  - content source: fallback, exported CMS, live CMS
  - status: draft or published
  - active theme
  - refresh data
- Add publish controls:
  - export CMS content
  - build theme
  - generate static output
  - open build folder
- Add publish checklist:
  - required collections exist
  - required fields exist
  - no broken media links
  - no missing CMS bindings
  - theme export is current
  - content export is current

### 3. Theme Manager

Current state:

- Shows one active theme and required collection validation.
- Provides quick actions for CMS content export and theme package export.

Needed:

- Add a full theme list table.
- Add theme detail sections:
  - overview
  - required collections
  - template list
  - asset list
  - binding list
  - validation warnings
  - export history
- Add actions:
  - activate
  - preview
  - validate
  - export
  - open folder
  - delete
- Add theme export dialog with:
  - theme name
  - output folder
  - include compiled assets
  - include fallback data
  - include draft bindings
  - overwrite existing export
- Add post-export result state with generated path, files, warnings, and next steps.

### 4. Forms

Current state:

- `src/pages/FormBuilder.tsx` shows a single form builder screen.

Needed:

- Add a form list screen.
- Add a submission inbox.
- Add submission statuses:
  - new
  - reviewed
  - archived
- Add form settings fields:
  - success message
  - store submissions toggle
  - notification email
  - submit button label
  - spam protection placeholder

### 5. CMS Binding Panel

Current state:

- Builder has a CMS Binding tab with enable toggle, mode, collection, entry, and field map.
- It mostly demonstrates record binding.

Needed:

- Add collection mode controls:
  - filters
  - sort
  - limit
  - grouping
  - fallback mode
- Add binding status states:
  - bound and resolved
  - bound but no matching entries
  - missing collection
  - missing mapped field
  - using static fallback
- Add raw binding JSON under Advanced.
- Add resolved data debug preview under Advanced.

### 6. Collection Builder

Current state:

- Field list and field settings exist.
- Field type list is short.

Needed:

- Add remaining field types:
  - boolean
  - select
  - date
  - URL
  - reference
  - repeater
- Add duplicate field action.
- Add validation settings.
- Add default value controls.
- Add empty state when no fields exist.

### 7. Entry Editor

Current state:

- Entry editor has core fields and a publish panel.

Needed:

- Make the editor schema-driven instead of hardcoded to project fields.
- Add `Save Draft`, `Publish`, and `Archive` actions.
- Add updated-by and revision info placeholders.
- Add theme usage info for all pages/components using the entry.
- Add field-level validation and error states.

### 8. Empty, Loading, And Error States

Current state:

- Most screens use static sample data.

Needed:

- Add reusable empty state component.
- Add reusable loading state component.
- Add reusable error state component.
- Add empty states for:
  - no collections
  - no entries
  - no media
  - no themes exported
  - no matching CMS data
- Add inline validation for forms.
- Add toast or alert feedback for save/export actions.

### 9. Visual Style Tightening

Current state:

- The UI uses a good neutral operational style.
- Many panels use `rounded-xl`.

Needed:

- Reduce repeated item/card radius to `rounded-lg` or `rounded-md` to match the design target of 8px or less.
- Keep dense admin screens compact.
- Avoid oversized card styling for table-heavy screens.
- Replace custom placeholder icons in quick actions with lucide icons.
- Keep status colors limited and meaningful.

### 10. Encoding Cleanup

Current state:

- Some text has encoding artifacts.

Known examples:

- `src/layout/TopBar.tsx`: global search placeholder renders malformed shortcut text.
- `src/pages/CollectionBuilder.tsx`: breadcrumb arrow renders malformed text.
- `src/pages/EntriesList.tsx`: breadcrumb arrow renders malformed text.
- `src/pages/EntryEditor.tsx`: breadcrumb arrow renders malformed text.
- `src/pages/ThemeManager.tsx`: last exported separator renders malformed text.

Needed:

- Replace malformed characters with plain ASCII:
  - use `< Content`
  - use `< Entries`
  - use `Cmd+K` or `Ctrl+K`
  - use `-` as date/text separator

## Suggested Implementation Order

1. Fix encoding issues.
2. Add reusable UI state components.
3. Add Media Library.
4. Expand CMS Binding panel.
5. Expand Theme Manager and export dialog.
6. Add Preview and Publish workflow.
7. Add Form List and Submission Inbox.
8. Make Entry Editor schema-driven.
9. Tighten visual radius and spacing.

## Definition Of Done

`cms-gen` matches the CMS UI design when:

- Every primary navigation item opens a real screen.
- Every major screen has loading, empty, success, and error states.
- Editors can manage content without raw JSON for normal tasks.
- Designers can bind builder components to CMS content without editing files.
- Developers can inspect and export a separated theme package.
- Publishers can validate, preview, export, and build with clear status feedback.
