const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

async function initSchema() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL,
      created_at    TEXT    DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS checklists (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL,
      created_by INTEGER NOT NULL,
      created_at TEXT    DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS checklist_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      checklist_id INTEGER NOT NULL,
      text         TEXT    NOT NULL,
      item_order   INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS checklist_responses (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      checklist_id INTEGER NOT NULL,
      loja_id      INTEGER NOT NULL,
      status       TEXT    NOT NULL DEFAULT 'pending',
      completed_at TEXT,
      UNIQUE(checklist_id, loja_id)
    );
    CREATE TABLE IF NOT EXISTS checklist_response_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      response_id INTEGER NOT NULL,
      item_id     INTEGER NOT NULL,
      checked     INTEGER NOT NULL DEFAULT 0,
      UNIQUE(response_id, item_id)
    );
  `);
}

const db = {
  client,
  initSchema,

  async query(sql, params = []) {
    const result = await client.execute({ sql, args: params });
    return result.rows;
  },

  async queryOne(sql, params = []) {
    const result = await client.execute({ sql, args: params });
    return result.rows[0] || null;
  },

  async run(sql, params = []) {
    const result = await client.execute({ sql, args: params });
    return { lastInsertRowid: Number(result.lastInsertRowid), changes: result.rowsAffected };
  },
};

module.exports = db;
