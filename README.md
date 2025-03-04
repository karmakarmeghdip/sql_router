# SQL Router

A SQL-based API router for Bun applications, allowing you to define API endpoints using SQL files.

## Installation

```bash
bun install sql-router
```

## Usage

Create a directory with SQL files that define your API routes:

```
api/
├── users/
│   ├── index.sql  # GET /users
│   ├── create.sql # POST /users/create
│   └── [id].sql   # GET /users/:id
└── posts.sql      # GET /posts
```

Then set up the router in your application:

```typescript
import { SqlRouter } from 'sql-router';
import { join } from 'node:path';

const router = new SqlRouter({
  apiDir: join(import.meta.dir, 'api'),
  dbPath: 'database.sqlite' // Or use :memory: for in-memory database
});

// Start the server
const server = router.createServer(3000);
console.log(`Server running at http://localhost:3000`);

// Clean up when done
process.on('SIGINT', () => {
  router.close();
  process.exit(0);
});
```

## SQL Files

Each SQL file has access to a temporary table called `request_context` (configurable) with the following columns:

- `params`: URL parameters as JSON string
- `query`: Query string parameters as JSON string 
- `headers`: Request headers as JSON string
- `body`: Request body as JSON string
- `method`: HTTP method (GET, POST, etc.)
- `path`: Request path

Example SQL file:

```sql
-- api/users/[id].sql
SELECT 
  u.id,
  u.name,
  u.email
FROM users u
WHERE u.id = (SELECT JSON_EXTRACT(params, '$.id') FROM request_context)
```

## API

### `new SqlRouter(options)`

Creates a new SQL Router instance.

Options:
- `apiDir`: Path to the directory containing SQL files (required)
- `dbPath`: Path to the SQLite database file (default: `:memory:`)
- `tempTableName`: Name of the temporary table (default: `request_context`)

### `router.createServer(port)`

Starts the HTTP server on the specified port (default: 3000).

### `router.handleRequest(request)`

Handles an HTTP request and returns a Response.

### `router.close()`

Closes the database connection.

## License

MIT
