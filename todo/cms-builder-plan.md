# Builder CMS Plan

## Goal

Add a simple CMS inside the current builder so we can update site content without manually editing every partial after a page has been created.

## Phase 0 Status

Phase 0 is now defined enough to move into implementation planning.

- CMS-first partial audit completed
- MVP collections selected
- storage approach chosen
- initial binding contract drafted

## Why this fits the current codebase

The builder already has the foundation we need:

- Builder backend with `routes -> controllers -> services -> repositories`
- SQLite storage at `_builder/layouts/builder.sqlite`
- Existing page, partial, and layout APIs
- UI surfaces in `_builder/client/` for editing and saving content

Because of that, the best solution is not a separate CMS product yet. The best solution is a lightweight internal CMS layer that lives beside the current builder.

## Recommended direction

Build an **Internal Content CMS MVP** with three parts:

1. Content models
   Define reusable content types like `project`, `supporter`, `testimonial`, `blog_card`, `cta_block`.

2. Content entries
   Store actual data records in SQLite so the team can edit content from the builder UI.

3. Builder bindings
   Let builder components/partials map fields to CMS data instead of hardcoded text.

## Good MVP use cases

Start with content that changes often and is mostly text/image data:

- home page supporters
- project cards
- insights/blog teasers
- CTA blocks
- team/about entries

Example for [html/partials/home/cta.html](c:/Design/theme_3-main/html/partials/home/cta.html):

- collection: `supporters`
- fields: `name`, `tier`, `url`, `active`, `sort_order`
- render groups:
- `Founding Pillars`
- `Visionary Contributors`
- `Community Support`

## Phase 0 Audit

### Best CMS candidates right now

#### 1. Supporters

Primary file:
[cta.html](/c:/Design/theme_3-main/html/partials/home/cta.html:1)

Why it is a strong fit:

- already structured as three repeatable groups
- content is mostly names, tiers, links, and labels
- currently contains placeholder values and commented-out repeated items

Recommended collection:
`supporters`

#### 2. Home projects

Primary files:
[projects.html](/c:/Design/theme_3-main/html/partials/home/projects.html:1)
[project_listing.html](/c:/Design/theme_3-main/html/partials/project/project_listing.html:1)

Why it is a strong fit:

- repeated card-based content
- predictable text/image/link fields
- likely needs easy reordering and featured flags

Recommended collection:
`projects`

#### 3. Insights / journal cards

Primary file:
[insights.html](/c:/Design/theme_3-main/html/partials/home/insights.html:1)

Why it is a strong fit:

- repeated teaser cards
- clean mapping for title, category, image, URL
- likely to change often

Recommended collection:
`insights`

#### 4. CTA blocks

Primary file:
[about_cta.html](/c:/Design/theme_3-main/html/partials/about/about_cta.html:1)

Why it is a strong fit:

- very small editable text/link payload
- useful as a reusable single-record content block
- good low-risk target for single-item binding

Recommended collection:
`cta_blocks`

### Lower priority for CMS in MVP

- complex page sections that are mostly layout/styling choices
- sections where the main change is structure, not content
- deeply nested content until repeater support is stable

### Audit summary table

| Area | File | Content pattern | CMS priority | Notes |
| --- | --- | --- | --- | --- |
| Supporters | `html/partials/home/cta.html` | grouped list | High | best first proof of concept |
| Home Projects | `html/partials/home/projects.html` | featured cards | High | needs ordering and featured support |
| Project Listing | `html/partials/project/project_listing.html` | mixed card grid | High | can reuse `projects` collection |
| Insights | `html/partials/home/insights.html` | teaser cards | High | straightforward repeater |
| About CTA | `html/partials/about/about_cta.html` | single block | Medium | ideal single-record test case |

## CMS architecture proposal

### 1. Database

Add CMS tables to the existing SQLite database instead of creating a new database:

- `cms_collections`
- `cms_fields`
- `cms_entries`
- `cms_entry_values`
- `cms_component_bindings`

MVP simplification:
We can also start with just `cms_collections` and `cms_entries`, where `cms_entries.data_json` stores field values as JSON. That will be much faster to ship.

### Phase 0 storage decision

Chosen MVP storage approach:

- keep using `_builder/layouts/builder.sqlite`
- add `cms_collections`
- add `cms_entries`
- store entry fields in `cms_entries.data_json`

Why this is the right first step:

- it matches the current builder architecture
- it keeps migrations small
- it is flexible while field shapes are still changing
- it avoids overdesign before we learn how the editor will actually be used

Suggested MVP table shapes:

`cms_collections`

- `id`
- `slug`
- `name`
- `schema_json`
- `created_at`
- `updated_at`

`cms_entries`

- `id`
- `collection_slug`
- `entry_key`
- `status`
- `sort_order`
- `data_json`
- `created_at`
- `updated_at`

## 2. Backend APIs

Add a new builder backend slice:

- `routes/cms.routes.js`
- `controllers/cms.controller.js`
- `services/cms.service.js`
- `repositories/cms.repository.js`

Suggested endpoints:

- `GET /api/cms/collections`
- `POST /api/cms/collections`
- `GET /api/cms/entries?collection=<slug>`
- `POST /api/cms/entries`
- `PUT /api/cms/entries/:id`
- `DELETE /api/cms/entries/:id`
- `GET /api/cms/bindings?pageName=<name>`
- `POST /api/cms/bindings`

## 3. Frontend UI

Add a simple CMS panel inside `_builder/client/`:

- `modules/cms-dashboard.js`
- `modules/cms-editor.js`

MVP UI screens:

- collection list
- entry list
- entry form
- component binding panel

## 4. Rendering strategy

Do not try to make every partial fully dynamic on day one.

Use a progressive approach:

- Phase 1:
  allow a component instance to store a `cmsBinding` object in `props`
- Phase 2:
  during preview/save, resolve bindings and inject values into rendered HTML
- Phase 3:
  support repeaters/lists for cards, supporters, and blog teasers

Recommended binding shape:

```json
{
  "source": "cms",
  "collection": "supporters",
  "filter": { "tier": "founding" },
  "mode": "list",
  "fieldMap": {
    "title": "name",
    "link": "url"
  }
}
```

### Phase 0 binding contract decision

Use two MVP binding modes:

1. `record`
   For one content block, like a CTA.

2. `collection`
   For repeated cards or grouped lists, like supporters or projects.

Recommended instance prop shape:

```json
{
  "cmsBinding": {
    "source": "cms",
    "mode": "collection",
    "collection": "supporters",
    "selection": {
      "filter": {
        "active": true,
        "tier": "founding"
      },
      "sort": "sort_order:asc",
      "limit": 8
    },
    "fieldMap": {
      "label": "name",
      "href": "url"
    },
    "fallback": "static"
  }
}
```

MVP rules:

- if `cmsBinding` is missing, render the static partial as-is
- if CMS data fails, fall back to static content instead of breaking page rendering
- `record` mode returns one object
- `collection` mode returns an ordered list of objects
- filters should stay simple at first:
  equality only, plus `active`, `tier`, `featured`, and `sort_order`

## Phase 0 Decisions

### MVP collections

#### `supporters`

Purpose:
manage grouped supporter names and links on the home page.

Suggested fields:

- `name`
- `tier`
- `url`
- `active`
- `sort_order`

#### `projects`

Purpose:
power home featured projects and archive/project cards.

Suggested fields:

- `title`
- `slug`
- `category`
- `summary`
- `image_src`
- `image_alt`
- `detail_url`
- `year`
- `featured`
- `active`
- `sort_order`

#### `insights`

Purpose:
manage journal/blog teaser cards.

Suggested fields:

- `title`
- `slug`
- `category`
- `image_src`
- `image_alt`
- `detail_url`
- `active`
- `sort_order`

#### `cta_blocks`

Purpose:
manage reusable single CTA sections.

Suggested fields:

- `key`
- `eyebrow`
- `heading`
- `body`
- `button_label`
- `button_url`
- `active`

## Phased implementation plan

### Phase 0 - Discovery and schema design

- [x] Audit which partials should become CMS-driven first
- [x] Decide MVP collections: `supporters`, `projects`, `insights`, `cta_blocks`
- [x] Choose data storage approach:
  JSON in SQLite for MVP, normalized tables later if needed
- [x] Define binding contract for single-item and list components

### Phase 1 - CMS backend MVP

- [x] Create CMS repository/service/controller/route files
- [x] Add SQLite migration for CMS tables
- [x] Add CRUD endpoints for collections and entries
- [x] Add validation for slugs, field names, and entry payloads
- [x] Add tests for create/list/update/delete flows

### Phase 2 - Builder UI MVP

- [x] Add CMS section in builder navigation
- [x] Add collection creation form
- [x] Add entry editor form
- [x] Add binding UI in properties panel for selected components
- [x] Show clear empty/error states

### Phase 3 - Rendering integration

- [x] Store `cmsBinding` on component instances in layout JSON
- [x] Resolve bindings in preview mode
- [x] Resolve bindings in final page generation
- [x] Support list rendering for repeatable cards/rows
- [x] Add fallback behavior when CMS data is missing

### Phase 4 - First real content migration

- [x] Convert supporters section to CMS-driven data
- [x] Convert project listing cards to CMS-driven data
- [x] Convert CTA copy blocks to CMS-driven data
- [x] Document editor workflow for content updates

## Technical guardrails

- Keep all CMS writes inside the current builder security model
- Sanitize field names and collection slugs
- Version collection schemas so field changes are trackable
- Keep static HTML partials working even when no CMS binding exists
- Never block page rendering because one CMS entry is invalid

## Risks to avoid

- Trying to make all partials dynamic at once
- Designing a full visual query builder too early
- Mixing page layout editing and content editing with no separation
- Replacing the current save flow before CMS bindings are stable

## Best first implementation

The fastest high-value path is:

1. Add `supporters` collection CRUD in SQLite
2. Add a small CMS admin panel in the builder
3. Bind [html/partials/home/cta.html](c:/Design/theme_3-main/html/partials/home/cta.html) to CMS data
4. Reuse the same pattern for `projects` and `insights`

This gives us a real proof of concept without rewriting the whole builder.
