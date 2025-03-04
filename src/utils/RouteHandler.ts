export class RouteHandler {
  constructor(private sqlFileCache: Map<string, string>) { }

  extractParamsFromPath(routePath: string, requestPath: string): Record<string, string> {
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

  findMatchingRoute(path: string): { sql: string; params: Record<string, string> } | null {
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
}
