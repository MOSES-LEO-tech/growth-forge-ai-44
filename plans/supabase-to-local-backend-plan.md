# Plan: Switch Frontend from Supabase to Local Backend

## Executive Summary

The frontend is **partially already configured** to use the local backend API. The main authentication and dashboard flows are working with the local backend. This plan outlines the remaining work to complete the migration and remove Supabase dependencies.

---

## Current State Assessment

### ✅ Already Completed (Working)
| Component | Status | Notes |
|-----------|--------|-------|
| [`api.ts`](growth-forge-ai-44-main/src/services/api.ts) | ✅ Working | Configured to use `http://localhost:3000/api` |
| [`Auth.tsx`](growth-forge-ai-44-main/src/pages/Auth.tsx) | ✅ Working | Login/register using local API |
| [`Dashboard.tsx`](growth-forge-ai-44-main/src/pages/Dashboard.tsx) | ✅ Working | User session management via local API |
| [`StudentDashboard.tsx`](growth-forge-ai-44-main/src/components/dashboards/StudentDashboard.tsx) | ✅ Working | Fetches achievements/projects via API |
| [`Recommendations.tsx`](growth-forge-ai-44-main/src/components/Recommendations.tsx) | ✅ Working | Uses `/recommendations/generate` endpoint |
| Backend Auth Routes | ✅ Working | Login, register, logout, token refresh |
| Backend Achievements Routes | ✅ Working | GET/POST/PUT/DELETE achievements |
| Backend Projects Routes | ✅ Working | GET/POST/PUT/DELETE projects |

### ⚠️ Needs Cleanup (Supabase References)
| Component | Issue |
|-----------|-------|
| [`integrations/supabase/`](growth-forge-ai-44-main/src/integrations/supabase/) directory | Dead code - not imported anywhere but present |
| [`.env`](growth-forge-ai-44-main/.env) | Still has Supabase credentials |
| [`package.json`](growth-forge-ai-44-main/package.json) | May have unused Supabase dependencies |

### 🔄 May Need Implementation
| Feature | Status | Notes |
|---------|--------|-------|
| Profile Management | ⚠️ Partial | `GET /auth/profile` exists, `PUT /auth/profile` needs testing |
| File Upload | ❌ Missing | Upload routes exist but need integration |
| Gallery Management | ❌ Missing | Routes exist but no frontend integration |
| Settings | ❌ Missing | Routes exist but no frontend integration |
| Scholarship Matching | ⚠️ Basic | Returns raw scholarships, needs enhancement |

---

## Architecture Diagram

```mermaid
graph TD
    subgraph Frontend [growth-forge-ai-44-main]
        A[Auth.tsx] --> S[api.ts Service]
        B[Dashboard.tsx] --> S
        C[StudentDashboard.tsx] --> S
        D[Recommendations.tsx] --> S
        E[ScholarshipMatches.tsx] --> S
    end

    subgraph API Service [api.ts]
        S --> |HTTP Requests| LB[Local Backend<br/>localhost:3000]
    end

    subgraph Local Backend [backend]
        LB --> R1[/auth/*]
        LB --> R2[/achievements/*]
        LB --> R3[/projects/*]
        LB --> R4[/recommendations/*]
        LB --> R5[/upload/*]
        LB --> R6[/gallery/*]
        LB --> R7[/profile/*]
        LB --> R8[/settings/*]
    end

    subgraph Database [PostgreSQL]
        R1 --> DB[(growth_forge DB)]
        R2 --> DB
        R3 --> DB
        R4 --> DB
        R5 --> DB
        R6 --> DB
        R7 --> DB
        R8 --> DB
    end

    style LB fill:#90EE90
    style S fill:#90EE90
    style A fill:#90EE90
    style B fill:#90EE90
    style C fill:#90EE90
```

---

## Implementation Plan

### Phase 1: Cleanup (Low Risk)
1. **Remove Supabase Integration Directory**
   - Delete [`growth-forge-ai-44-main/src/integrations/`](growth-forge-ai-44-main/src/integrations/) directory
   - This code is not imported anywhere in the frontend

2. **Clean Environment Variables**
   - Remove `VITE_SUPABASE_PROJECT_ID` from [`.env`](growth-forge-ai-44-main/.env)
   - Remove `VITE_SUPABASE_PUBLISHABLE_KEY` from [`.env`](growth-forge-ai-44-main/.env)
   - Remove `VITE_SUPABASE_URL` from [`.env`](growth-forge-ai-44-main/.env)
   - Keep `VITE_API_URL="http://localhost:3000/api"`

3. **Remove Supabase Dependencies**
   - Check [`package.json`](growth-forge-ai-44-main/package.json) for `@supabase/supabase-js`
   - Remove if present and not used elsewhere

### Phase 2: Backend Verification (Medium Risk)
4. **Verify CORS Configuration**
   - Ensure [`backend/src/server.ts`](backend/src/server.ts) allows requests from frontend origin (`http://localhost:8080` or `5173` for Vite)

5. **Test All Existing Endpoints**
   - Auth: Login, Register, Logout, Get Profile
   - Achievements: GET, POST, PUT, DELETE
   - Projects: GET, POST, PUT, DELETE
   - Recommendations: GET /generate

### Phase 3: Feature Completion (Medium Risk)
6. **Implement Profile Management UI**
   - Create/update profile page that uses `PUT /auth/profile`
   - Add avatar upload functionality

7. **Implement File Upload UI**
   - Add file upload components for achievements/projects
   - Integrate with `POST /upload` endpoint

8. **Implement Gallery UI**
   - Personal gallery management
   - School gallery viewing

9. **Implement Settings Page**
   - Password change (`PUT /auth/change-password`)
   - Notification preferences

10. **Enhance Scholarship Matching**
    - Add dedicated scholarship endpoints
    - Improve matching algorithm

---

## File Changes Summary

### Files to DELETE:
```
growth-forge-ai-44-main/src/integrations/supabase/client.ts
growth-forge-ai-44-main/src/integrations/supabase/types.ts
growth-forge-ai-44-main/src/integrations/supabase/student-api.ts
growth-forge-ai-44-main/src/integrations/supabase/ (entire directory)
```

### Files to MODIFY:
```
growth-forge-ai-44-main/.env (remove Supabase vars)
growth-forge-ai-44-main/package.json (remove supabase dependency if present)
```

### Files to CREATE (if needed):
```
growth-forge-ai-44-main/src/pages/Profile.tsx (profile management)
growth-forge-ai-44-main/src/pages/Settings.tsx (user settings)
growth-forge-ai-44-main/src/components/UploadButton.tsx (file upload)
growth-forge-ai-44-main/src/pages/Gallery.tsx (gallery management)
```

### Files to TEST (verify working):
```
growth-forge-ai-44-main/src/services/api.ts
growth-forge-ai-44-main/src/pages/Auth.tsx
growth-forge-ai-44-main/src/pages/Dashboard.tsx
growth-forge-ai-44-main/src/components/dashboards/StudentDashboard.tsx
growth-forge-ai-44-main/src/components/Recommendations.tsx
growth-forge-ai-44-main/src/components/ScholarshipMatches.tsx
```

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| CORS errors | High | Low | Verify CORS config in backend |
| Missing endpoints | Medium | Low | Test all endpoints before cleanup |
| Breaking auth flow | High | Low | Keep Supabase cleanup until auth works |
| File upload issues | Medium | Medium | Implement upload UI carefully |

---

## Success Criteria

1. ✅ All Supabase references removed from codebase
2. ✅ Frontend successfully authenticates via local backend
3. ✅ All dashboard features work with local backend
4. ✅ No console errors related to Supabase
5. ✅ Clean package.json without unused dependencies

---

## Estimated Effort

- **Phase 1 (Cleanup)**: ~10 minutes
- **Phase 2 (Verification)**: ~20 minutes
- **Phase 3 (Features)**: ~2-4 hours (depending on feature scope)

---

## Next Steps

1. Review and approve this plan
2. Begin Phase 1: Cleanup Supabase references
3. Test current functionality
4. Proceed with Phase 2 and 3 as needed
