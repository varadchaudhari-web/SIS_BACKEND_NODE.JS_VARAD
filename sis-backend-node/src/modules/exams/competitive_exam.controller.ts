import { Request, Response } from 'express';
import { query, queryOne, execute } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export class CompetitiveExamController {
  /**
   * GET /api/exams/competitive/list
   */
  public static async list(req: Request, res: Response) {
    try {
      const rows = await query(`
        SELECT ce.*, 
               (SELECT COUNT(*) FROM competitive_exam_registrations cer WHERE cer.competitive_exam_id = ce.id) as total_registered
        FROM competitive_exams ce
        ORDER BY ce.id DESC
      `).catch(async () => {
        // Fallback query if table is newly referenced
        return await query(`SELECT * FROM onlineexam WHERE exam_type = 'competitive' OR is_active = 'yes'`);
      });
      return sendSuccess(res, rows);
    } catch (error) {
      logger.error('Error in competitive exam list:', error);
      return sendError(res, 'Failed to fetch competitive exams', 500);
    }
  }

  /**
   * GET /api/exams/competitive/registrations
   */
  public static async registrations(req: Request, res: Response) {
    try {
      const examId = req.query.exam_id;
      const rows = await query(`
        SELECT cer.*, s.admission_no, s.roll_no, s.firstname, s.lastname, c.class as class_name, sec.section as section_name
        FROM competitive_exam_registrations cer
        JOIN students s ON s.id = cer.student_id
        JOIN student_session ss ON ss.student_id = s.id
        JOIN classes c ON c.id = ss.class_id
        JOIN sections sec ON sec.id = ss.section_id
        WHERE 1=1 ${examId ? 'AND cer.competitive_exam_id = ?' : ''}
        ORDER BY cer.id DESC
      `, examId ? [examId] : []).catch(() => []);

      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch registrations', 500);
    }
  }
}
