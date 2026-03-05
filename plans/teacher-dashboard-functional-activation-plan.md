# Teacher Dashboard Functional Activation Plan

## Executive Summary

This plan outlines the implementation of full backend-connected functionality for the Teacher Dashboard. The focus is on enhancing existing widgets with real data, creating teacher-specific endpoints, and ensuring proper role-based access control.

## Current State Analysis

### Existing Components
- **TeacherDashboard.tsx** - Main dashboard component with 4 expandable widgets
- **PendingApprovalsWidget** - Handles achievement and project verification (partially connected)
- **StudentDirectoryWidget** - Displays student directory (uses mock data)
- **TeacherStatsWidget** - Shows statistics (needs backend connection)
- **SchoolGalleryWidget** - School gallery display

### Existing Backend Infrastructure
- Project verification endpoint: `POST /api/projects/:id/verify`
- Achievement verification endpoint: `POST /api/achievements/verify/:id`
- RBAC middleware with `authorize()` and `requireSchoolMember()`
- Analytics endpoints for students (can be extended for teachers)

### Database Schema (Existing)
- `users` table with role, school_id fields
- `projects` table with verified, verified_by fields
- `achievements` table with verified, verified_by fields

---

## Implementation Plan

### Phase 1: Database Schema Extensions

#### 1.1 Create Classes Table
```sql
CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  grade VARCHAR(50),
  subject VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);
```

#### 1.2 Create Class_Students Table
```sql
CREATE TABLE IF NOT EXISTS class_students (
  id SERIAL PRIMARY KEY,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, student_id)
);
```

#### 1.3 Create Notifications Table (if not exists)
```sql
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  resource_type VARCHAR(50),
  resource_id INTEGER,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 1.4 Add Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_class_students_class ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student ON class_students(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
```

---

### Phase 2: Backend Routes and Controllers

#### 2.1 Teacher Routes Structure

```
/api/teacher/
├── /classes                    GET    - List teacher's assigned classes
├── /class/:id/students        GET    - Get students in a specific class
├── /students                  GET    - Get all students across teacher's classes
├── /student/:id               GET    - Get student profile (teacher's student only)
├── /analytics/class/:id       GET    - Class-level analytics
├── /analytics/overview        GET    - Teacher's dashboard analytics
├── /notifications             GET    - Get teacher's notifications
├── /notifications/:id/read    PATCH  - Mark notification as read
└── /notifications/read-all    PATCH  - Mark all as read
```

#### 2.2 New Route Files to Create

1. **backend/src/routes/teacher.routes.ts** - Main teacher routes
2. **backend/src/controllers/teacher.controller.ts** - Teacher controller functions

#### 2.3 Controller Functions to Implement

```typescript
// teacher.controller.ts
export const getTeacherClasses = async (req, res) => {
  // Fetch classes where teacher_id = req.user.id
  // Include student count per class
};

export const getClassStudents = async (req, res) => {
  // Fetch students enrolled in specific class
  // Validate teacher owns the class
};

export const getAllTeacherStudents = async (req, res) => {
  // Get all students across all teacher's classes
  // Support search and filter
};

export const getTeacherStudent = async (req, res) => {
  // Get specific student profile
  // Validate student belongs to teacher's class
};

export const getTeacherAnalytics = async (req, res) => {
  // Aggregate analytics across teacher's classes
  // Project completion rates, achievement stats, etc.
};

export const getClassAnalytics = async (req, res) => {
  // Class-specific analytics
  // Validate teacher owns the class
};

export const getTeacherNotifications = async (req, res) => {
  // Get notifications for teacher
};

export const markNotificationRead = async (req, res) => {
  // Mark single notification as read
};

export const markAllNotificationsRead = async (req, res) => {
  // Mark all notifications as read
};
```

---

### Phase 3: RBAC Middleware Enhancements

#### 3.1 Teacher Access Control Middleware

Create `backend/src/middleware/teacher-access.middleware.ts`:

```typescript
export const requireTeacherClassAccess = async (req, res, next) => {
  // Verify user is a teacher
  // If classId in params, verify teacher owns that class
  // If studentId in params, verify student is in teacher's class
};

export const requireTeacherStudentAccess = async (req, res, next) => {
  // Verify student belongs to teacher's assigned classes
};
```

#### 3.2 Middleware Integration

Update existing routes to use teacher-specific middleware:
- `/api/teacher/class/:id/students` - requireTeacherClassAccess
- `/api/teacher/student/:id` - requireTeacherStudentAccess

---

### Phase 4: Frontend API Services

#### 4.1 Update src/services/api.ts

Add teacher API endpoints:

```typescript
export const teacher = {
  getClasses: () => api.get('/teacher/classes'),
  getClassStudents: (classId: string) => api.get(`/teacher/class/${classId}/students`),
  getStudents: (params?: { search?: string; grade?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.grade) query.append('grade', params.grade);
    return api.get('/teacher/students?' + query.toString());
  },
  getStudent: (id: string) => api.get(`/teacher/student/${id}`),
  getAnalytics: () => api.get('/teacher/analytics/overview'),
  getClassAnalytics: (classId: string) => api.get(`/teacher/analytics/class/${classId}`),
  getNotifications: () => api.get('/teacher/notifications'),
  markNotificationRead: (id: string) => api.patch(`/teacher/notifications/${id}/read`),
  markAllNotificationsRead: () => api.patch('/teacher/notifications/read-all'),
};
```

---

### Phase 5: Widget Enhancements

#### 5.1 PendingApprovalsWidget Enhancements

The existing widget already has partial backend connection. Enhance with:
- Real-time pending counts from backend
- Filter by class
- Search functionality
- Feedback comment before verification
- Rejection functionality (not just verification)

**Backend endpoints needed:**
- GET `/teacher/projects/pending` - Get pending projects from teacher's students
- GET `/teacher/achievements/pending` - Get pending achievements from teacher's students
- POST `/teacher/project/:id/reject` - Reject project with reason
- POST `/teacher/achievement/:id/reject` - Reject achievement with reason
- POST `/teacher/project/:id/feedback` - Add feedback to project

#### 5.2 StudentDirectoryWidget Backend Connection

Replace mock data with real backend data:
- Fetch from `/teacher/students` endpoint
- Support search by name/email
- Support filter by grade
- Display real student data (projects, achievements counts)
- Add view profile action
- Add message action

#### 5.3 TeacherStatsWidget Backend Connection

Connect to `/teacher/analytics/overview` endpoint:
- Total students count
- Pending verifications count
- Class completion rates
- Recent activity

---

### Phase 6: Notification System

#### 6.1 Notification Types for Teachers

| Type | Trigger | Content |
|------|---------|---------|
| project_submission | Student submits project | "New project submitted by {student}" |
| achievement_submission | Student submits achievement | "New achievement submitted by {student}" |
| parent_message | Parent sends message | "New message from {parent}" |
| deadline_reminder | Assignment deadline approaching | "Assignment '{title}' due soon" |

#### 6.2 Notification Delivery

- Create notification on relevant actions
- Store in `notifications` table
- Real-time updates via polling or WebSocket (future)

---

### Phase 7: TeacherDashboard Integration

#### 7.1 Updated Dashboard Layout

```tsx
const TeacherDashboard = ({ profile }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Row 1: Core Actions */}
      <PendingApprovalsWidget defaultExpanded={true} />
      <TeacherStatsWidget />
      
      {/* Row 2: Management */}
      <StudentDirectoryWidget />
      <NotificationsWidget />  {/* New widget */}
    </div>
  );
};
```

#### 7.2 New Widget: NotificationsWidget

Create `src/components/widgets/NotificationsWidget.ts Display teacher notificationsx`:
-
- Mark as read functionality
- Link to relevant resources

---

## API Route Structure

### Complete Teacher API Routes

```
/api/teacher
├── GET    /classes                    - List all classes for teacher
├── GET    /class/:id                 - Get class details
├── GET    /class/:id/students        - Get students in class
├── GET    /students                  - Get all teacher's students (with search/filter)
├── GET    /student/:id               - Get student profile
├── GET    /analytics/overview        - Dashboard analytics
├── GET    /analytics/class/:id       - Class-specific analytics
├── GET    /notifications             - Get notifications
├── PATCH   /notifications/:id/read   - Mark as read
├── PATCH   /notifications/read-all   - Mark all as read

// Verification endpoints (extend existing)
├── GET    /projects/pending          - Pending projects
├── POST   /project/:id/verify        - Verify project
├── POST   /project/:id/reject        - Reject project
├── POST   /project/:id/feedback      - Add feedback
├── GET    /achievements/pending      - Pending achievements
├── POST   /achievement/:id/verify    - Verify achievement
├── POST   /achievement/:id/reject    - Reject achievement
```

---

## Role Enforcement Rules

### Teacher CAN:
- ✅ Review projects from students in their classes
- ✅ Verify/reject achievements from students in their classes
- ✅ View student profiles and academic summaries
- ✅ View class and school analytics
- ✅ Receive notifications about student submissions
- ✅ Message students and parents within their school

### Teacher CANNOT:
- ❌ Edit system settings
- ❌ Delete student accounts
- ❌ Modify school configuration
- ❌ Access students outside their assigned classes
- ❌ Access other teachers' classes
- ❌ Override admin permissions

### Access Control Implementation

```typescript
// Middleware validates:
// 1. User has 'teacher' role
// 2. Teacher's school_id matches resource's school_id (for school-level resources)
// 3. Teacher owns the class (for class-specific resources)
// 4. Student is enrolled in teacher's class (for student-specific resources)

// Returns 403 if:
// - User is not a teacher
// - Resource belongs to different school
// - Teacher doesn't own the class
// - Student not in teacher's class
```

---

## Edge Cases to Handle

| Edge Case | Handling |
|-----------|----------|
| Teacher without assigned class | Show empty state with message |
| Student removed from class | Remove from teacher's view, 403 if accessed directly |
| Duplicate verification | Check if already verified, return early |
| Deleted project during review | Handle gracefully, show "no longer available" |
| Parent message from outside school | Block at API level |

---

## Implementation Order

1. **Database Migration** - Create classes, class_students, notifications tables
2. **Basic Routes** - Teacher classes and students endpoints
3. **RBAC Middleware** - Teacher access control middleware
4. **API Services** - Frontend teacher API service
5. **StudentDirectoryWidget** - Connect to backend
6. **PendingApprovalsWidget** - Enhance with reject and feedback
7. **TeacherStatsWidget** - Connect to analytics endpoint
8. **NotificationsWidget** - New notifications widget
9. **TeacherDashboard** - Update layout and integrate
10. **Testing** - Validate all functionality

---

## Files to Create/Modify

### New Files
- `backend/migrations/007_teacher_classes.sql` - Database migration
- `backend/src/routes/teacher.routes.ts` - Teacher routes
- `backend/src/controllers/teacher.controller.ts` - Teacher controller
- `backend/src/middleware/teacher-access.middleware.ts` - Teacher access middleware
- `src/components/widgets/NotificationsWidget.tsx` - New notifications widget

### Files to Modify
- `backend/src/server.ts` - Register teacher routes
- `src/services/api.ts` - Add teacher API endpoints
- `src/components/widgets/PendingApprovalsWidget.tsx` - Enhance verification
- `src/components/widgets/StudentDirectoryWidget.tsx` - Connect to backend
- `src/components/widgets/TeacherStatsWidget.tsx` - Connect to backend
- `src/components/dashboards/TeacherDashboard.tsx` - Update layout

---

## Performance Considerations

1. **Database Indexes** - Add indexes on foreign keys and frequently queried columns
2. **Pagination** - Implement pagination for student lists (default 20 per page)
3. **Caching** - Cache teacher-class relationships (invalidated on changes)
4. **Rate Limiting** - Apply rate limits to verification endpoints
5. **Query Optimization** - Use JOINs efficiently, avoid N+1 queries

---

## Validation Checklist

- [ ] Teacher can only see their assigned classes
- [ ] Teacher can only see students in their classes
- [ ] Teacher cannot access students outside their classes (403)
- [ ] Project verification updates verified_by field
- [ ] Achievement verification updates verified_by field
- [ ] Notifications created on student submissions
- [ ] All endpoints require authentication
- [ ] All endpoints enforce role = 'teacher' where appropriate
