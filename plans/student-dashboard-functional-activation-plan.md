# Student Dashboard Functional Activation Plan

## Scope and goal
This plan operationalizes the existing expandable Student Dashboard widgets into production-ready, backend-connected features with clear API contracts, database relationships, RBAC, and implementation sequencing.

Target widgets in this phase:
1. SmartBuddy (AI Helper)
2. Projects
3. Achievements
4. Gallery
5. Profile Overview
6. Growth Analytics
7. Level-based entitlements (Basic/Plus/Pro)

---

## 1) Architecture blueprint (student dashboard only)

### 1.1 Request/response flow (all widgets)
1. Frontend widget expands.
2. Widget triggers data fetch using authenticated access token.
3. Backend validates JWT + role + level entitlements.
4. Backend fetches/aggregates from PostgreSQL + storage metadata.
5. Backend returns normalized payload with pagination metadata.
6. Frontend renders loading/error/success states.

### 1.2 Cross-cutting backend modules
- **Auth middleware**: verify JWT, inject `req.user`.
- **RBAC middleware**: `requireRole('student')` and parent/teacher read scopes when needed.
- **Entitlement middleware**: `requirePlan('plus')`, `requirePlan('pro')` for premium routes.
- **Validation middleware**: zod/joi schemas for body/query params.
- **Rate limiting**:
  - AI chat route-level limiter (messages/day + burst protection)
  - Global API limiter remains active.
- **Audit logging**: write key actions (project updates, verify requests, media privacy changes).

### 1.3 Frontend integration standards
- Fetch only when expanded (or prefetch on hover for perceived speed if desired).
- Show skeletons in first load and spinner on incremental actions.
- Toast + inline errors with retry CTA.
- Optimistic UI for safe mutations (status toggles, delete).
- Query cache invalidation per widget namespace.

---

## 2) Feature-by-feature implementation plan

## 2.1 SmartBuddy (AI Helper)

### Functional behavior
- Student can send/receive messages.
- Context enrichment includes student profile, grade, interests, project + achievement summary.
- Conversation history appears on expand.
- Hard limits by plan:
  - Basic: capped daily messages
  - Plus/Pro: higher/unlimited cap

### API endpoints
- `POST /api/ai/chat`
  - body: `{ message: string, conversationId?: string, mode?: 'general'|'scholarship'|'study-plan'|'portfolio' }`
  - response: streamed token chunks or final `{ response, usage }`
- `GET /api/ai/history?studentId=:id&cursor=:cursor&limit=:limit`
  - response: paginated conversation threads/messages
- `GET /api/ai/usage?studentId=:id&period=day|month`
  - response: entitlement and usage counters

### Database
- `ai_conversations(id, student_id, title, created_at, updated_at)`
- `ai_messages(id, conversation_id, role, message, response, tokens_in, tokens_out, model, created_at)`
- `ai_usage_daily(id, student_id, date, messages_count, tokens_total)`

### Access control
- student: own conversations only
- parent/teacher/admin: no access unless explicit support tooling route

### UI states when expanded
- Loading: fetch last N conversations + selected thread messages.
- Error: timeout, 429 limit reached, model unavailable.
- Success: render messages, stream response, show “messages left today” for Basic.

---

## 2.2 Projects widget

### Functional behavior
- CRUD projects, upload attachments, set status, collaborators, verification request.

### API endpoints
- `POST /api/projects`
- `GET /api/projects?studentId=:id&status=:status&cursor=:cursor&limit=:limit`
- `GET /api/projects/:id`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`
- `POST /api/projects/:id/verify-request`
- `POST /api/projects/:id/collaborators`
- `DELETE /api/projects/:id/collaborators/:collaboratorId`

### Database
- `projects(id, student_id, title, description, status, verified, started_at, completed_at, created_at, updated_at)`
- `project_files(id, project_id, file_url, file_type, file_size, created_at)`
- `project_collaborators(id, project_id, user_id, role, created_at)`
- `verification_requests(id, entity_type, entity_id, requester_id, assigned_teacher_id, status, created_at, updated_at)`

### Access control
- Student owns create/update/delete on own projects.
- Teacher can review verification requests if linked to same school.
- Parent read-only on linked student.

### UI states
- Expand: list/grid with filters + status badges.
- Modal create/edit with upload progress.
- Empty state CTA: “Create your first project”.

---

## 2.3 Achievements widget

### Functional behavior
- CRUD achievement entries, upload certificate, categorize, verification lifecycle.

### API endpoints
- `POST /api/achievements`
- `GET /api/achievements?studentId=:id&category=:category&verified=:verified`
- `GET /api/achievements/:id`
- `PUT /api/achievements/:id`
- `DELETE /api/achievements/:id`
- `POST /api/achievements/:id/verify-request`

### Database
- `achievements(id, student_id, title, description, category, verified, certificate_url, date_earned, created_at, updated_at)`
- Reuse `verification_requests` for verification workflow.

### Access control
- Student manages own records.
- Teacher verifies based on school membership + permission.

### UI states
- Timeline/list view + category filter.
- Verified badge + verification pending badge.
- Certificate preview/download.

---

## 2.4 Gallery widget

### Functional behavior
- Upload image/video, tag by project/event, set privacy, delete.

### API endpoints
- `POST /api/gallery/upload` (multipart)
- `GET /api/gallery?studentId=:id&privacy=:privacy&type=image|video&cursor=:cursor`
- `PUT /api/gallery/:id` (privacy/tag metadata updates)
- `DELETE /api/gallery/:id`

### Storage + validation
- Bucket/object storage path strategy: `/students/{studentId}/{yyyy}/{mm}/...`
- Validate MIME type + file size + virus scan hook.
- Generate thumbnails for images and poster frames for videos asynchronously.

### Database
- `gallery_items(id, student_id, project_id, event_id, media_url, media_type, privacy, caption, created_at)`

### UI states
- Masonry + preview modal.
- Drag/drop upload with progress + per-file failure handling.

---

## 2.5 Profile Overview widget

### Functional behavior
- Profile read/update, bio/interests/school link, derived counts.

### API endpoints
- `GET /api/students/:id/profile-overview`
- `PUT /api/students/:id`

### Database interactions
- Read from `users` + optional `student_profiles` extension table.
- Aggregate counts:
  - `projects_count`
  - `achievements_count`
  - `verified_achievements_count`

### UI states
- Compact summary collapsed.
- Expanded editor form with validation feedback.

---

## 2.6 Growth Analytics widget

### Functional behavior
- Project completion rate.
- Verified achievement ratio.
- AI usage trends.
- XP/level progression.

### API endpoints
- `GET /api/analytics/student/:id?period=30d|90d|1y`

### Aggregation strategy
- Fast path from materialized/stat tables for dashboard reads.
- Background job recalculates nightly and on key write events.

### UI states
- Charts + progress bars.
- Degraded mode when dataset insufficient (“Need more activity to show trend”).

---

## 2.7 Level system integration (Basic/Plus/Pro)

### Entitlement matrix
| Level | Access |
|---|---|
| Basic | Projects + Achievements + Gallery + Profile |
| Plus | Basic + SmartBuddy + Analytics |
| Pro | Plus + unlimited AI + portfolio export + priority processing |

### Enforcement points
- Middleware at route level (`requirePlanAtLeast('plus')`).
- In-service checks for quota-based capabilities.
- Consistent error contract:
```json
{ "error": "PLAN_UPGRADE_REQUIRED", "message": "Upgrade to Plus to access SmartBuddy." }
```

---

## 3) API schema definitions (OpenAPI-oriented)

## 3.1 Shared response envelopes
```json
// success
{ "success": true, "data": {}, "meta": { "cursor": "..." } }

// error
{ "success": false, "error": "VALIDATION_ERROR", "message": "...", "details": [] }
```

## 3.2 Key DTOs
```yaml
StudentProfileOverview:
  type: object
  properties:
    id: { type: integer }
    fullName: { type: string }
    gradeLevel: { type: string }
    bio: { type: string }
    interests:
      type: array
      items: { type: string }
    schoolId: { type: integer, nullable: true }
    stats:
      type: object
      properties:
        projectsCount: { type: integer }
        achievementsCount: { type: integer }
        verifiedAchievementsCount: { type: integer }

Project:
  type: object
  required: [title, status]
  properties:
    id: { type: integer }
    title: { type: string }
    description: { type: string }
    status: { type: string, enum: [in_progress, completed] }
    verified: { type: boolean }

Achievement:
  type: object
  properties:
    id: { type: integer }
    title: { type: string }
    category: { type: string, enum: [academic, sports, leadership, arts, other] }
    verified: { type: boolean }
    certificateUrl: { type: string, nullable: true }

AnalyticsPayload:
  type: object
  properties:
    projectCompletionRate: { type: number }
    verifiedAchievementCount: { type: integer }
    aiUsage:
      type: object
      properties:
        messagesToday: { type: integer }
        messagesThisMonth: { type: integer }
    xp:
      type: object
      properties:
        level: { type: integer }
        currentXp: { type: integer }
        nextLevelXp: { type: integer }
```

---

## 4) Database relationship validation

## 4.1 Core relationships
- `users (1) -> (N) projects`
- `users (1) -> (N) achievements`
- `users (1) -> (N) gallery_items`
- `users (1) -> (N) ai_conversations`
- `ai_conversations (1) -> (N) ai_messages`
- `projects (1) -> (N) project_files`
- `projects (1) -> (N) project_collaborators`
- `verification_requests` polymorphic link to `projects`/`achievements`

## 4.2 Required constraints/indexes
- FK constraints with `ON DELETE CASCADE` on child records where safe.
- Unique constraints:
  - `(project_id, user_id)` on collaborators.
- Indexes:
  - `(student_id, created_at DESC)` on projects/achievements/gallery/ai tables.
  - Partial index on `verification_requests(status)` where status='pending'.
  - `(student_id, date)` on ai usage table.

---

## 5) Missing endpoints and gap list

### New backend areas needed
1. **AI routes/controller** for chat/history/usage (`/api/ai/*`).
2. **Analytics route/controller** (`/api/analytics/student/:id`).
3. **Students profile-overview route** if current `/api/profile` shape is insufficient.
4. **Verification request workflow endpoints** shared across projects/achievements.
5. **Plan/entitlement middleware** and plan field in user/account domain.

### Existing routes to harden
- Projects, achievements, and gallery should support cursor pagination and richer filters.
- All mutation routes should return structured validation errors.

---

## 6) Scalability and production hardening recommendations

1. **Async processing**
   - Offload media thumbnails/transcoding and heavy analytics to job queue.
2. **Caching**
   - Cache profile overview + analytics snapshots (short TTL + event invalidation).
3. **Observability**
   - Structured logs with request IDs + endpoint latency + error rates.
4. **Data lifecycle**
   - Soft delete for user content + retention policy for AI transcripts.
5. **AI reliability**
   - Fallback model/provider, circuit breaker, timeout budget, retry policy.
6. **Security**
   - Signed URLs for private media access.
   - Upload scanning and MIME allowlist enforcement.

---

## 7) Implementation roadmap (build order)

### Phase 0: Foundations
1. Add entitlement model (Basic/Plus/Pro) and middleware.
2. Standardize API envelope + validation + error codes.
3. Add shared pagination helpers and query conventions.

### Phase 1: Data + backend primitives
1. Add/alter DB tables for AI conversation/messages/usage and verification requests.
2. Extend existing projects/achievements/gallery schemas for filters and metadata.
3. Add migration for indexes and constraints.

### Phase 2: SmartBuddy + Analytics backend
1. Implement `/api/ai/chat`, `/api/ai/history`, `/api/ai/usage` with plan-aware limits.
2. Implement `/api/analytics/student/:id` and nightly/materialized aggregation.

### Phase 3: Widget backend completion
1. Upgrade projects endpoints (collaborators + verify request + pagination).
2. Upgrade achievements endpoints (verify request + category filters).
3. Upgrade gallery endpoints (privacy/tag update + pagination).
4. Add `/api/students/:id/profile-overview`.

### Phase 4: Frontend widget activation
1. Hook expand events to on-demand fetch per widget.
2. Implement loading/error/empty/success states uniformly.
3. Add plan-gated CTAs and upgrade prompts.
4. Add optimistic updates + cache invalidation.

### Phase 5: Quality + launch readiness
1. Contract tests for all new APIs.
2. RBAC/entitlement integration tests.
3. Performance baseline and load test for AI + dashboard aggregation.
4. Rollout with feature flags and staged exposure.

---

## 8) Acceptance criteria checklist
- [ ] All student widgets fetch live data when expanded.
- [ ] All widget APIs enforce auth + role + entitlement checks.
- [ ] SmartBuddy usage caps and plan messages enforced server-side.
- [ ] Projects/Achievements verification flow fully operational.
- [ ] Gallery upload supports validation + privacy controls.
- [ ] Profile overview and analytics expose real aggregates.
- [ ] Errors are standardized and user-readable.
- [ ] Dashboard behavior is production-observable (logs/metrics/traces).
