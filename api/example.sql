-- This is an example SQL file that will be accessible at /example
-- It uses the request_context temporary table to access request data
-- Get the request method and other context information
SELECT method,
  path,
  params,
  query,
  headers
FROM request_context;
-- In SQLite, JSON extraction uses json_extract() function
-- Example query with JSON extraction:
-- SELECT json_extract(params, '$.userId') as userId FROM request_context;