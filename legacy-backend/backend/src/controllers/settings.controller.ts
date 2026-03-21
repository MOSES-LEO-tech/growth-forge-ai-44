import { Request, Response } from 'express';
import { pool } from '../config/database';
import { ApiResponse } from '../utils/api.response';

export const getSetting = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const result = await pool.query(
      'SELECT key, value FROM site_settings WHERE key = $1',
      [key]
    );
    
    if (result.rows.length === 0) {
      return ApiResponse.success(res, { key, value: null });
    }
    
    return ApiResponse.success(res, result.rows[0]);
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to get setting', 500, error);
  }
};

export const updateSetting = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    const result = await pool.query(
      `INSERT INTO site_settings (key, value, updated_at) 
       VALUES ($1, $2, NOW()) 
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
       RETURNING *`,
      [key, value]
    );
    
    return ApiResponse.success(res, result.rows[0], 'Setting updated');
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to update setting', 500, error);
  }
};

export const getAllSettings = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT key, value FROM site_settings');
    return ApiResponse.success(res, result.rows);
  } catch (error: any) {
    return ApiResponse.error(res, 'Failed to get settings', 500, error);
  }
};
