import { join } from 'node:path';
import { Database } from 'bun:sqlite';
import type { Server } from 'bun';

interface SqlRouterOptions {
  apiDir: string;
  dbPath?: string;  // Changed from pgConnectionString to dbPath
  tempTableName?: string;
}

interface RequestContext {
  params: Record<string, string>;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: any;
  method: string;
  path: string;
}

export class SqlRouter {
  private apiDir: string;
  private dbPath: string;
  private tempTableName: string;
  private sqlFileCache: Map<string, string> = new Map();
  private db: Database; // SQLite database

  constructor(options: SqlRouterOptions) {
    this.apiDir = options.apiDir;
    this.dbPath = options.dbPath || ':memory:'; // Default to in-memory database
    this.tempTableName = options.tempTableName || 'request_context';

    // Initialize Bun's SQLite database
    this.db = new Database(this.dbPath);

    this.initializeCache();
  }

  private async initializeCache() {
    await this.loadSqlFiles(this.apiDir);
    console.log(`SQL Router initialized with ${this.sqlFileCache.size} routes`);
  }

  private async loadSqlFiles(dir: string, basePath: string = '') {
    // Since Bun doesn't have a direct replacement for readdir/stat yet, we'll use Node.js fs modules
    // through Bun's implementation of them
    const { readdir } = await import('node:fs/promises');

    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        await this.loadSqlFiles(fullPath, `${basePath}/${entry.name}`);
      } else if (entry.name.endsWith('.sql')) {
        const routeName = entry.name === 'index.sql'
          ? basePath
          : `${basePath}/${entry.name.replace('.sql', '')}`;

        const normalizedRoute = routeName.replace(/\/+/g, '/').replace(/^\/?/, '/');

        // Use Bun.file() to read the SQL file
        const file = Bun.file(fullPath);
        const sqlContent = await file.text();
        this.sqlFileCache.set(normalizedRoute, sqlContent);
      }
    }
  }

  private setupTempTable(context: RequestContext) {
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

  private cleanupTempTable() {
    this.db.exec(`DROP TABLE IF EXISTS ${this.tempTableName}`);
  }

  private extractParamsFromPath(routePath: string, requestPath: string): Record<string, string> {
    const routeParts = routePath.split('/');
    const requestParts = requestPath.split('/');
    const params: Record<string, string> = {};

    if (routeParts.length !== requestParts.length) return {};

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        const paramName = routeParts[i].substring(1);
        params[paramName] = requestParts[i];
      } else if (routeParts[i] !== requestParts[i]) {
        return {};
      }
    }

    return params;
  }

  private findMatchingRoute(path: string): { sql: string; params: Record<string, string> } | null {
    // First check for exact match
    if (this.sqlFileCache.has(path)) {
      return { sql: this.sqlFileCache.get(path)!, params: {} };
    }

    // Check for dynamic routes
    for (const [route, sql] of this.sqlFileCache.entries()) {
      if (route.includes(':')) {
        const params = this.extractParamsFromPath(route, path);
        if (Object.keys(params).length > 0) {
          return { sql, params };
        }
      }
    }

    return null;
  }

  private parseQueryParams(url: string): Record<string, string> {
    const queryParams: Record<string, string> = {};
    const queryString = url.split('?')[1];

    if (!queryString) return queryParams;

    const params = new URLSearchParams(queryString);
    params.forEach((value, key) => {
      queryParams[key] = value;
    });

    return queryParams;
  }

  async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    const route = this.findMatchingRoute(path);
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
        query: this.parseQueryParams(url.toString()),
        headers,
        body,
        method,
        path
      };

      try {
        // Set up temp table with request context
        this.setupTempTable(context);

        // Execute the SQL query
        const result = this.db.query(route.sql).all();

        // Clean up temp table
        this.cleanupTempTable();

        // Return the formatted response
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        });
      } catch (error) {
        this.cleanupTempTable(); // Make sure to clean up on error
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

  // Close database connection when shutting down
  close() {
    this.db.close();
  }
}

// Export the main class
export default SqlRouter;
