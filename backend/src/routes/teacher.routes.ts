import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import {
    getTeacherClasses,
    getClassById,
    getClassStudents,
    getAllTeacherStudents,
    getTeacherStudent,
    getTeacherAnalytics,
    getClassAnalytics,
    getTeacherNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    getPendingProjects,
    getPendingAchievements,
    rejectProject,
    rejectAchievement,
    addProjectFeedback
} from '../controllers/teacher.controller';

const router = Router();

// All teacher routes require authentication + teacher role
router.use(authenticateToken);
router.use(authorize(['teacher', 'admin']));

// Class management
router.get('/classes', getTeacherClasses);
router.get('/class/:id', getClassById);
router.get('/class/:id/students', getClassStudents);

// Student management
router.get('/students', getAllTeacherStudents);
router.get('/student/:id', getTeacherStudent);

// Analytics
router.get('/analytics/overview', getTeacherAnalytics);
router.get('/analytics/class/:id', getClassAnalytics);

// Notifications
router.get('/notifications', getTeacherNotifications);
router.patch('/notifications/:id/read', markNotificationRead);
router.patch('/notifications/read-all', markAllNotificationsRead);

// Verification endpoints
router.get('/projects/pending', getPendingProjects);
router.post('/project/:id/reject', rejectProject);
router.post('/project/:id/feedback', addProjectFeedback);

router.get('/achievements/pending', getPendingAchievements);
router.post('/achievement/:id/reject', rejectAchievement);

export default router;
