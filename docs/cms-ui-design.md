# CMS UI Design

This document describes the complete UI design direction for the Theme 3 CMS, Builder, generated theme workflow, and content publishing experience.

## UI Goal

The interface should feel like a practical content operating system:

- Designers can build pages visually.
- Editors can manage content without touching templates.
- Developers can export and refine a separated theme.
- Publishers can preview and release content with confidence.

The product should avoid feeling like a landing page or demo shell. It should feel like a focused tool for repeated daily work: clear navigation, compact controls, predictable panels, fast scanning, and strong empty/error states.

## Product Areas

The UI is separated into four main areas:

```text
CMS Admin
|-- Content modeling and content editing

Visual Builder
|-- Page design, component layout, and CMS binding

Theme Manager
|-- Exported theme packages, active theme selection, and validation

Preview And Publish
|-- Content preview, theme preview, export, and deployment handoff
```

## Global Layout

Use a stable application shell across CMS admin screens.

```text
+----------------------------------------------------------------+
| Top Bar: Product, Environment, Search, Notifications, User      |
+----------------------+-----------------------------------------+
| Sidebar Navigation   | Main Workspace                          |
|                      |                                         |
| Dashboard            | Page title / actions                    |
| Content              | Filters / tabs / toolbar                |
| Media                | Main table, form, editor, or preview    |
| Forms                |                                         |
| Themes               |                                         |
| API                  |                                         |
| Settings             |                                         |
+----------------------+-----------------------------------------+
```

### Top Bar

The top bar should include:

- Current project/site name
- Environment badge, such as `Local`, `Preview`, or `Production`
- Global search
- Save/publish status
- Notifications
- User menu

### Sidebar

Primary navigation:

- Dashboard
- Content
- Media
- Forms
- Builder
- Themes
- API
- Settings

Sidebar rules:

- Keep labels short.
- Use icons plus text.
- Highlight the active section clearly.
- Keep destructive actions out of the sidebar.

## Dashboard

The dashboard should answer: what needs attention?

Recommended sections:

- Recent entries
- Drafts waiting for publish
- Recently exported theme
- Content validation warnings
- Missing required collections for the active theme
- Quick actions

Recommended layout:

```text
+--------------------------------------------------------------+
| Dashboard                                  [Create Entry]     |
+----------------------+---------------------+-----------------+
| Drafts               | Published Today     | Theme Status    |
+----------------------+---------------------+-----------------+
| Recent Activity                                             |
+--------------------------------------------------------------+
| Validation Warnings                                         |
+--------------------------------------------------------------+
```

Quick actions:

- Create collection
- Create entry
- Upload media
- Open builder
- Export content
- Export theme

## Content Area

The content area is for collections and entries.

### Collection List

Purpose:
Show all content models available to editors and developers.

Recommended columns:

- Name
- Slug
- Entry count
- Required by active theme
- Last updated
- Actions

Actions:

- View entries
- Edit schema
- Duplicate
- Delete

Empty state:

```text
No collections yet.
Create a collection to define reusable content such as projects, posts, or CTA blocks.
```

### Collection Builder

The collection builder should allow users to define fields without writing raw JSON.

Recommended layout:

```text
+--------------------------------------------------------------+
| Collection: Projects                         [Save Schema]    |
+----------------------------+---------------------------------+
| Fields                     | Field Settings                  |
|                            |                                 |
| title       Text           | Label                           |
| slug        Slug           | Type                            |
| summary     Textarea       | Required                        |
| image_src   Image          | Help text                       |
| active      Boolean        | Default value                   |
| sort_order  Number         | Validation                      |
+----------------------------+---------------------------------+
```

Field controls:

- Add field
- Reorder field
- Duplicate field
- Delete field
- Required toggle
- Field type select

Recommended field types:

- Text
- Textarea
- Rich text
- Number
- Boolean
- Select
- Date
- Image
- URL
- Slug
- Reference
- Repeater

### Entry List

Purpose:
Let editors scan and manage content records.

Recommended controls:

- Collection selector
- Search
- Status filter
- Sort
- Bulk actions
- Create entry

Recommended columns:

- Title or entry key
- Status
- Sort order
- Updated at
- Updated by
- Actions

Status badges:

- Draft
- Published
- Archived

### Entry Editor

The entry editor should be schema-driven. Editors should not need to edit raw JSON during normal use.

Recommended layout:

```text
+--------------------------------------------------------------+
| Project Entry: Brand Refresh                 [Preview] [Save] |
+----------------------------------+---------------------------+
| Main Fields                      | Publish Panel             |
|                                  |                           |
| Title                            | Status                    |
| Slug                             | Sort order                |
| Summary                          | Featured                  |
| Image                            | Active                    |
| Detail URL                       | Updated at                |
|                                  | Used by pages             |
+----------------------------------+---------------------------+
```

Right panel should include:

- Status
- Active toggle
- Sort order
- Publish controls
- Revision info later
- Theme usage info

Save behavior:

- `Save Draft` keeps unpublished changes.
- `Publish` makes the entry available to public content APIs and exports.
- `Archive` removes it from normal published views.

## Media Library

Purpose:
Manage images and files used by content and themes.

Recommended views:

- Grid view
- List view
- Detail drawer

Media card content:

- Thumbnail
- File name
- File type
- Dimensions
- Size
- Used by count

Actions:

- Upload
- Rename
- Copy URL
- Replace file
- Delete

The media picker should open as a modal from image fields and component properties.

## Forms UI

Forms are CMS-managed structures that can be rendered by builder components or theme templates.

### Form List

Recommended columns:

- Name
- Slug
- Field count
- Submission count
- Last submission
- Actions

### Form Builder

Recommended layout:

```text
+--------------------------------------------------------------+
| Contact Form                              [Preview] [Save]    |
+----------------------------+---------------------------------+
| Fields                     | Field Settings                  |
|                            |                                 |
| name       Text            | Label                           |
| email      Email           | Required                        |
| message    Textarea        | Placeholder                     |
| consent    Checkbox        | Validation                      |
+----------------------------+---------------------------------+
```

Form settings:

- Success message
- Store submissions toggle
- Notification email
- Submit button label
- Spam protection later

### Submission Inbox

Recommended columns:

- Submitted at
- Form
- Name/email summary
- Status
- Actions

Submission statuses:

- New
- Reviewed
- Archived

## Visual Builder UI

The builder is the page design workspace.

Recommended layout:

```text
+----------------------------------------------------------------+
| Project / Page        [Undo] [Redo] [Preview] [Save] [Export]  |
+------------------+-------------------------------+-------------+
| Component Library| Canvas                        | Properties  |
|                  |                               |             |
| Search           | Page sections                 | Component   |
| Categories       | Drag/drop area                | Style       |
| Components       | Selected component outline    | CMS Binding |
|                  |                               | Visibility  |
+------------------+-------------------------------+-------------+
```

### Component Library

The component library should scan `html/partials/**/*.html`.

Component item content:

- Name
- Category
- Small preview
- CMS-ready badge when default bindings exist

Filters:

- Search
- Category
- CMS-ready
- Layout
- Content
- Micro

### Canvas

Canvas behavior:

- Drop components into page order.
- Select component on click.
- Show component boundary when selected.
- Allow reorder, duplicate, delete, and move.
- Show static fallback when CMS data is unavailable.
- Show CMS data when export data or live preview data is available.

Canvas controls:

- Add section
- Move up
- Move down
- Duplicate
- Delete
- Hide

### Properties Panel

Tabs:

- Content
- Style
- CMS Binding
- Advanced

Content tab:

- Editable component props
- Text fields
- Link fields
- Image picker
- Alt text

Style tab:

- Variant select
- Spacing controls
- Alignment
- Visibility

CMS Binding tab:

- Enable binding toggle
- Mode: record or collection
- Collection selector
- Entry selector for record mode
- Filter controls for collection mode
- Sort selector
- Limit field
- Field mapping controls
- Fallback behavior

Advanced tab:

- Component path
- Instance ID
- Raw binding JSON
- Debug resolved data

## CMS Binding UI

The CMS binding editor should avoid forcing users to write JSON for common cases.

### Record Binding UI

Fields:

- Collection
- Entry
- Field map
- Fallback mode

Example flow:

```text
Bind this CTA component to:
Collection: CTA Blocks
Entry: about-cta
Map:
  Heading -> heading
  Button Label -> button_label
  Button URL -> button_url
```

### Collection Binding UI

Fields:

- Collection
- Filters
- Sort
- Limit
- Grouping
- Field map

Example flow:

```text
Bind this project grid to:
Collection: Projects
Where:
  active is true
  featured is true
Sort:
  sort_order ascending
Limit:
  6
```

### Binding States

Show clear status messages:

- Bound and resolved
- Bound but no matching entries
- Missing collection
- Missing mapped field
- Using static fallback

## Theme Manager UI

The theme manager supports the separated theme workflow.

### Theme List

Recommended columns:

- Theme name
- Version
- Active status
- Required collections
- Validation status
- Last exported
- Actions

Actions:

- Activate
- Preview
- Validate
- Export
- Open folder
- Delete

### Theme Detail

Recommended sections:

- Theme overview
- Required collections
- Template list
- Asset list
- Binding list
- Validation warnings
- Export history

### Theme Export Dialog

Fields:

- Theme name
- Output folder
- Include compiled assets
- Include fallback data
- Include draft bindings
- Overwrite existing export

Primary action:

- Export Theme

After export, show:

- Theme folder path
- Files generated
- Warnings
- Next steps

## Preview And Publish UI

Preview should make the content source obvious.

Preview controls:

- Device size
- Content source: fallback, exported CMS, or live CMS
- Status: draft or published
- Active theme
- Refresh data

Publish controls:

- Export CMS content
- Build theme
- Generate static output
- Open build folder

Recommended publish checklist:

- Required collections exist
- Required fields exist
- No broken media links
- No missing CMS bindings
- Theme export is current
- Content export is current

## API UI

The API area should help developers connect external apps.

Screens:

- API overview
- Content endpoints
- Form endpoints
- API tokens
- CORS settings
- Webhooks later

Endpoint examples:

```text
GET /api/content/projects
GET /api/content/projects/brand-refresh
GET /api/forms/contact
POST /api/forms/contact/submissions
```

The UI should show sample responses and copy buttons.

## Settings UI

Settings sections:

- General
- CMS storage
- Builder URLs
- Theme paths
- API
- Users and roles later
- Import/export

Important settings:

- CMS port
- Builder port
- CMS admin URL
- CMS base URL
- Active theme
- Default content export path
- Default theme export path

## Empty States

Every major screen needs a useful empty state.

Examples:

```text
No entries yet.
Create your first project entry, then bind it to a project component in the builder.
```

```text
No theme exported yet.
Use the builder to design pages, then export a separated theme package.
```

```text
No matching CMS data.
This component is using static fallback content.
```

## Error States

Errors should explain what happened and how to fix it.

Examples:

- Collection slug is invalid.
- Required field is missing.
- Binding references a missing collection.
- Binding filter matched no entries.
- Theme export folder already exists.
- CMS export data is stale.

Use inline validation for fields and toast notifications for save/export results.

## Visual Style

The UI should be restrained, operational, and easy to scan.

Recommended style:

- Neutral background
- White or near-white work surfaces
- Clear borders
- Compact spacing
- 8px or smaller card radius
- Strong focus states
- Status colors used sparingly
- Icons in toolbar buttons

Avoid:

- Marketing-style hero sections inside the app
- Decorative gradients
- Oversized cards for dense admin screens
- UI text that explains obvious controls
- Nested cards inside cards

## Responsive Behavior

Desktop is the primary target for builder and schema editing.

Tablet:

- Sidebar can collapse.
- Properties panel can become a drawer.
- Tables can switch to dense list rows.

Mobile:

- CMS entry editing should remain usable.
- Builder canvas can become preview-only or simplified.
- Complex drag-and-drop editing can be desktop-first.

## Accessibility

Baseline requirements:

- Keyboard navigation for forms, tables, dialogs, and menus.
- Visible focus styles.
- Labels for all form fields.
- Button text or accessible labels for icon buttons.
- Sufficient contrast.
- Error messages connected to fields.
- No information conveyed by color alone.

## MVP Screen Priority

Build in this order:

1. CMS dashboard
2. Collection list
3. Schema-driven collection builder
4. Entry list
5. Schema-driven entry editor
6. Visual builder CMS binding panel
7. Theme export dialog
8. Theme manager
9. Form builder
10. API tokens and public API docs

## UI Definition Of Done

The UI design is complete when:

- Editors can manage content without raw JSON for normal tasks.
- Designers can bind visual components to CMS content without editing files.
- Developers can export and inspect a separated theme folder.
- Publishers can validate, preview, and export content confidently.
- Every important screen has loading, empty, success, and error states.
- The interface works as a focused tool, not a decorative demo.
