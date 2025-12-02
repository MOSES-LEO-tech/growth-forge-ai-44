import { Request, Response } from 'express';
import { ApiResponse } from '../utils/api.response';
import { matchScholarshipsForStudent } from '../services/match.service';

export const matchScholarships = async (req: Request, res: Response) => {
  try {
    const studentId = parseInt(String(req.query.studentId || '0'), 10);
    const limit = parseInt(String(req.query.limit || '10'), 10);
    if (!studentId || Number.isNaN(studentId)) return ApiResponse.error(res, 'studentId is required', 400);
    const results = await matchScholarshipsForStudent(studentId, limit);
    return ApiResponse.success(res, { matches: results, meta: { total: results.length } });
  } catch (error: any) {
    return ApiResponse.error(res, 'Server error', 500, error);
  }
};
