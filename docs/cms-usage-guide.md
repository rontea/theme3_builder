# Theme CMS Usage Guide

This guide explains how to use the standalone Theme CMS day to day. It is written for editors, designers, and developers who need to manage content, media, forms, theme exports, and publish handoff without editing raw files first.

For command-only startup details, see `docs/cms-runbook.md`. For builder binding details, see `docs/cms-builder-workflow.md`.

## Quick Start

Run the CMS server from the project root:

```bash
th3 cms serve
```

Open:

```text
http://localhost:3100/cms
```

Optional first-time seed:

```bash
th3 cms migrate-content
```

The CMS stores authoring data in:

```text
theme-cms/data/cms.sqlite
```

The CMS exports builder/theme bridge data to:

```text
html/data/cms/
```

## How The CMS Fits With The Builder

The CMS and builder are separate tools:

- `th3 cms serve` owns CMS authoring, CMS settings, media metadata, forms, publish workflow, and `/api/cms/*`.
- `th3 builder` owns page layout, placed blocks, regions, preview, and `cmsBinding` metadata.
- The builder reads CMS data from exported JSON by default.

Typical flow:

1. Start the CMS with `th3 cms serve`.
2. Create or edit collections, entries, media, forms, and settings.
3. Use `Publish` or `th3 cms export` to refresh exported CMS data.
4. Start or refresh the builder with `th3 builder`.
5. Place blocks and bind them to CMS data in the builder properties panel.
6. Save layouts, export themes, and generate static output.

## App Navigation

The CMS sidebar contains the main work areas:

- `Dashboard`: overview, warnings, activity, and quick actions.
- `Content`: entry list and entry editor.
- `Collections`: content model/schema builder.
- `Media`: uploaded assets and file metadata.
- `Forms`: form definitions, field builder, and submissions.
- `Builder`: opens the configured builder URL.
- `Templates`: placeholder route for page templates in the CMS shell.
- `Themes`: theme validation and portable theme export.
- `API`: public endpoint examples, local API tokens, and CORS notes.
- `Publish`: preview controls, preflight checklist, content/theme/static build actions.
- `Settings`: workspace URLs, paths, active theme, and import/export.

## Dashboard

Use the dashboard to see what needs attention before publishing.

The dashboard shows:

- draft entry count
- published entry count
- active theme status
- validation warnings
- recent activity
- quick actions

Useful quick actions:

- `Create Collection`: jump to the collection builder.
- `Create Entry`: jump to the content editor.
- `Upload Media`: jump to media.
- `Open Builder`: open the configured builder URL.
- `Export Content`: export CMS bridge JSON.
- `Export Theme`: open the theme export dialog.

## Collections

Collections define the structure of content. Examples include `projects`, `insights`, `supporters`, and `cta_blocks`.

To create a collection:

1. Open `Collections`.
2. Click `New Collection`.
3. Enter a stable `Slug`, such as `projects`.
4. Enter a readable `Name`, such as `Projects`.
5. Choose a template or keep `Custom`.
6. Add fields in the field builder.
7. Click `Save Collection`.

Supported field types:

- `text`
- `textarea`
- `richtext`
- `number`
- `boolean`
- `select`
- `date`
- `image`
- `url`
- `slug`
- `reference`
- `repeater`

Field controls:

- move fields up or down
- duplicate a field
- delete a field
- mark fields required
- edit label, name, type, options, and validation

Notes:

- Keep field names stable once entries exist. Renaming a field changes where new editor values are saved.
- Required fields are validated in the entry editor.
- The advanced schema JSON panel is available for debugging and recovery, but normal editing should use the field builder.

## Entries

Entries are content records inside a collection.

To create an entry:

1. Open `Content`.
2. Select a collection from the content type rail or collection selector.
3. Click `New Entry`.
4. Enter an `Entry Key`, such as `homepage-hero` or `project-alpha`.
5. Choose a status:
   - `Draft`
   - `Published`
   - `Archived`
6. Fill out the schema-driven fields.
7. Click `Save Entry`.

Entry list tools:

- search entries
- filter by status
- sort by sort order, title, newest, or oldest
- select multiple entries
- bulk publish, archive, or delete
- row action menu for edit, duplicate, archive, and delete

Validation:

- Required field errors appear inline.
- Invalid fields are marked with `aria-invalid`.
- Error text is connected to the relevant field for assistive technology.

Entry status guidance:

- Use `Draft` while editing.
- Use `Published` for content intended for exported/public output.
- Use `Archived` to keep content stored but out of normal publishing workflows.

## Media

Use `Media` to upload, browse, search, and manage file records.

Available actions:

- upload files
- switch grid/list view
- search assets
- select a file to open details
- rename a file
- copy URL
- replace file
- delete file

Image fields in entries include a `Browse` button that opens the media picker. Select an asset and click `Insert Asset` to fill the image URL.

Current caveat:

- The reusable picker is wired for entry image fields. Form image settings and builder component properties may still use their existing controls until those integrations are completed.

## Forms

Use `Forms` to define website forms and review submissions.

To create a form:

1. Open `Forms`.
2. Click `Create Form`.
3. Enter form `Name`, `Slug`, and `Status`.
4. Add fields in the field builder.
5. Configure form settings.
6. Click `Save Form`.

Supported form field settings:

- label
- name
- type
- required
- placeholder
- validation
- options for select fields

Form settings:

- success message
- store submissions toggle
- notification email
- submit button label

Submission inbox:

- search submissions
- filter by `new`, `reviewed`, or `archived`
- mark submissions reviewed
- archive submissions
- move submissions back to inbox

Public form endpoints:

```text
GET  /api/forms/:slug
POST /api/forms/:slug/submissions
```

CMS submission endpoint:

```text
GET /api/cms/forms/:slug/submissions
```

## Themes

Use `Themes` to inspect active theme requirements and export a portable theme package.

The theme list shows:

- theme name
- version
- active status
- required collections
- validation status
- last exported time
- actions

The theme detail panel includes:

- overview
- required collections
- regions
- templates
- assets
- bindings
- validation warnings
- export history

To export a theme package:

1. Open `Themes`.
2. Select the theme.
3. Click `Export Theme Package`.
4. Confirm theme name and output folder.
5. Choose export options.
6. Click `Run Export`.

Theme export output includes:

```text
themes/<theme-name>/
|-- theme.json
|-- layouts/
|-- pages/
|-- regions/
|-- partials/
|-- components/
|-- assets/
|-- data/fallback/
|-- bindings/
|-- README.md
```

## Publish

Use `Publish` to validate and generate CMS/theme/static output.

Before publishing, review the checklist:

- required collections exist
- required fields exist
- no broken media links
- no missing CMS bindings
- theme export is current
- content export is current

Preview controls:

- device size
- content source
- content status
- active theme
- include drafts
- include archived entries
- refresh preview

Publish actions:

- `Generate Build`: runs the publish workflow.
- `Open Build Folder`: resolves the build output path.

The publish result panel records generated time, status, build path, site URL, steps, and checklist results.

## Settings

Use `Settings` for workspace-level configuration.

Important settings:

- project name
- active theme
- local storage path
- CMS base URL
- CMS admin URL
- site preview URL
- builder URL
- default content export path
- default theme export path
- API endpoint
- API token

Import/export actions:

- `Export Data`: creates a JSON snapshot of collections, entries, and forms.
- `Choose File`: selects a previously exported snapshot.
- `Validate`: validates selected snapshot content before import.
- `Import`: imports matching collections, entries, and forms.

Use import carefully. Existing matching records can be updated.

## API Console

Use `API` to inspect public endpoints and local integration examples.

Tabs:

- `API Tokens`
- `Content Endpoints`
- `Form Endpoints`
- `CORS Settings`
- `Webhooks`

Public content endpoints:

```text
GET /api/content/collections
GET /api/content/:collection
GET /api/content/:collection/:entryKey
```

Use copy buttons to copy endpoint paths, sample responses, or token values.

## Export Commands

Export CMS bridge data:

```bash
th3 cms export
```

Include drafts:

```bash
th3 cms export --include-drafts
```

Preview export:

```bash
th3 cms export --preview
```

Custom output:

```bash
th3 cms export --output ./html/data/cms
```

## Accessibility And Keyboard Use

The CMS admin supports:

- visible focus states
- icon button accessible names
- dialog roles and focus trapping
- Escape to close active dialogs/menus
- arrow-key navigation for menus and tabs
- inline validation messages connected to fields
- stacked table labels on mobile
- responsive sidebar and drawer behavior

## Troubleshooting

CMS admin does not open:

- Confirm `th3 cms serve` is running.
- Check `http://localhost:3100/cms`.
- If using a custom port, use `th3 cms serve --port <port>`.

Builder does not show latest content:

- Run `th3 cms export`.
- Restart or refresh the builder.
- Confirm exported files exist in `html/data/cms/`.

Builder opens the wrong CMS URL:

- Update the builder URL settings in CMS Settings.
- Or run the builder with:

```bash
th3 builder --cms-admin-url http://localhost:3100/cms
```

Required entry fields will not save:

- Fill every field marked required.
- Check inline error messages in the entry editor.
- If a field name recently changed, verify the collection schema and entry data still line up.

Theme export fails:

- Review theme validation warnings.
- Check required collections and fields.
- Confirm export output path and overwrite options.

Import fails:

- Validate the snapshot first.
- Confirm the selected file is valid JSON.
- Review the import result panel for details.

## Current Limits

- The CMS admin is still a plain HTML/CSS/JS implementation under `theme-cms/admin`.
- The builder remains a separate process and does not host CMS authoring routes.
- The reusable media picker is fully wired for entry image fields; other picker entry points are tracked separately.
- Deeper automated CMS admin CRUD coverage is still tracked in `todo/cms-design-update-todo.md`.
