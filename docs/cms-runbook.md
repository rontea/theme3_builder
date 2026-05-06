# Theme CMS Runbook

This document explains how to run the CMS server locally and verify it is working.

The CMS and builder are separate processes:

- `th3 cms serve` serves the CMS admin and `/api/cms/*`.
- `th3 builder` serves the visual builder and builder APIs.
- The default handoff between them is the exported bridge data in `html/data/cms/`.

## Start The CMS Server

From the project root:

```bash
th3 cms serve
```

Default URL:

- `http://localhost:3100/cms`

## Useful Options

Run on a custom port:

```bash
th3 cms serve --port 3200
```

Set the default CMS port in `config/config.js`:

```js
cms: {
    port: 3200
}
```

Auto-open the CMS in your browser:

```bash
th3 cms serve --open
```

Run against a different project root:

```bash
th3 cms serve --project-root /path/to/project
```

## Verify The CMS Is Running

Check the admin shell:

- Open `http://localhost:3100/cms`

Check API endpoints:

- `GET http://localhost:3100/api/cms/collections`
- `GET http://localhost:3100/api/cms/entries?collection=supporters`

## Typical Workflow

1. Start CMS: `th3 cms serve`
2. Seed baseline content (optional): `th3 cms migrate-content`
3. Edit content in CMS admin UI.
4. Publish bridge data: `th3 cms export`
5. Run builder/site flow that reads `html/data/cms/`.

## Builder Integration

Start the builder in the default exported-data mode:

```bash
th3 builder
```

Set the default builder port in `config/config.js`:

```js
builder: {
    port: 8080
}
```

You can still override it per run:

```bash
th3 builder --port 8081
```

The builder CMS button opens:

- `http://localhost:3100/cms`

Override that URL when the CMS runs elsewhere:

```bash
th3 builder --cms-admin-url http://localhost:3200/cms
```

Optional live API configuration is available for preview experiments:

```bash
th3 builder --cms-read-mode live --cms-base-url http://localhost:3100
```

Use `th3 cms export` before relying on builder preview or final output for publish-ready content.

## Stop The CMS Server

Use `Ctrl+C` in the terminal running `th3 cms serve`.
