# Theme CMS Runbook

This document explains how to run the CMS server locally and verify it is working.

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

## Stop The CMS Server

Use `Ctrl+C` in the terminal running `th3 cms serve`.
