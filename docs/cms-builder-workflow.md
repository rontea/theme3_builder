# CMS Builder Workflow

This guide explains how the standalone Theme CMS works with the visual builder.

## What The CMS Does

The CMS lets you:

- define content collections such as `supporters`, `projects`, `insights`, and `cta_blocks`
- create editable entries inside those collections
- connect builder components to CMS data with `cmsBinding`
- preview and publish pages using CMS content

If CMS data is missing or a binding does not match anything, the builder falls back to the static partial markup.

## Launch The Builder

Run:

```bash
th3 builder
```

The builder owns page layout, partial placement, component props, and `cmsBinding` metadata. It does not own long-term CMS authoring data.

Builder CMS runtime defaults:

- CMS read mode: `export`
- CMS bridge data: `html/data/cms/`
- CMS admin URL: `http://localhost:3100/cms`

Useful builder CMS options:

```bash
th3 builder --cms-admin-url http://localhost:3100/cms
th3 builder --cms-read-mode export
th3 builder --cms-read-mode live --cms-base-url http://localhost:3100
```

Use `export` mode as the default workflow. `live` mode is reserved for later live-preview integration.

## Run The CMS Server

Run:

```bash
th3 cms serve
```

Then open:

- `http://localhost:3100/cms`

The CMS owns collection definitions, entries, publish status, exports, and CMS storage in `theme-cms/data/cms.sqlite`.

For detailed run/verify options, see `docs/cms-runbook.md`.

## Migration Note

If you previously opened the CMS through `th3 builder` at `/cms`, switch to the standalone process:

```bash
th3 cms serve
```

Then open `http://localhost:3100/cms`, or use the builder `Open CMS` button after setting `cmsAdminUrl`. The builder no longer hosts CMS admin files or `/api/cms/*`; it only reads exported CMS data through `/api/builder/cms/*`.

## Publish CMS Bridge Data

Run:

```bash
th3 cms export
```

This publishes normalized CMS JSON to:

- `html/data/cms/manifest.json`
- `html/data/cms/collections/*.json`
- `html/data/cms/entries/*.json`

Optional preview export:

```bash
th3 cms export --preview
```

## Phase 5 Content Migration

Run:

```bash
th3 cms migrate-content
```

This command upserts baseline records for:

- `supporters`
- `projects`
- `insights`
- `cta_blocks`

Then publishes bridge output to `html/data/cms/`.

## Basic Workflow

Use this order when setting up CMS content for a page:

1. Start the CMS with `th3 cms serve`.
2. Create collections and entries in the CMS admin.
3. Publish bridge data with `th3 cms export`.
4. Start or refresh the builder with `th3 builder`.
5. Drag a CMS-ready partial onto the canvas.
6. Check or adjust the component's CMS binding in the Properties panel.
7. Preview the page.
8. Save the layout to generate final HTML.

## Create A Collection

Inside the standalone CMS admin:

1. In `Create Collection`, enter a slug such as `supporters`.
2. Enter a display name such as `Supporters`.
3. Add the schema JSON.
4. Click `Save Collection`.

Example schema:

```json
{
  "fields": [
    { "name": "name", "label": "Name", "type": "text" },
    { "name": "tier", "label": "Tier", "type": "text" },
    { "name": "url", "label": "URL", "type": "text" },
    { "name": "active", "label": "Active", "type": "boolean" },
    { "name": "sort_order", "label": "Sort Order", "type": "number" }
  ]
}
```

## Create An Entry

Inside the standalone CMS admin:

1. Select a collection from the left column first.
2. Enter an `Entry Key`.
3. Set `Status`.
4. Set `Sort Order`.
5. Add the `Data JSON`.
6. Click `Save Entry`.

Example entry for `supporters`:

```json
{
  "name": "OpenAI",
  "tier": "founding",
  "url": "https://openai.com",
  "active": true,
  "sort_order": 1
}
```

## Copy-Paste Samples

Use these samples if you want a quick starter setup.

### Sample `supporters` Collection Schema

```json
{
  "fields": [
    { "name": "name", "label": "Name", "type": "text" },
    { "name": "tier", "label": "Tier", "type": "text" },
    { "name": "url", "label": "URL", "type": "text" },
    { "name": "active", "label": "Active", "type": "boolean" },
    { "name": "sort_order", "label": "Sort Order", "type": "number" }
  ]
}
```

### Sample `supporters` Entries

`OpenAI`

```json
{
  "name": "OpenAI",
  "tier": "founding",
  "url": "https://openai.com",
  "active": true,
  "sort_order": 1
}
```

`Anthropic`

```json
{
  "name": "Anthropic",
  "tier": "visionary",
  "url": "https://anthropic.com",
  "active": true,
  "sort_order": 2
}
```

`Community Friends`

```json
{
  "name": "Community Friends",
  "tier": "community",
  "url": "https://example.com/community",
  "active": true,
  "sort_order": 3
}
```

### Sample `cta_blocks` Collection Schema

```json
{
  "fields": [
    { "name": "key", "label": "Key", "type": "text" },
    { "name": "heading", "label": "Heading", "type": "text" },
    { "name": "button_label", "label": "Button Label", "type": "text" },
    { "name": "button_url", "label": "Button URL", "type": "text" },
    { "name": "active", "label": "Active", "type": "boolean" }
  ]
}
```

### Sample `cta_blocks` Entry

```json
{
  "key": "about-cta",
  "heading": "Build something together.",
  "button_label": "Reach Out",
  "button_url": "mailto:studio@example.com",
  "active": true
}
```

### Sample `supporters` Binding

This is the kind of grouped binding used by `html/partials/home/cta.html`:

```json
{
  "cmsBinding": {
    "source": "cms",
    "mode": "collection",
    "collection": "supporters",
    "selection": {
      "groups": [
        {
          "title": "Founding Pillars",
          "filter": { "active": true, "tier": "founding" },
          "itemTag": "a",
          "itemClassName": "font-heading text-4xl md:text-6xl font-bold uppercase hover:text-gray-300 transition-colors"
        },
        {
          "title": "Visionary Contributors",
          "filter": { "active": true, "tier": "visionary" },
          "itemTag": "a",
          "itemClassName": "font-heading text-xl md:text-2xl font-medium uppercase"
        },
        {
          "title": "Community Support",
          "filter": { "active": true, "tier": "community" },
          "itemTag": "a"
        }
      ]
    },
    "fieldMap": {
      "label": "name",
      "linkHref": "url"
    },
    "fallback": "static"
  }
}
```

### Sample `cta_blocks` Binding

This is the kind of record binding used by `html/partials/about/about_cta.html`:

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

## Use CMS-Ready Partials

These partials ship with default CMS bindings when you add them to the builder:

- `html/partials/home/cta.html`
- `html/partials/home/insights.html`
- `html/partials/home/projects.html`
- `html/partials/project/project_listing.html`
- `html/partials/about/about_cta.html`

That means you usually do not need to write the first binding JSON by hand.

## Check Or Edit A Binding

When a component is selected:

1. Open the `Properties` panel.
2. Scroll to `CMS Binding`.
3. Review:
   - `Collection`
   - `Mode`
   - `Filter JSON`
   - `Field Map JSON`
4. Adjust the binding if you want a different collection, filter, or field mapping.

Binding modes:

- `record`: one content object, useful for a CTA block
- `collection`: a list of entries, useful for cards, supporters, and teasers

## Recommended Collection Shapes

### `supporters`

Fields:

- `name`
- `tier`
- `url`
- `active`
- `sort_order`

Supported tiers for the migrated supporters section:

- `founding`
- `visionary`
- `community`

### `projects`

Fields:

- `title`
- `category`
- `summary`
- `image_src`
- `image_alt`
- `detail_url`
- `year`
- `featured`
- `active`
- `sort_order`

### `insights`

Fields:

- `title`
- `category`
- `image_src`
- `image_alt`
- `detail_url`
- `active`
- `sort_order`

### `cta_blocks`

Fields:

- `key`
- `heading`
- `button_label`
- `button_url`
- `active`

Recommended key for the migrated About CTA:

- `about-cta`

## How The Migrated Partials Work

### `home/cta.html`

- Uses grouped CMS rendering.
- Splits entries by `tier`.
- Renders:
  - `Founding Pillars`
  - `Visionary Contributors`
  - `Community Support`

### `home/insights.html`

- Uses collection rendering.
- Renders the first 3 active entries sorted by `sort_order`.

### `home/projects.html`

- Uses collection rendering.
- Renders active featured projects sorted by `sort_order`.

### `project/project_listing.html`

- Uses collection rendering with mixed card templates.
- Renders active projects sorted by `sort_order`.
- Cycles through the existing large/small project card layout already present in the partial.

### `about/about_cta.html`

- Uses record rendering.
- Looks up `cta_blocks` where `key = about-cta` and `active = true`.

## Preview And Publish

- Preview uses CMS resolution.
- Final page generation also uses CMS resolution.
- Saving the layout generates final HTML in `html/pages`.
- Builder defaults to the published bridge data in `html/data/cms/`.
- Direct/live CMS API reads are a configurable preview path and should not replace `th3 cms export` for publish-ready output yet.

## Troubleshooting

### The component still shows static content

Check:

- the component has a `cmsBinding`
- the collection exists
- the entries are present
- the filter matches the entry data
- fields in `fieldMap` match the keys stored in entry `data`

### The component shows nothing or only some items

Check:

- `active` values in the entry data
- `sort_order`
- `featured` filters for project sections
- `tier` values for supporters
- `limit` in the binding

### I want to stop using CMS for a component

Open the component `Properties` panel and click `Clear Binding`.

## Notes

- CMS data is reusable across pages.
- You can still customize a binding per component instance if one page needs a different filter or selection.
- Static partials remain safe as fallback content if CMS data is incomplete.
