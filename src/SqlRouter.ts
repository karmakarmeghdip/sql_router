import { Database } from 'bun:sqlite';
import type { Server } from 'bun';
import type { SqlRouterOptions, RequestContext } from './types';
import { FileLoader } from './utils/FileLoader';
import { RouteHandler } from './utils/RouteHandler.ts';
import { RequestParser } from './utils/RequestParser.ts';
import { DatabaseManager } from './utils/DatabaseManager.ts';
import { Migrations } from './utils/Migrations.ts';

export class SqlRouter {
  private apiDir: string;
  private dbPath: string;
  private tempTableName: string;
  private migrationsDir?: string;
  private sqlFileCache: Map<string, string> = new Map();
  private db: Database;
  private fileLoader: FileLoader;
  private routeHandler: RouteHandler;
  private requestParser: RequestParser;
  private dbManager: DatabaseManager;

  constructor(options: SqlRouterOptions) {
    this.apiDir = options.apiDir;
    this.dbPath = options.dbPath || ':memory:';
    this.tempTableName = options.tempTableName || 'request_context';
    this.migrationsDir = options.migrationsDir;

    // Initialize database
    this.db = new Database(this.dbPath);

    // Initialize utility classes
    this.fileLoader = new FileLoader();
    this.routeHandler = new RouteHandler(this.sqlFileCache);
    this.requestParser = new RequestParser();
    this.dbManager = new DatabaseManager(this.db, this.tempTableName);

    this.initializeCache();
  }

  private async initializeCache() {
    await this.fileLoader.loadSqlFiles(this.apiDir, this.sqlFileCache);
    console.log(`SQL Router initialized with ${this.sqlFileCache.size} routes`);
  }

  public async runMigrations(): Promise<string[]> {
    if (!this.migrationsDir) {
      throw new Error('Migrations directory not configured');
    }

    const migrations = new Migrations(this.db, this.migrationsDir);
    return await migrations.runMigrations();
  }

  async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    const route = this.routeHandler.findMatchingRoute(path);
    if (!route) {
      return new Response('Not Found', { status: 404 });
    }

    try {
      const body = req.headers.get('content-type')?.includes('application/json')
        ? await req.json().catch(() => ({}))
        : {};

      const headers: Record<string, string> = {};
      req.headers.forEach((value, key) => { headers[key] = value; });

      const context: RequestContext = {
        params: route.params,
        query: this.requestParser.parseQueryParams(url.toString()),
        headers,
        body,
        method,
        path
      };

      try {
        // Set up temp table with request context
        this.dbManager.setupTempTable(context);

        // Execute the SQL query
        const result = this.db.query(route.sql).all();

        // Clean up temp table
        this.dbManager.cleanupTempTable();

        // Return the formatted response
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        });
      } catch (error) {
        this.dbManager.cleanupTempTable(); // Make sure to clean up on error
        throw error;
      }
    } catch (error: any) {
      console.error('Error handling request:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  createServer(port: number = 3000): Server {
    return Bun.serve({
      port,
      fetch: (req) => this.handleRequest(req)
    });
  }

  // Get access to the database for external operations
  getDb(): Database {
    return this.db;
  }

  // Close database connection when shutting down
  close() {
    this.db.close();
  }
}
