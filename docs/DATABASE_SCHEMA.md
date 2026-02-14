# Database schema (logical)

## Accounts
### `accounts_user`
- `id` (PK)
- `email` (unique, used for login)
- `first_name`, `last_name`
- `password` (Django hashing)
- `is_active`, `is_staff`, timestamps

## Learning
### `learning_course`
- `id` (UUID PK)
- `title`, `slug` (unique), `description`, `is_active`

### `learning_lesson`
- `id` (UUID PK)
- `course_id` (FK → course)
- `title`, `slug` (unique)
- `cover_image_path`
- `order`

### `learning_lessoncard`
- `id` (UUID PK)
- `lesson_id` (FK → lesson)
- `order`
- `english`, `uzbek`, `pronunciation`
- `mnemonic_example`, `translation`
- unique: (`lesson_id`, `english`)

## Tracking
### `tracking_studysession`
- `id` (UUID PK)
- `user_id` (FK → user)
- `context`
- `started_at`, `ended_at`, `last_ping_at`
- `duration_seconds`
- `is_active`

### `tracking_revisionschedule`
- `id` (UUID PK)
- `user_id` (FK → user)
- `lesson_id` (FK → lesson)
- `lesson_completed_at`
- `stage` (0..4)
- `next_review_at`, `last_reviewed_at`
- `status` (`scheduled`, `due`, `expired`, `completed`)
- unique: (`user_id`, `lesson_id`)
- index: (`user_id`, `status`, `next_review_at`)

## Contact
### `contact_contactmessage`
- `id` (UUID PK)
- `name`, `phone`, `message`
- `ip_address`, `user_agent`
- `created_at`

