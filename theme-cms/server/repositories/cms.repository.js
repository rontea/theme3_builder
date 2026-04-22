"use strict";

const fs = require("fs-extra");
const path = require("path");
const sqlite3 = require("sqlite3");

function createCmsRepository(config = {}) {
    let db = null;

    async function connect() {
        if (db) {
            return db;
        }

        await fs.ensureDir(path.dirname(config.databasePath));
        db = await new Promise((resolve, reject) => {
            const nextDb = new sqlite3.Database(config.databasePath, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(nextDb);
            });
        });

        return db;
    }

    async function dbRun(sql, params = []) {
        await connect();
        return new Promise((resolve, reject) => {
            db.run(sql, params, function onRun(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(this);
            });
        });
    }

    async function dbGet(sql, params = []) {
        await connect();
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row);
            });
        });
    }

    async function dbAll(sql, params = []) {
        await connect();
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows || []);
            });
        });
    }

    async function initSchema() {
        await dbRun(`
            CREATE TABLE IF NOT EXISTS cms_collections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                schema_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        `);

        await dbRun(`
            CREATE TABLE IF NOT EXISTS cms_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                collection_slug TEXT NOT NULL,
                entry_key TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',
                sort_order INTEGER NOT NULL DEFAULT 0,
                data_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(collection_slug, entry_key)
            )
        `);
    }

    async function close() {
        if (!db) {
            return;
        }
        await new Promise((resolve, reject) => {
            db.close((err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
        db = null;
    }

    return {
        config,
        connect,
        initSchema,
        close,
        dbRun,
        dbGet,
        dbAll
    };
}

module.exports = {
    createCmsRepository
};
