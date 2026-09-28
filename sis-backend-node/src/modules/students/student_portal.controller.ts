import { Request, Response } from 'express';
import { query, queryOne, execute } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export class StudentPortalController {
  private static getStudentId(req: Request): number {
    const user = (req as any).user;
    return user?.studentId || user?.userId || parseInt(req.query.student_id as string, 10) || 1;
  }

  /**
   * 1. GET /api/StudentPortal/profile
   */
  public static async profile(req: Request, res: Response) {
    try {
      const studentId = StudentPortalController.getStudentId(req);
      const student = await queryOne(`
        SELECT s.*, c.class as class_name, sec.section as section_name
        FROM students s
        LEFT JOIN student_session ss ON ss.student_id = s.id
        LEFT JOIN classes c ON c.id = ss.class_id
        LEFT JOIN sections sec ON sec.id = ss.section_id
        WHERE s.id = ?
        LIMIT 1
      `, [studentId]);

      if (!student) return sendError(res, 'Student profile not found', 404);
      return sendSuccess(res, student);
    } catch (error) {
      logger.error('Error fetching student profile:', error);
      return sendError(res, 'Failed to fetch student profile', 500);
    }
  }

  /**
   * 2. GET /api/StudentPortal/timetable
   */
  public static async timetable(req: Request, res: Response) {
    try {
      const studentId = StudentPortalController.getStudentId(req);
      const stdSession = await queryOne(`SELECT class_id, section_id FROM student_session WHERE student_id = ? ORDER BY id DESC LIMIT 1`, [studentId]);
      
      const classId = stdSession?.class_id || 1;
      const sectionId = stdSession?.section_id || 1;

      const results = await query(`
        SELECT st.*, sub.name as subject_name, stf.name as teacher_name, stf.surname as teacher_surname
        FROM subject_timetable st
        LEFT JOIN subject_group_subjects sgs ON sgs.id = st.subject_group_subject_id
        LEFT JOIN subjects sub ON sub.id = sgs.subject_id
        LEFT JOIN staff stf ON stf.id = st.staff_id
        WHERE st.class_id = ? AND st.section_id = ?
        ORDER BY FIELD(st.day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), st.time_from ASC
      `, [classId, sectionId]);

      return sendSuccess(res, results);
    } catch (error) {
      return sendError(res, 'Failed to fetch timetable', 500);
    }
  }

  /**
   * 3. GET /api/StudentPortal/lesson_plan
   */
  public static async lessonPlan(req: Request, res: Response) {
    try {
      const studentId = StudentPortalController.getStudentId(req);
      const plans = await query(`
        SELECT lp.*, s.name as subject_name, stf.name as teacher_name
        FROM lesson_plan lp
        LEFT JOIN subjects s ON s.id = lp.subject_id
        LEFT JOIN staff stf ON stf.id = lp.staff_id
        ORDER BY lp.id DESC LIMIT 50
      `);
      return sendSuccess(res, plans);
    } catch (error) {
      return sendError(res, 'Failed to fetch lesson plan', 500);
    }
  }

  /**
   * 4. GET /api/StudentPortal/syllabus_status
   */
  public static async syllabusStatus(req: Request, res: Response) {
    try {
      const studentId = StudentPortalController.getStudentId(req);
      const syllabus = await query(`
        SELECT s.id as subject_id, s.name as subject_name,
               COUNT(t.id) as total_topics,
               SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) as completed_topics
        FROM subjects s
        LEFT JOIN topic t ON t.subject_id = s.id
        GROUP BY s.id
      `);
      return sendSuccess(res, syllabus);
    } catch (error) {
      return sendError(res, 'Failed to fetch syllabus status', 500);
    }
  }

  /**
   * 5. GET /api/StudentPortal/homework
   */
  public static async homework(req: Request, res: Response) {
    try {
      const studentId = StudentPortalController.getStudentId(req);
      const stdSession = await queryOne(`SELECT class_id, section_id FROM student_session WHERE student_id = ? ORDER BY id DESC LIMIT 1`, [studentId]);
      
      const rows = await query(`
        SELECT h.*, s.name as subject_name, stf.name as teacher_name,
               he.id as evaluation_id, he.status as submission_status
        FROM homework h
        LEFT JOIN subjects s ON s.id = h.subject_id
        LEFT JOIN staff stf ON stf.id = h.created_by
        LEFT JOIN homework_evaluation he ON he.homework_id = h.id AND he.student_id = ?
        WHERE h.class_id = ? AND h.section_id = ?
        ORDER BY h.homework_date DESC
      `, [studentId, stdSession?.class_id || 1, stdSession?.section_id || 1]);

      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch homework', 500);
    }
  }

  /**
   * 6. GET /api/StudentPortal/attendance
   */
  public static async attendance(req: Request, res: Response) {
    try {
      const studentId = StudentPortalController.getStudentId(req);
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

  /**
   * 7. GET / POST /api/StudentPortal/apply_leave
   */
  public static async applyLeave(req: Request, res: Response) {
    try {
      const studentId = StudentPortalController.getStudentId(req);

      if (req.method === 'GET') {
        const leaves = await query(`
          SELECT sl.*, s.firstname, s.lastname
          FROM student_applyleave sl
          JOIN student_session ss ON ss.id = sl.student_session_id
          JOIN students s ON s.id = ss.student_id
          WHERE ss.student_id = ?
          ORDER BY sl.id DESC
        `, [studentId]);
        return sendSuccess(res, leaves);
      }

      if (req.method === 'POST') {
        const { from_date, to_date, reason, docs } = req.body;
        const stdSession = await queryOne(`SELECT id FROM student_session WHERE student_id = ? ORDER BY id DESC LIMIT 1`, [studentId]);

        const result = await execute(`
          INSERT INTO student_applyleave (student_session_id, apply_date, from_date, to_date, reason, docs, status)
          VALUES (?, CURDATE(), ?, ?, ?, ?, 0)
        `, [stdSession?.id || 1, from_date, to_date, reason || '', docs || null]);

        return sendSuccess(res, { id: result.insertId }, 'Leave applied successfully', 201);
      }
    } catch (error) {
      return sendError(res, 'Failed to process leave application', 500);
    }
  }

  /**
   * 8. GET /api/StudentPortal/fees
   */
  public static async fees(req: Request, res: Response) {
    try {
      const studentId = StudentPortalController.getStudentId(req);
      const stdSession = await queryOne(`SELECT id FROM student_session WHERE student_id = ? ORDER BY id DESC LIMIT 1`, [studentId]);

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
        LEFT JOIN student_fees_deposite sfd ON sfd.student_fees_master_id = sfm.id AND sfd.fee_groups_feetype_id = fgf.id
        WHERE sfm.student_session_id = ?
        ORDER BY fgf.due_date ASC
      `, [stdSession?.id || 1]);

      return sendSuccess(res, fees);
    } catch (error) {
      return sendError(res, 'Failed to fetch student fees', 500);
    }
  }

  /**
   * 9. GET /api/StudentPortal/notices
   */
  public static async notices(req: Request, res: Response) {
    try {
      const notices = await query(`
        SELECT * FROM send_notification 
        WHERE (visible_student = 'yes' OR visible_all = 'yes')
        ORDER BY date DESC LIMIT 30
      `);
      return sendSuccess(res, notices);
    } catch (error) {
      return sendError(res, 'Failed to fetch notices', 500);
    }
  }

  /**
   * 10. GET /api/StudentPortal/library
   */
  public static async library(req: Request, res: Response) {
    try {
      const studentId = StudentPortalController.getStudentId(req);
      const issued = await query(`
        SELECT bi.*, b.book_title, b.author, b.isbn_no
        FROM book_issues bi
        JOIN books b ON b.id = bi.book_id
        JOIN libarary_members lm ON lm.id = bi.member_id
        WHERE lm.member_id = ? AND lm.member_type = 'student'
        ORDER BY bi.id DESC
      `, [studentId]);

      return sendSuccess(res, issued);
    } catch (error) {
      return sendError(res, 'Failed to fetch library records', 500);
    }
  }

  /**
   * 11. GET /api/StudentPortal/transport
   */
  public static async transport(req: Request, res: Response) {
    try {
      const studentId = StudentPortalController.getStudentId(req);
      const transport = await queryOne(`
        SELECT vr.*, tr.route_title, v.vehicle_no, v.driver_name, v.driver_contact
        FROM student_session ss
        JOIN vehicle_routes vr ON vr.id = ss.vehroute_id
        JOIN transport_route tr ON tr.id = vr.route_id
        JOIN vehicles v ON v.id = vr.vehicle_id
        WHERE ss.student_id = ?
        LIMIT 1
      `, [studentId]);

      return sendSuccess(res, transport || {});
    } catch (error) {
      return sendError(res, 'Failed to fetch transport details', 500);
    }
  }

  /**
   * 12. GET /api/StudentPortal/hostel
   */
  public static async hostel(req: Request, res: Response) {
    try {
      const studentId = StudentPortalController.getStudentId(req);
      const hostel = await queryOne(`
        SELECT hr.*, h.hostel_name, h.type as hostel_type, h.address, rt.room_type
        FROM student_session ss
        JOIN hostel_rooms hr ON hr.id = ss.hostel_room_id
        JOIN hostel h ON h.id = hr.hostel_id
        JOIN room_types rt ON rt.id = hr.room_type_id
        WHERE ss.student_id = ?
        LIMIT 1
      `, [studentId]);

      return sendSuccess(res, hostel || {});
    } catch (error) {
      return sendError(res, 'Failed to fetch hostel details', 500);
    }
  }
}
