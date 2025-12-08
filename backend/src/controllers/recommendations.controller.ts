import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../utils/api.response';
import { generateRecommendationsForStudent } from '../services/recommendations.service';

// Authenticated endpoint - uses logged-in user
export const generateRecommendations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'Unauthorized', 401);

    const data = await generateRecommendationsForStudent(userId);
    return ApiResponse.success(res, data);
  } catch (error: any) {
    return ApiResponse.error(res, 'Server error', 500, error);
  }
};
