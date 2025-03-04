-- User registration endpoint
WITH request_data AS (
  SELECT json_extract(body, '$.username') as username,
    json_extract(body, '$.email') as email,
    json_extract(body, '$.password') as password,
    json_extract(body, '$.fullName') as full_name
  FROM request_context
),
-- Hash the password (in a real app, use a proper password hashing function)
-- SQLite doesn't have built-in password hashing, but this simulates it
password_hash AS (
  SELECT username,
    email,
    full_name,
    'hashed_' || password as password_hash
  FROM request_data
),
-- Insert the new user
inserted_user AS (
  INSERT INTO users (username, email, password_hash, full_name)
  SELECT username,
    email,
    password_hash,
    full_name
  FROM password_hash -- Use a CTE to return the inserted ID
  RETURNING id,
    username,
    email,
    full_name,
    created_at
) -- Return the result without the password
SELECT id,
  username,
  email,
  full_name,
  created_at,
  'User registered successfully' as message
FROM inserted_user;