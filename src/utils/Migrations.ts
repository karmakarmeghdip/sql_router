import { Database } from 'bun:sqlite';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';

export class Migrations {
  private db: Database;
  private migrationsDir: string;

  constructor(db: Database, migrationsDir: string) {
    this.db = db;
    this.migrationsDir = migrationsDir;
  }

  /**
   * Initialize migrations table and run pending migrations
   */
  async runMigrations(): Promise<string[]> {
    // Create migrations table if it doesn't exist
    this.db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get applied migrations
    const appliedMigrations = this.db.query('SELECT name FROM migrations').all() as { name: string }[];
    const appliedMigrationNames = new Set(appliedMigrations.map(m => m.name));

    // Get migration files
    const migrationFiles = await this.getMigrationFiles();
    const pendingMigrations = migrationFiles.filter(file => !appliedMigrationNames.has(basename(file)));

    // Run pending migrations
    const executed: string[] = [];
    for (const migrationFile of pendingMigrations) {
      const migrationName = basename(migrationFile);
      try {
        console.log(`Running migration: ${migrationName}`);
        const sql = await readFile(migrationFile, 'utf-8');

        // Run in a transaction to ensure either all statements succeed or none do
        this.db.transaction(() => {
          this.db.run(sql);
          this.db.run('INSERT INTO migrations (name) VALUES (?)', [migrationName]);
        })();

        executed.push(migrationName);
      } catch (error) {
        console.error(`Migration failed: ${migrationName}`, error);
        throw error;
      }
    }

    return executed;
  }

  private async getMigrationFiles(): Promise<string[]> {
    try {
      const files = await readdir(this.migrationsDir);

      // Filter for SQL files and sort them
      const sqlFiles = files.filter(file => file.endsWith('.sql'));
      const filePaths = sqlFiles.map(file => join(this.migrationsDir, file));

      // Sort files by name (assuming timestamp-prefixed naming like 001_users.sql)
      return filePaths.sort();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Migrations directory not found: ${this.migrationsDir}`);
      }
      throw error;
    }
  }
}
