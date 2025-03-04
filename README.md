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
  dbPath: 'database.sqlite', // Or use :memory: for in-memory database
  migrationsDir: join(import.meta.dir, 'migrations') // Optional
});

// Run migrations if configured
await router.runMigrations();

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

## Migrations

You can define migrations as SQL files in a migrations directory:

```
migrations/
├── 001_create_users.sql
├── 002_add_user_roles.sql
└── 003_create_posts.sql
```

Migrations are run in alphabetical order and tracked in a `migrations` table to ensure they only run once.

Example migration file:

```sql
-- 001_create_users.sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE
);
```

## Example User API

The framework includes a ready-to-use User API with the following endpoints:

1. **Register a user**:
   - `POST /users/register`
   - Body: `{ "username": "john", "email": "john@example.com", "password": "secret", "fullName": "John Doe" }`

2. **Login**:
   - `POST /users/login`
   - Body: `{ "username": "john", "password": "secret" }`

3. **Get user profile**:
   - `GET /users/:id`

4. **Update user profile**:
   - `PATCH /users/:id`
   - Body: `{ "fullName": "John Smith", "email": "john.smith@example.com" }`

5. **List all users**:
   - `GET /users?limit=10&offset=0`

## API

### `new SqlRouter(options)`

Creates a new SQL Router instance.

Options:
- `apiDir`: Path to the directory containing SQL files (required)
- `dbPath`: Path to the SQLite database file (default: `:memory:`)
- `tempTableName`: Name of the temporary table (default: `request_context`)
- `migrationsDir`: Path to the directory containing migration files (optional)

### `router.runMigrations()`

Runs database migrations from the configured migrations directory.
Returns a Promise that resolves to an array of migration names that were applied.

### `router.createServer(port)`

Starts the HTTP server on the specified port (default: 3000).

### `router.handleRequest(request)`

Handles an HTTP request and returns a Response.

### `router.close()`

Closes the database connection.

## License

MIT
