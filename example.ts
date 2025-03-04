import { join } from 'node:path';
import { SqlRouter } from './src/SqlRouter';

const router = new SqlRouter({
  apiDir: join(import.meta.dir, 'api'),
  dbPath: 'dev.sqlite', // Use a file-based SQLite database for development
  migrationsDir: join(import.meta.dir, 'migrations'),
});

async function start() {
  try {
    // Run migrations to ensure database schema is up to date
    const migrations = await router.runMigrations();
    if (migrations.length > 0) {
      console.log(`Applied migrations: ${migrations.join(', ')}`);
    } else {
      console.log('No new migrations to apply');
    }

    // Start the server
    const server = router.createServer(3000);
    console.log(`Server running at http://localhost:3000`);

    // Handle shutdown gracefully
    process.on('SIGINT', async () => {
      console.log('Shutting down...');
      router.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    router.close();
    process.exit(1);
  }
}

// Start the application
start();

/* 
User API endpoints:

1. Register a user:
   POST /users/register
   Body: { username, email, password, fullName }

2. Login:
   POST /users/login
   Body: { username, password }

3. Get user profile:
   GET /users/:id

4. Update user profile:
   PATCH /users/:id
   Body: { fullName, email }

5. List all users:
   GET /users?limit=10&offset=0
*/
