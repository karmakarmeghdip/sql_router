-- Get or update user by ID
WITH request_data AS (
  SELECT method,
    json_extract(params, '$.id') as user_id,
    json_extract(body, '$.fullName') as full_name,
    json_extract(body, '$.email') as email
  FROM request_context
) -- If GET request, return user data
SELECT CASE
    WHEN method = 'GET' THEN (
      SELECT json_object(
          'id',
          id,
          'username',
          username,
          'email',
          email,
          'fullName',
          full_name,
          'createdAt',
          created_at,
          'updatedAt',
          updated_at
        )
      FROM users
      WHERE id = (
          SELECT user_id
          FROM request_data
        )
    ) -- If PUT/PATCH request, update user data
    WHEN method IN ('PUT', 'PATCH') THEN (
      WITH updated_user AS (
        UPDATE users
        SET full_name = COALESCE(
            (
              SELECT full_name
              FROM request_data
            ),
            full_name
          ),
          email = COALESCE(
            (
              SELECT email
              FROM request_data
            ),
            email
          )
        WHERE id = (
            SELECT user_id
            FROM request_data
          )
        RETURNING id,
          username,
          email,
          full_name,
          updated_at
      )
      SELECT json_object(
          'message',
          'User updated successfully',
          'user',
          json_object(
            'id',
            id,
            'username',
            username,
            'email',
            email,
            'fullName',
            full_name,
            'updatedAt',
            updated_at
          )
        )
      FROM updated_user
    )
    ELSE json_object('error', 'Method not allowed')
  END as result;