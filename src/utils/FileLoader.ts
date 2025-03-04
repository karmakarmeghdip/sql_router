import { join } from 'node:path';

class FileLoader {
  async loadSqlFiles(dir: string, sqlFileCache: Map<string, string>, basePath: string = '') {
    const { readdir } = await import('node:fs/promises');
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        await this.loadSqlFiles(fullPath, sqlFileCache, `${basePath}/${entry.name}`);
      } else if (entry.name.endsWith('.sql')) {
        const routeName = entry.name === 'index.sql'
          ? basePath
          : `${basePath}/${entry.name.replace('.sql', '')}`;

        const normalizedRoute = routeName.replace(/\/+/g, '/').replace(/^\/?/, '/');

        // Use Bun.file() to read the SQL file
        const file = Bun.file(fullPath);
        const sqlContent = await file.text();
        sqlFileCache.set(normalizedRoute, sqlContent);
      }
    }
  }
}


export { FileLoader };