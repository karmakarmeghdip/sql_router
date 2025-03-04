-- List all users (basic pagination)
WITH request_data AS (
  SELECT CAST(
      COALESCE(json_extract(query, '$.limit'), '10') AS INTEGER
    ) as limit_val,
    CAST(
      COALESCE(json_extract(query, '$.offset'), '0') AS INTEGER
    ) as offset_val
  FROM request_context
),
user_list AS (
  SELECT id,
    username,
    email,
    full_name,
    created_at,
    updated_at
  FROM users
  ORDER BY id
  LIMIT (
      SELECT limit_val
      FROM request_data
    ) OFFSET (
      SELECT offset_val
      FROM request_data
    )
),
user_count AS (
  SELECT COUNT(*) as total
  FROM users
)
SELECT json_object(
    'users',
    json_group_array(
      json_object(
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
    ),
    'pagination',
    json_object(
      'total',
      (
        SELECT total
        FROM user_count
      ),
      'limit',
      (
        SELECT limit_val
        FROM request_data
      ),
      'offset',
      (
        SELECT offset_val
        FROM request_data
      )
    )
  ) as result
FROM user_list;