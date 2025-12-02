import { Request, Response } from 'express';
import { ApiResponse } from '../utils/api.response';
import { generateRecommendationsForStudent } from '../services/recommendations.service';

export const generateRecommendations = async (req: Request, res: Response) => {
  try {
    const studentId = parseInt(String(req.query.studentId || '0'), 10);
    if (!studentId || Number.isNaN(studentId)) return ApiResponse.error(res, 'studentId is required', 400);
    const data = await generateRecommendationsForStudent(studentId);
    return ApiResponse.success(res, data);
  } catch (error: any) {
    return ApiResponse.error(res, 'Server error', 500, error);
  }
};
