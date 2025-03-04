import { SqlRouter } from './src/SqlRouter';

const router = new SqlRouter({
  apiDir: './api',
  // dbPath: 'dev.sqlite', // Use a file-based SQLite database for development
});

const server = router.createServer(3000);
console.log(`Server running at http://localhost:3000`);

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  router.close();
  process.exit(0);
});

// Example API structure:
//
// ./api/users/index.sql           -> GET /users
// ./api/users/:id.sql             -> GET /users/123
// ./api/posts/:id/comments.sql    -> GET /posts/456/comments
