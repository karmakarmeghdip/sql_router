CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Add an index for faster username lookups
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
-- Create a function to update the updated_at timestamp
CREATE TRIGGER update_users_timestamp
AFTER
UPDATE ON users BEGIN
UPDATE users
SET updated_at = CURRENT_TIMESTAMP
WHERE id = NEW.id;
END;