import { Database } from 'bun:sqlite';
import type { RequestContext } from '../types';

export class DatabaseManager {
  constructor(
    private db: Database,
    private tempTableName: string
  ) { }

  setupTempTable(context: RequestContext) {
    // Drop the temp table if it exists
    this.db.exec(`DROP TABLE IF EXISTS ${this.tempTableName}`);

    // Create temp table - SQLite uses TEXT for JSON data
    this.db.exec(`
      CREATE TABLE ${this.tempTableName} (
        params TEXT,
        query TEXT,
        headers TEXT,
        body TEXT,
        method TEXT,
        path TEXT
      )
    `);

    // Insert request context
    const stmt = this.db.prepare(`
      INSERT INTO ${this.tempTableName} (params, query, headers, body, method, path)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      JSON.stringify(context.params),
      JSON.stringify(context.query),
      JSON.stringify(context.headers),
      JSON.stringify(context.body),
      context.method,
      context.path
    );
  }

  cleanupTempTable() {
    this.db.exec(`DROP TABLE IF EXISTS ${this.tempTableName}`);
  }
}
