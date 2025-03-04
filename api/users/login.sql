-- User login endpoint
WITH request_data AS (
  SELECT json_extract(body, '$.username') as username,
    json_extract(body, '$.password') as password
  FROM request_context
),
-- In a real application, you'd verify the password hash
-- This is a simplified version for demonstration
user_auth AS (
  SELECT u.id,
    u.username,
    u.email,
    u.full_name,
    CASE
      WHEN u.password_hash = 'hashed_' || r.password THEN 1
      ELSE 0
    END as authenticated
  FROM users u
    JOIN request_data r ON u.username = r.username
)
SELECT CASE
    WHEN authenticated = 1 THEN json_object(
      'success',
      true,
      'message',
      'Login successful',
      'user',
      json_object(
        'id',
        id,
        'username',
        username,
        'email',
        email,
        'fullName',
        full_name
      )
    )
    ELSE json_object(
      'success',
      false,
      'message',
      'Invalid username or password'
    )
  END as result
FROM user_auth;