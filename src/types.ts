export interface SqlRouterOptions {
  apiDir: string;
  dbPath?: string;
  tempTableName?: string;
  migrationsDir?: string;
}

export interface RequestContext {
  params: Record<string, string>;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: any;
  method: string;
  path: string;
}
