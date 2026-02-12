import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import recommendationsService from '../services/recommendations.service';
import { ApiResponse } from '../utils/api.response';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get personalized scholarship recommendations
router.get('/scholarships', async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const limit = Number(req.query.limit) || 10;

        const scholarships = await recommendationsService.getMatchingScholarships(userId, limit);

        return ApiResponse.success(res, {
            scholarships,
            count: scholarships.length,
        }, 'Scholarship recommendations generated');
    } catch (error: any) {
        console.error('Get scholarships error:', error);
        return ApiResponse.error(res, 'Failed to generate scholarship recommendations', 500, error);
    }
});

// Get personalized action items
router.get('/actions', async (req, res) => {
    try {
        const userId = (req as any).user.id;

        const actions = await recommendationsService.getActionItems(userId);

        return ApiResponse.success(res, {
            actions,
            count: actions.length,
        }, 'Action items generated');
    } catch (error: any) {
        console.error('Get actions error:', error);
        return ApiResponse.error(res, 'Failed to generate action items', 500, error);
    }
});

// Get profile completeness score
router.get('/completeness', async (req, res) => {
    try {
        const userId = (req as any).user.id;

        const completeness = await recommendationsService.getProfileCompleteness(userId);

        return ApiResponse.success(res, completeness, 'Profile completeness calculated');
    } catch (error: any) {
        console.error('Get completeness error:', error);
        return ApiResponse.error(res, 'Failed to calculate profile completeness', 500, error);
    }
});

// Get recommended skills
router.get('/skills', async (req, res) => {
    try {
        const userId = (req as any).user.id;

        const skills = await recommendationsService.getRecommendedSkills(userId);

        return ApiResponse.success(res, {
            skills,
            count: skills.length,
        }, 'Recommended skills generated');
    } catch (error: any) {
        console.error('Get skills error:', error);
        return ApiResponse.error(res, 'Failed to generate skill recommendations', 500, error);
    }
});

// Combined endpoint - get all recommendations
router.get('/dashboard', async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const limit = Number(req.query.limit) || 5;

        const [scholarships, actions, completeness, skills] = await Promise.all([
            recommendationsService.getMatchingScholarships(userId, limit),
            recommendationsService.getActionItems(userId),
            recommendationsService.getProfileCompleteness(userId),
            recommendationsService.getRecommendedSkills(userId),
        ]);

        return ApiResponse.success(res, {
            scholarships: scholarships.slice(0, limit),
            actions,
            completeness,
            recommendedSkills: skills.slice(0, 10),
        }, 'Recommendations dashboard data generated');
    } catch (error: any) {
        console.error('Get dashboard error:', error);
        return ApiResponse.error(res, 'Failed to generate recommendations dashboard', 500, error);
    }
});

// Legacy endpoint (for backward compatibility)
router.get('/generate', async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const limit = Number(req.query.limit) || 10;

        const scholarships = await recommendationsService.getMatchingScholarships(userId, limit);
        const actions = await recommendationsService.getActionItems(userId);

        return ApiResponse.success(res, {
            scholarships,
            actions: actions.map(a => a.title),
        }, 'Recommendations generated');
    } catch (error: any) {
        console.error('Generate recommendations error:', error);
        return ApiResponse.error(res, 'Failed to generate recommendations', 500, error);
    }
});

export default router;
