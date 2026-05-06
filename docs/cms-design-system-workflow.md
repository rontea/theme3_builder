# CMS Design System And Workflow

This document describes the recommended CMS design for Theme 3 Builder. The goal is to let users manage content easily, assemble pages visually, render through theme partials, and expose content through a headless API.

## Feasibility

Yes, this is possible with the current CMS direction.

The repository already has the core pieces needed:

- `th3 builder` for visual page composition and drag-and-drop layout building.
- `th3 cms serve` for standalone CMS authoring and `/api/cms/*` APIs.
- `theme-cms/data/cms.sqlite` for CMS storage.
- `html/data/cms/` as the export bridge between CMS content and the theme builder.
- `cmsBinding` metadata stored on builder component instances.
- Component partials in `html/partials/**/*.html`, similar in spirit to Twig partials.

The best architecture is not to merge everything into one process. The cleaner design is:

- CMS owns content models, entries, forms, publishing, and headless APIs.
- Builder owns page layout, component selection, drag-and-drop composition, and CMS bindings.
- Theme owns partial templates, static fallback markup, styling, and final HTML output.

## Product Layout

### 1. CMS Admin

The CMS admin is the authoring area for editors and content managers.

Default URL:

```bash
http://localhost:3100/cms
```

Primary screens:

- Dashboard
- Collections
- Entries
- Media
- Forms
- Templates
- API
- Settings

Recommended navigation:

```text
CMS
|-- Dashboard
|-- Content
|   |-- Collections
|   |-- Entries
|   |-- Drafts
|   |-- Published
|-- Media
|-- Forms
|-- Templates
|-- API
|-- Settings
```

### 2. Visual Builder

The builder is the page assembly area.

Default URL:

```bash
http://localhost:8000
```

Primary screens:

- Project dashboard
- Page list
- Page editor
- Component sidebar
- Canvas
- Properties panel
- CMS binding panel
- Preview

Recommended editor layout:

```text
+-------------------------------------------------------------+
| Top Bar: Project, Page, Save, Preview, Open CMS             |
+---------------+-----------------------------+---------------+
| Components    | Canvas                      | Properties    |
|               |                             |               |
| - Home        | Drag/drop partials here     | Component     |
| - About       |                             | Props         |
| - Project     |                             | CMS Binding   |
| - Blog        |                             | Visibility    |
| - Micro       |                             |               |
+---------------+-----------------------------+---------------+
```

### 3. Theme Templates

Theme templates stay in the existing project structure:

```text
html/
|-- layouts/
|-- pages/
|-- partials/
|-- data/
|   |-- cms/
```

Templates should remain usable without CMS data. CMS-bound partials should always include static fallback markup.

### 4. Generated Theme Package

The builder should be able to generate a separated theme folder after the design is complete. This is similar to the Twig model used by many CMS platforms: the theme contains layout and presentation files, while the CMS supplies content.

Recommended command:

```bash
th3 theme export
```

Recommended output:

```text
themes/
|-- my-theme/
|   |-- theme.json
|   |-- layouts/
|   |-- pages/
|   |-- partials/
|   |-- components/
|   |-- assets/
|   |   |-- css/
|   |   |-- js/
|   |   |-- img/
|   |-- data/
|   |   |-- fallback/
|   |-- bindings/
|   |-- README.md
```

The generated theme should be portable. It should not depend on the builder UI. Once exported, developers can edit the theme folder directly, add CMS-aware template tags, adjust markup, and connect the theme to the CMS.

Recommended `theme.json`:

```json
{
  "name": "My Theme",
  "version": "1.0.0",
  "engine": "theme3",
  "templateSyntax": "handlebars-compatible",
  "cms": {
    "requiredCollections": ["projects", "insights", "cta_blocks"],
    "bindingMode": "cmsBinding",
    "fallback": "static"
  },
  "assets": {
    "css": ["assets/css/styles.css"],
    "js": ["assets/js/main.js"]
  }
}
```

## System Architecture

```text
+-------------------+        export JSON        +-------------------+
| Theme CMS         | -------------------------> | Theme Builder     |
| th3 cms serve     |                            | th3 builder       |
|                   |                            |                   |
| Owns:             |                            | Owns:             |
| - collections     |                            | - projects        |
| - entries         |                            | - pages           |
| - forms           |                            | - layouts         |
| - media metadata  |                            | - components      |
| - API             |                            | - cmsBinding      |
+---------+---------+                            +---------+---------+
          |                                                |
          | headless API                                   | save page
          v                                                v
+-------------------+                            +-------------------+
| External clients  |                            | Theme output      |
| websites/apps     |                            | html/pages        |
| integrations      |                            | build/            |
+-------------------+                            +-------------------+
```

## Theme Separation Architecture

The long-term model should separate four layers:

```text
Builder Project
|-- Used by designers to compose pages visually.
|-- Produces saved layouts and a theme export.

Generated Theme
|-- Contains templates, partials, assets, fallback data, and binding metadata.
|-- Can be edited by developers after export.
|-- Does not own CMS entries.

Theme CMS
|-- Owns content models, entries, forms, media, publishing, and APIs.
|-- Supplies content to the generated theme.

Runtime Site
|-- Renders the generated theme with CMS content.
|-- Can be static, server-rendered, or headless/API-driven.
```

This is the recommended target because it prevents the builder from becoming the CMS runtime. The builder becomes a theme design tool. The CMS becomes the content system. The theme becomes the contract between them.

## Generated Theme Workflow

### Designer Workflow

1. Start the builder:

   ```bash
   th3 builder
   ```

2. Design pages using drag-and-drop components.
3. Configure component props and CMS bindings.
4. Preview with static fallback content or exported CMS content.
5. Save the builder layout.
6. Export the theme:

   ```bash
   th3 theme export --name my-theme
   ```

### Developer Workflow

1. Open the generated folder:

   ```text
   themes/my-theme/
   ```

2. Edit templates, partials, assets, and binding files.
3. Add CMS-aware template logic where needed.
4. Keep fallback content available for local development.
5. Register the theme with the CMS.
6. Test the theme against CMS content.

### CMS Editor Workflow

1. Start the CMS:

   ```bash
   th3 cms serve
   ```

2. Select the active theme.
3. Create or edit content entries.
4. Publish content.
5. Preview the site using the selected theme.

## Theme Export Contract

The theme export should copy or generate:

- Layout templates from `html/layouts/`.
- Page templates from saved builder pages.
- Partial templates from `html/partials/`.
- CSS, JS, image, font, and resource assets from `src/` and `build/`.
- CMS binding metadata from saved layout JSON.
- Fallback content for local theme development.
- A `theme.json` manifest.
- Optional collection requirements for CMS setup validation.

Recommended generated binding file:

```text
themes/my-theme/bindings/pages/home.json
```

Example:

```json
{
  "page": "home",
  "components": [
    {
      "componentPath": "home/projects.html",
      "mode": "collection",
      "collection": "projects",
      "selection": {
        "filter": {
          "active": true,
          "featured": true
        },
        "sort": "sort_order:asc",
        "limit": 6
      },
      "fieldMap": {
        "title": "title",
        "summary": "summary",
        "imageSrc": "image_src",
        "href": "detail_url"
      }
    }
  ]
}
```

## Theme Runtime Modes

The generated theme can support three runtime modes.

### Static Export Mode

The CMS exports JSON into the theme or project:

```bash
th3 cms export
th3 theme build --theme themes/my-theme
```

Use this for static sites and simple deployments.

### Server Render Mode

The CMS server loads the active theme and renders pages with live CMS data.

Use this when the CMS is the website backend.

### Headless Mode

The theme is used by a frontend app, and content is fetched through API endpoints.

Use this for Jamstack, SPA, mobile apps, or third-party integrations.

## Runtime Responsibilities

### CMS Responsibilities

The CMS should own:

- Collection definitions
- Field schemas
- Entry CRUD
- Draft and published status
- Form definitions
- Form submissions
- Media records
- Content export
- Headless API responses
- Content validation
- User roles later

### Builder Responsibilities

The builder should own:

- Projects
- Pages
- Visual component placement
- Component ordering
- Component props
- CMS binding metadata
- Preview rendering
- Static fallback rendering
- Final page generation

The builder should not create, update, or delete CMS entries directly. It should read CMS data through exported JSON by default, with optional live API mode for preview.

### Theme Responsibilities

The theme should own:

- Layout files
- Page templates
- Partial templates
- Component markup
- CSS and JS assets
- Static fallback content
- Template helpers
- Theme manifest
- Theme-specific binding defaults

The generated theme should not own CMS content records. It may include fallback sample data, but real content should come from the CMS.

## Data Model

### Collections

A collection defines a reusable content type.

Examples:

- `pages`
- `supporters`
- `projects`
- `insights`
- `cta_blocks`
- `team_members`
- `forms`
- `form_submissions`

Recommended collection record:

```json
{
  "slug": "projects",
  "name": "Projects",
  "schema": {
    "fields": [
      { "name": "title", "label": "Title", "type": "text", "required": true },
      { "name": "slug", "label": "Slug", "type": "slug", "required": true },
      { "name": "summary", "label": "Summary", "type": "textarea" },
      { "name": "image_src", "label": "Image", "type": "image" },
      { "name": "featured", "label": "Featured", "type": "boolean" },
      { "name": "active", "label": "Active", "type": "boolean" },
      { "name": "sort_order", "label": "Sort Order", "type": "number" }
    ]
  }
}
```

### Entries

An entry is one content item inside a collection.

Recommended entry record:

```json
{
  "id": 1,
  "collection": "projects",
  "entryKey": "brand-refresh",
  "status": "published",
  "sortOrder": 1,
  "data": {
    "title": "Brand Refresh",
    "slug": "brand-refresh",
    "summary": "A complete visual identity refresh.",
    "image_src": "/img/projects/brand-refresh.jpg",
    "featured": true,
    "active": true,
    "sort_order": 1
  }
}
```

### Forms

Forms should be treated as first-class CMS-managed structures.

Recommended form model:

```json
{
  "slug": "contact",
  "name": "Contact Form",
  "fields": [
    { "name": "name", "label": "Name", "type": "text", "required": true },
    { "name": "email", "label": "Email", "type": "email", "required": true },
    { "name": "message", "label": "Message", "type": "textarea", "required": true }
  ],
  "settings": {
    "storeSubmissions": true,
    "successMessage": "Thanks. We will get back to you soon."
  }
}
```

Form submissions can be stored in a dedicated collection or in dedicated tables later:

- `cms_forms`
- `cms_form_fields`
- `cms_form_submissions`

For the MVP, JSON storage is acceptable and consistent with the current CMS direction.

## Template And Binding Model

The theme can keep using partial files such as:

```text
html/partials/home/projects.html
html/partials/home/insights.html
html/partials/about/about_cta.html
```

The builder stores CMS binding metadata on a component instance.

### Record Binding

Use `record` mode for one content item, such as a CTA block.

```json
{
  "cmsBinding": {
    "source": "cms",
    "mode": "record",
    "collection": "cta_blocks",
    "selection": {
      "filter": {
        "key": "about-cta",
        "active": true
      }
    },
    "fieldMap": {
      "heading": "heading",
      "buttonLabel": "button_label",
      "buttonUrl": "button_url"
    },
    "fallback": "static"
  }
}
```

### Collection Binding

Use `collection` mode for lists, cards, grids, and repeaters.

```json
{
  "cmsBinding": {
    "source": "cms",
    "mode": "collection",
    "collection": "projects",
    "selection": {
      "filter": {
        "active": true,
        "featured": true
      },
      "sort": "sort_order:asc",
      "limit": 6
    },
    "fieldMap": {
      "title": "title",
      "summary": "summary",
      "imageSrc": "image_src",
      "imageAlt": "image_alt",
      "href": "detail_url"
    },
    "fallback": "static"
  }
}
```

### Template Rule

Every CMS-ready partial should support this rule:

```text
If CMS data exists and matches the binding, render CMS data.
If CMS data is missing, stale, or invalid, render the static partial markup.
```

This keeps the theme reliable during editing, previewing, and publishing.

## Headless API Design

The standalone CMS should expose authoring and read APIs.

### Admin API

These endpoints are for the CMS admin UI.

```text
GET    /api/cms/collections
POST   /api/cms/collections
PUT    /api/cms/collections/:slug
DELETE /api/cms/collections/:slug

GET    /api/cms/entries?collection=projects
POST   /api/cms/entries
PUT    /api/cms/entries/:id
DELETE /api/cms/entries/:id
```

### Public Headless API

These endpoints are for external consumers.

```text
GET /api/content/collections
GET /api/content/:collection
GET /api/content/:collection/:entryKey
GET /api/content/:collection?status=published&limit=10
```

Recommended public response:

```json
{
  "success": true,
  "data": [
    {
      "collection": "projects",
      "entryKey": "brand-refresh",
      "status": "published",
      "data": {
        "title": "Brand Refresh"
      }
    }
  ],
  "meta": {
    "total": 1,
    "limit": 10,
    "offset": 0
  }
}
```

### Builder Read API

The builder should continue using read-only endpoints:

```text
GET /api/builder/cms/collections
GET /api/builder/cms/entries?collection=projects
```

These should read from `html/data/cms/` by default.

## Publishing Workflow

### Content Editor Workflow

1. Start the CMS:

   ```bash
   th3 cms serve
   ```

2. Open the CMS admin:

   ```text
   http://localhost:3100/cms
   ```

3. Create or edit collections.
4. Create or edit entries.
5. Mark entries as draft or published.
6. Export published content:

   ```bash
   th3 cms export
   ```

7. The export writes bridge data into:

   ```text
   html/data/cms/
   ```

### Page Designer Workflow

1. Start the builder:

   ```bash
   th3 builder
   ```

2. Create or open a project.
3. Create or open a page.
4. Drag partial components onto the canvas.
5. Select a component.
6. Configure properties and CMS binding.
7. Preview the page.
8. Save the page.
9. The builder writes:

   ```text
   _builder/layouts/*.json
   html/pages/*.html
   ```

### Developer Workflow

1. Create or update theme partials in `html/partials/`.
2. Add static fallback content.
3. Add default CMS binding metadata where appropriate.
4. Add or update seed data in `theme-cms/seeds/`.
5. Run migration/export:

   ```bash
   th3 cms migrate-content
   th3 cms export
   ```

6. Test in the builder.
7. Run the theme build:

   ```bash
   th3 build-init
   ```

## Drag-And-Drop Workflow

The drag-and-drop builder should use components as structured records, not raw HTML blobs.

Recommended component instance shape:

```json
{
  "instanceId": "component_123",
  "componentPath": "home/projects.html",
  "order": 1,
  "props": {
    "heading": "Selected Work",
    "cmsBinding": {
      "source": "cms",
      "mode": "collection",
      "collection": "projects"
    }
  }
}
```

Recommended behavior:

1. Sidebar scans `html/partials/**/*.html`.
2. User drags a component identity onto the canvas.
3. Builder creates a component instance.
4. Canvas renders the partial preview.
5. Properties panel edits props and binding.
6. Save stores layout JSON.
7. Final page generation composes ordered components.

## Form Builder Workflow

Forms should be manageable from the CMS and usable in the builder.

Recommended workflow:

1. CMS user creates a form definition.
2. CMS user adds fields, validation, and success message.
3. Builder user drags a `form` component onto a page.
4. Builder user binds the component to a CMS form slug.
5. Preview renders the form from the form schema.
6. Published page submits to a CMS form endpoint.
7. CMS stores submissions and optionally triggers notifications.

Recommended form endpoints:

```text
GET  /api/forms/:slug
POST /api/forms/:slug/submissions
GET  /api/cms/forms/:slug/submissions
```

## Roles And Permissions

MVP can run without roles, but the scalable model should support:

- Admin: manage settings, collections, entries, templates, users.
- Designer: use builder, bind components, save pages.
- Editor: create and edit content entries.
- Publisher: publish entries and export content.
- Viewer: read-only access.

## Recommended Roadmap

### Phase 1: Stabilize Current CMS

- Keep CMS and builder as separate processes.
- Keep builder read-only for CMS data.
- Finish any remaining checklist items in `todo/cms-separation-checklist.md`.
- Confirm `th3 builder` does not mount CMS authoring routes.

### Phase 2: Improve Authoring UX

- Add schema-driven entry forms instead of raw JSON editing.
- Add field types: text, textarea, rich text, image, boolean, number, select, date, reference.
- Add better validation messages.
- Add draft/published filtering.

### Phase 3: Improve Template Binding

- Add default bindings per CMS-ready partial.
- Add a visual binding editor.
- Add repeater controls for list/grid sections.
- Add binding preview data in the properties panel.

### Phase 4: Add Theme Export

- Add `th3 theme export`.
- Generate a portable `themes/<theme-name>/` folder.
- Add `theme.json`.
- Copy layouts, pages, partials, assets, fallback data, and binding metadata.
- Add a CMS theme registration flow.
- Add validation for required CMS collections.

### Phase 5: Add Forms

- Add form definitions.
- Add form submissions.
- Add a form component.
- Add submission export and notification hooks.

### Phase 6: Add Headless Capabilities

- Add public read-only content endpoints.
- Add API tokens.
- Add CORS configuration.
- Add pagination, filtering, sorting, and field selection.
- Add webhook hooks for publish/export events.

### Phase 7: Add Governance

- Add users and roles.
- Add content revisions.
- Add scheduled publishing.
- Add audit logs.

## Guardrails

- Keep static partial fallback behavior.
- Keep CMS writes inside the standalone CMS.
- Keep builder CMS access read-only.
- Store binding metadata with layouts, not inside CMS entries.
- Validate collection slugs, field names, filters, and entry payloads.
- Avoid a full visual query builder until basic bindings are stable.
- Use exported JSON for publish-ready builder output unless live preview is explicitly enabled.

## Definition Of Done

The CMS design is complete when:

- Editors can create collections and entries without editing files.
- Designers can drag components and bind them to CMS content.
- Forms can be created and rendered through builder components.
- Published bridge data can generate stable final HTML.
- External consumers can read published content through a headless API.
- Static theme templates still work when CMS data is unavailable.
