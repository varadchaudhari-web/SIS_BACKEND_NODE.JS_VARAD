import { Request, Response } from 'express';
import { query, queryOne } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export class ParentPortalController {
  private static getParentId(req: Request): number {
    const user = (req as any).user;
    return user?.parentId || user?.userId || parseInt(req.query.parent_id as string, 10) || 1;
  }

  /**
   * 1. GET /api/ParentPortal/dashboard or /api/ParentPortal/children
   * Returns list of all children linked to this parent
   */
  public static async getChildren(req: Request, res: Response) {
    try {
      const parentId = ParentPortalController.getParentId(req);
      const children = await query(`
        SELECT s.*, c.class as class_name, sec.section as section_name
        FROM students s
        LEFT JOIN student_session ss ON ss.student_id = s.id
        LEFT JOIN classes c ON c.id = ss.class_id
        LEFT JOIN sections sec ON sec.id = ss.section_id
        WHERE s.parent_id = ? OR s.id = ?
        ORDER BY s.id ASC
      `, [parentId, parentId]);

      return sendSuccess(res, children);
    } catch (error) {
      logger.error('Error fetching parent children:', error);
      return sendError(res, 'Failed to fetch children data', 500);
    }
  }

  /**
   * 2. GET /api/ParentPortal/child_overview
   */
  public static async childOverview(req: Request, res: Response) {
    try {
      const studentId = req.query.student_id || req.params.student_id;
      if (!studentId) return sendError(res, 'Student ID required', 400);

      const student = await queryOne(`
        SELECT s.*, c.class as class_name, sec.section as section_name
        FROM students s
        LEFT JOIN student_session ss ON ss.student_id = s.id
        LEFT JOIN classes c ON c.id = ss.class_id
        LEFT JOIN sections sec ON sec.id = ss.section_id
        WHERE s.id = ?
        LIMIT 1
      `, [studentId]);

      if (!student) return sendError(res, 'Child record not found', 404);
      return sendSuccess(res, student);
    } catch (error) {
      return sendError(res, 'Failed to fetch child overview', 500);
    }
  }

  /**
   * 3. GET /api/ParentPortal/fees
   */
  public static async fees(req: Request, res: Response) {
    try {
      const studentId = req.query.student_id;
      if (!studentId) return sendError(res, 'Student ID required', 400);

      const fees = await query(`
        SELECT sfm.id as master_id, sfm.student_session_id, sfm.amount as master_amount,
               fgf.id as fee_groups_feetype_id, fgf.amount, fgf.due_date,
               ft.type as fee_type, ft.code as fee_code, fg.name as group_name,
               sfd.id as deposit_id, sfd.amount_detail
        FROM student_fees_master sfm
        JOIN fee_session_groups fsg ON fsg.id = sfm.fee_session_group_id
        JOIN fee_groups fg ON fg.id = fsg.fee_groups_id
        JOIN fee_groups_feetype fgf ON fgf.fee_session_group_id = fsg.id
        JOIN feetype ft ON ft.id = fgf.feetype_id
        JOIN student_session ss ON ss.id = sfm.student_session_id
        LEFT JOIN student_fees_deposite sfd ON sfd.student_fees_master_id = sfm.id AND sfd.fee_groups_feetype_id = fgf.id
        WHERE ss.student_id = ?
        ORDER BY fgf.due_date ASC
      `, [studentId]);

      return sendSuccess(res, fees);
    } catch (error) {
      return sendError(res, 'Failed to fetch fees', 500);
    }
  }

  /**
   * 4. GET /api/ParentPortal/attendance
   */
  public static async attendance(req: Request, res: Response) {
    try {
      const studentId = req.query.student_id;
      if (!studentId) return sendError(res, 'Student ID required', 400);

      const rows = await query(`
        SELECT sa.date, at.type as attendance_type, at.key_value, sa.remark, sa.attendence_type_id
        FROM student_attendences sa
        LEFT JOIN attendence_type at ON at.id = sa.attendence_type_id
        JOIN student_session ss ON ss.id = sa.student_session_id
        WHERE ss.student_id = ?
        ORDER BY sa.date DESC
      `, [studentId]);

      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch attendance', 500);
    }
  }
}
