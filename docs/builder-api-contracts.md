# Builder API Contracts (Phase 0 Baseline)

This document freezes the current request/response contracts for builder endpoints before modular refactor work.

## Common Response Shape

- Success:
  - `{ "success": true, "data": <payload> }`
- Error:
  - `{ "success": false, "error": "<message>", "code": "<ERROR_CODE>", "details": { ... } }`

## Endpoint Contracts

### `GET /api/partials`
- Request:
  - No body.
- Success data:
  - `Array<{ id, componentKey, name, path, fullPath, folder, category, type, preview }>`

### `GET /api/layouts`
- Request:
  - No body.
- Success data:
  - `Array<{ id, name, path, fullPath, type }>`

### `GET /api/partial?path=<relative-path>`
- Query params:
  - `path` (required)
- Success data:
  - `string` (raw partial HTML)

### `GET /api/layout?path=<relative-path>`
- Query params:
  - `path` (required)
- Success data:
  - `string` (raw layout HTML)

### `POST /api/watch/start`
- Request body:
  - none required
- Success data:
  - `{ alreadyRunning: boolean, pid: number }`

### `POST /api/projects`
- Request body:
  - `{ projectName: string }`
- Success data:
  - `{ projectName: string, createdAt: string, updatedAt: string }`

### `GET /api/projects`
- Request:
  - No body.
- Success data:
  - `Array<{ projectName, createdAt, updatedAt, pageCount }>`

### `DELETE /api/projects`
- Request:
  - `projectName` can be provided in body or query.
- Success data:
  - `{ projectName: string }`

### `POST /api/pages`
- Request body:
  - `{ projectName: string, pageName: string, pageTitle?: string }`
- Success data:
  - `{ projectName, pageName, pageTitle, layoutFileName, partialsSynced }`

### `GET /api/pages?projectName=<name>`
- Query params:
  - `projectName` (required)
- Success data:
  - `Array<{ projectName, pageName, pageTitle, layoutFileName, partialsSynced, partialsSyncedAt, createdAt, updatedAt, partials: string[] }>`

### `DELETE /api/pages`
- Request:
  - `projectName` and `pageName` can be provided in body or query.
- Success data:
  - `{ projectName: string, pageName: string }`

### `GET /api/pages/partials?projectName=<name>&pageName=<name>`
- Query params:
  - `pageName` (required)
  - `projectName` (optional, defaults to `theme_3`)
- Success data:
  - `{ projectName, pageName, partials: string[] }`

### `POST /api/pages/partials/sync-state`
- Request body:
  - `{ projectName?: string, pageName: string, partialsSynced: boolean }`
- Success data:
  - `{ projectName, pageName, partialsSynced, partialsSyncedAt }`

### `POST /api/pages/sync`
- Request body:
  - `{ projectName?: string }`
- Success data:
  - `{ projectName, syncedCount: number, totalPages: number, pages: Array<...same as GET /api/pages...> }`

### `POST /api/save-layout`
- Request body:
  - `{ layoutData: object, fileName?: string, pageName?: string, overwrite?: boolean, saveAs?: boolean, layoutFileName?: string }`
- Success data:
  - `{ path, layoutPath, pagePath, pageName, layoutFileName }`
  - Note: `path` is legacy alias of `layoutPath`.

### `GET /api/saved-layouts`
- Request:
  - No body.
- Success data:
  - `Array<{ fileName, pageName, projectName, fullPath, size, updatedAt }>`

### `GET /api/saved-layout?fileName=<name.json>`
- Query params:
  - `fileName` (required)
- Success data:
  - raw saved `layoutData` object

### `DELETE /api/saved-layout`
- Request:
  - `fileName` can be provided in body or query.
- Success data:
  - `{ fileName, pageName, layoutDeleted, pageDeleted }`

### `POST /api/build`
- Request body:
  - `{ layout, layoutFile }`
- Success data:
  - `{ layout, layoutFile }`

## Guardrails

- Path traversal is rejected for read/write endpoints using path sanitization.
- Layout payload is validated (shape, item count, text lengths, byte size limit).
- Page composition only accepts component sources inside `html/partials`.
