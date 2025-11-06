## Entity-Relationship Diagram

```mermaid
erDiagram
  auth_users ||--o{ profiles : "id -> profiles.id"

  profiles ||--o{ projects : "profiles.id -> projects.owner_id"
  profiles ||--o{ achievements : "profiles.id -> achievements.user_id"
  profiles ||--o{ media_items : "profiles.id -> media_items.uploaded_by"

  projects ||--o{ project_collaborators : "projects.id -> project_collaborators.project_id"
  profiles ||--o{ project_collaborators : "profiles.id -> project_collaborators.user_id"

  schools ||--o{ school_memberships : "schools.id -> school_memberships.school_id"
  profiles ||--o{ school_memberships : "profiles.id -> school_memberships.user_id"

  schools ||--o{ events : "schools.id -> events.school_id"
  schools ||--o{ projects : "schools.id -> projects.school_id"
  schools ||--o{ achievements : "schools.id -> achievements.school_id"

  events ||--o{ media_items : "events.id -> media_items.event_id"

  schools ||--o{ school_galleries : "schools.id -> school_galleries.school_id"
  school_galleries ||--o{ school_gallery_items : "school_galleries.id -> school_gallery_items.gallery_id"

  schools ||--o{ hall_of_fame_entries : "schools.id -> hall_of_fame_entries.school_id"
  profiles ||--o{ hall_of_fame_entries : "profiles.id -> hall_of_fame_entries.student_id"

  schools ||--o{ yearbooks : "schools.id -> yearbooks.school_id"

  auth_users ||--o{ chat_conversations : "id -> chat_conversations.user_id"
  chat_conversations ||--o{ chat_messages : "chat_conversations.id -> chat_messages.conversation_id"

  auth_users ||--o{ user_recommendations : "id -> user_recommendations.user_id"
```

Notes
- RLS is enabled across tables; admins get elevated access via `public.has_role`.
- `project_collaborators` replaces the legacy `projects.collaborators` array.


