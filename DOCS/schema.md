| table_schema | table_name    | column_name         | data_type                | is_nullable | column_default    |
| ------------ | ------------- | ------------------- | ------------------------ | ----------- | ----------------- |
| xdoc         | conversations | id                  | uuid                     | NO          | gen_random_uuid() |
| xdoc         | conversations | user_id             | text                     | NO          | null              |
| xdoc         | conversations | experience_id       | text                     | NO          | null              |
| xdoc         | conversations | title               | text                     | YES         | null              |
| xdoc         | conversations | created_at          | timestamp with time zone | YES         | now()             |
| xdoc         | conversations | updated_at          | timestamp with time zone | YES         | now()             |
| xdoc         | messages      | id                  | uuid                     | NO          | gen_random_uuid() |
| xdoc         | messages      | conversation_id     | uuid                     | NO          | null              |
| xdoc         | messages      | role                | text                     | NO          | null              |
| xdoc         | messages      | content             | text                     | NO          | null              |
| xdoc         | messages      | tool_calls          | jsonb                    | YES         | null              |
| xdoc         | messages      | created_at          | timestamp with time zone | YES         | now()             |
| xdoc         | users         | user_id             | text                     | NO          | null              |
| xdoc         | users         | name                | text                     | YES         | null              |
| xdoc         | users         | profile_picture_url | text                     | YES         | null              |