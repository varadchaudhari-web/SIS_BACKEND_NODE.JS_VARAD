import { Request, Response } from 'express';
import { query, queryOne, execute, transaction } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export class AttendanceController {
  /**
   * GET /api/attendance/mode
   */
  public static async getAttendanceMode(req: Request, res: Response) {
    try {
      const setting = await queryOne(`SELECT attendence_type FROM sch_settings LIMIT 1`);
      const attendence_type = setting && setting.attendence_type !== undefined ? String(setting.attendence_type) : '0';
      const mode_text = attendence_type === '1' ? 'Period Wise' : 'Day Wise';
      return res.json({
        status: true,
        success: true,
        data: {
          attendence_type,
          mode_text,
          mode: attendence_type
        }
      });
    } catch (error) {
      return res.json({
        status: true,
        success: true,
        data: {
          attendence_type: '0',
          mode_text: 'Day Wise',
          mode: '0'
        }
      });
    }
  }

  /**
   * GET /api/attendance/subjects
   */
  public static async getSubjectsForAttendance(req: Request, res: Response) {
    try {
      const classId = req.query.class_id;
      const sectionId = req.query.section_id;
      const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];

      if (!classId || !sectionId) {
        return sendSuccess(res, []);
      }

      // Convert date to Day name (e.g. Monday, Tuesday, ...)
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const parsedDate = new Date(dateStr);
      const dayName = isNaN(parsedDate.getTime()) ? 'Monday' : dayNames[parsedDate.getDay()];

      // 1. First check if subject timetable entries exist for this class, section, day
      const timetableSlots = await query(`
        SELECT st.id, st.day, st.time_from, st.time_to, st.room_no,
               s.id as subject_id, s.name as subject_name, s.code as subject_code, s.type as subject_type,
               stf.name as staff_name, stf.surname as staff_surname
        FROM subject_timetable st
        LEFT JOIN subject_group_subjects sgs ON sgs.id = st.subject_group_subject_id
        LEFT JOIN subjects s ON s.id = sgs.subject_id
        LEFT JOIN staff stf ON stf.id = st.staff_id
        WHERE st.class_id = ? AND st.section_id = ? AND st.day = ?
        ORDER BY STR_TO_DATE(st.time_from, '%h:%i %p') ASC, st.id ASC
      `, [classId, sectionId, dayName]);

      if (timetableSlots && timetableSlots.length > 0) {
        const mapped = timetableSlots.map((st: any) => {
          const name = st.subject_name || st.room_no || 'Period';
          const timeStr = st.time_from && st.time_to ? ` (${st.time_from} - ${st.time_to})` : '';
          return {
            id: String(st.id),
            label: `${name}${timeStr}`,
            subject_name: name,
            subject_id: st.subject_id,
            time_from: st.time_from,
            time_to: st.time_to,
            room_no: st.room_no,
            teacher: st.staff_name ? `${st.staff_name} ${st.staff_surname || ''}`.trim() : ''
          };
        });
        return sendSuccess(res, mapped);
      }

      // 2. Fallback to subjects linked via subject_group_class_sections
      const linkedSubjects = await query(`
        SELECT DISTINCT s.id, s.name as subject_name, s.code as subject_code, s.type as subject_type
        FROM class_sections cs
        JOIN subject_group_class_sections sgcs ON sgcs.class_section_id = cs.id
        JOIN subject_group_subjects sgs ON sgs.subject_group_id = sgcs.subject_group_id
        JOIN subjects s ON s.id = sgs.subject_id
        WHERE cs.class_id = ? AND cs.section_id = ?
        ORDER BY s.name ASC
      `, [classId, sectionId]);

      if (linkedSubjects && linkedSubjects.length > 0) {
        const mapped = linkedSubjects.map((s: any) => ({
          id: String(s.id),
          label: `${s.subject_name} (${s.subject_code || s.subject_type || 'Theory'})`,
          subject_name: s.subject_name,
          subject_id: s.id
        }));
        return sendSuccess(res, mapped);
      }

      // 3. Fallback to all subjects in DB
      const allSubjects = await query(`SELECT id, name as subject_name, code as subject_code, type as subject_type FROM subjects ORDER BY name ASC`);
      const mapped = allSubjects.map((s: any) => ({
        id: String(s.id),
        label: `${s.subject_name} (${s.subject_code || s.subject_type || 'Subject'})`,
        subject_name: s.subject_name,
        subject_id: s.id
      }));
      return sendSuccess(res, mapped);
    } catch (error) {
      logger.error('Error in getSubjectsForAttendance:', error);
      return sendError(res, 'Failed to fetch subjects for attendance', 500);
    }
  }

  /**
   * GET /api/attendance/period
   */
  public static async getPeriodAttendance(req: Request, res: Response) {
    try {
      const classId = req.query.class_id;
      const sectionId = req.query.section_id;
      const subjectTimetableId = req.query.subject_timetable_id;
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

      if (!classId || !sectionId) {
        return sendSuccess(res, []);
      }

      const rows = await query(`
        SELECT s.id as student_id, s.admission_no, s.roll_no, s.firstname, s.lastname, s.gender,
               c.class as class_name, sec.section as section_name,
               ss.id as student_session_id,
               ssa.id as student_subject_attendance_id, ssa.attendence_type_id, ssa.remark,
               at.type as attendance_type, at.key_value
        FROM student_session ss
        JOIN students s ON s.id = ss.student_id
        JOIN classes c ON c.id = ss.class_id
        JOIN sections sec ON sec.id = ss.section_id
        LEFT JOIN student_subject_attendances ssa ON ssa.student_session_id = ss.id 
             AND (ssa.subject_timetable_id = ? OR ? IS NULL)
             AND ssa.date = ?
        LEFT JOIN attendence_type at ON at.id = ssa.attendence_type_id
        WHERE ss.class_id = ? AND ss.section_id = ?
          AND (s.is_active = 'yes' OR s.is_active = 1)
        ORDER BY s.roll_no ASC, s.firstname ASC
      `, [subjectTimetableId || null, subjectTimetableId || null, date, classId, sectionId]);

      return sendSuccess(res, rows);
    } catch (error) {
      logger.error('Error in getPeriodAttendance:', error);
      return sendError(res, 'Failed to fetch period attendance', 500);
    }
  }

  /**
   * POST /api/attendance/period
   */
  public static async savePeriodAttendance(req: Request, res: Response) {
    try {
      const { class_id, section_id, subject_timetable_id, date, holiday, attendance } = req.body;
      const attendanceDate = date || new Date().toISOString().split('T')[0];
      const records = attendance || [];

      if (!Array.isArray(records)) {
        return sendError(res, 'attendance array is required', 400);
      }

      await transaction(async (conn) => {
        for (const item of records) {
          const studentSessionId = item.student_session_id;
          const rawTypeId = item.attendence_type_id !== undefined ? item.attendence_type_id : item.attendance_type_id;
          const attendanceTypeId = holiday ? 5 : (rawTypeId !== undefined && rawTypeId !== null ? Number(rawTypeId) : 0);
          const remark = item.remark || '';
          const ttId = subject_timetable_id || item.subject_timetable_id || 0;

          if (attendanceTypeId === 0) {
            // Unmarked student: remove existing record for that slot & date
            await conn.execute(
              `DELETE FROM student_subject_attendances WHERE student_session_id = ? AND subject_timetable_id = ? AND date = ?`,
              [studentSessionId, ttId, attendanceDate]
            );
            continue;
          }

          const existing = await queryOne(
            `SELECT id FROM student_subject_attendances WHERE student_session_id = ? AND subject_timetable_id = ? AND date = ?`,
            [studentSessionId, ttId, attendanceDate]
          );

          if (existing) {
            await conn.execute(
              `UPDATE student_subject_attendances SET attendence_type_id = ?, remark = ? WHERE id = ?`,
              [attendanceTypeId, remark, existing.id]
            );
          } else {
            await conn.execute(
              `INSERT INTO student_subject_attendances (student_session_id, subject_timetable_id, attendence_type_id, date, remark)
               VALUES (?, ?, ?, ?, ?)`,
              [studentSessionId, ttId, attendanceTypeId, attendanceDate, remark]
            );
          }
        }
      });

      return sendSuccess(res, { count: records.length, date: attendanceDate }, 'Period attendance saved successfully');
    } catch (error) {
      logger.error('Error in savePeriodAttendance:', error);
      return sendError(res, 'Failed to save period attendance', 500);
    }
  }

  /**
   * GET /api/Attendance/student_attendance or /api/Attendance/by_date or /api/attendance/by-date
   */
  public static async getStudentAttendance(req: Request, res: Response) {
    try {
      const classId = req.query.class_id;
      const sectionId = req.query.section_id;
      const sessionId = req.query.session_id;
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

      let sql = `
        SELECT s.id as student_id, s.admission_no, s.roll_no, s.firstname, s.lastname, s.gender,
               c.class as class_name, sec.section as section_name,
               ss.id as student_session_id,
               sa.id as attendance_id, sa.attendence_type_id, sa.remark,
               at.type as attendance_type, at.key_value
        FROM student_session ss
        JOIN students s ON s.id = ss.student_id
        JOIN classes c ON c.id = ss.class_id
        JOIN sections sec ON sec.id = ss.section_id
        LEFT JOIN student_attendences sa ON sa.student_session_id = ss.id AND sa.date = ?
        LEFT JOIN attendence_type at ON at.id = sa.attendence_type_id
        WHERE (s.is_active = 'yes' OR s.is_active = 1)
      `;
      const params: any[] = [date];

      if (classId && classId !== 'all') {
        sql += ` AND ss.class_id = ?`;
        params.push(classId);
      }
      if (sectionId && sectionId !== 'all') {
        sql += ` AND ss.section_id = ?`;
        params.push(sectionId);
      }
      if (sessionId && sessionId !== 'all') {
        sql += ` AND ss.session_id = ?`;
        params.push(sessionId);
      }

      sql += ` ORDER BY s.roll_no ASC, s.firstname ASC`;
      const rows = await query(sql, params);
      return sendSuccess(res, rows);
    } catch (error) {
      logger.error('Error in getStudentAttendance:', error);
      return sendError(res, 'Failed to fetch student attendance', 500);
    }
  }

  /**
   * GET /api/attendance/by-date (class-wise summary)
   */
  public static async getAttendanceByDate(req: Request, res: Response) {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const rows = await query(`
        SELECT c.id as class_id, c.class as class_name,
               sec.id as section_id, sec.section as section_name,
               COUNT(ss.id) as total_students,
               SUM(CASE WHEN at.key_value = 'present' OR sa.attendence_type_id = 1 THEN 1 ELSE 0 END) as present_count,
               SUM(CASE WHEN at.key_value = 'absent' OR sa.attendence_type_id = 4 THEN 1 ELSE 0 END) as absent_count,
               SUM(CASE WHEN at.key_value = 'late' OR sa.attendence_type_id = 2 OR sa.attendence_type_id = 3 THEN 1 ELSE 0 END) as late_count,
               SUM(CASE WHEN at.key_value = 'half_day' OR sa.attendence_type_id = 6 THEN 1 ELSE 0 END) as half_day_count
        FROM class_sections cs
        JOIN classes c ON c.id = cs.class_id
        JOIN sections sec ON sec.id = cs.section_id
        LEFT JOIN student_session ss ON ss.class_id = c.id AND ss.section_id = sec.id
        LEFT JOIN students s ON s.id = ss.student_id AND (s.is_active = 'yes' OR s.is_active = 1)
        LEFT JOIN student_attendences sa ON sa.student_session_id = ss.id AND sa.date = ?
        LEFT JOIN attendence_type at ON at.id = sa.attendence_type_id
        GROUP BY cs.id, c.id, c.class, sec.id, sec.section
        ORDER BY c.id ASC
      `, [date]);

      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch attendance by date', 500);
    }
  }

  /**
   * POST /api/Attendance or /api/Attendance/student_attendance or /api/Attendance/save
   */
  public static async saveStudentAttendance(req: Request, res: Response) {
    try {
      const { attendance_data, attendance, date, class_id, section_id, holiday } = req.body;
      const attendanceDate = date || new Date().toISOString().split('T')[0];
      const records = attendance || attendance_data || [];

      if (!Array.isArray(records)) {
        return sendError(res, 'attendance array is required', 400);
      }

      await transaction(async (conn) => {
        for (const item of records) {
          const studentSessionId = item.student_session_id;
          const rawTypeId = item.attendence_type_id !== undefined ? item.attendence_type_id : item.attendance_type_id;
          const attendanceTypeId = holiday ? 5 : (rawTypeId !== undefined && rawTypeId !== null ? Number(rawTypeId) : 0);
          const remark = item.remark || '';

          if (attendanceTypeId === 0) {
            // Unmarked student: remove existing attendance record for that date
            await conn.execute(
              `DELETE FROM student_attendences WHERE student_session_id = ? AND date = ?`,
              [studentSessionId, attendanceDate]
            );
            continue;
          }

          const existing = await queryOne(
            `SELECT id FROM student_attendences WHERE student_session_id = ? AND date = ?`,
            [studentSessionId, attendanceDate]
          );

          if (existing) {
            await conn.execute(
              `UPDATE student_attendences SET attendence_type_id = ?, remark = ?, updated_at = CURDATE() WHERE id = ?`,
              [attendanceTypeId, remark, existing.id]
            );
          } else {
            await conn.execute(
              `INSERT INTO student_attendences (student_session_id, attendence_type_id, date, remark, is_active)
               VALUES (?, ?, ?, ?, 'no')`,
              [studentSessionId, attendanceTypeId, attendanceDate, remark]
            );
          }
        }
      });

      return sendSuccess(res, { count: records.length, date: attendanceDate }, 'Attendance saved successfully');
    } catch (error) {
      logger.error('Error in saveStudentAttendance:', error);
      return sendError(res, 'Failed to save attendance', 500);
    }
  }

  /**
   * GET /api/Attendance/staff_attendance
   */
  public static async getStaffAttendance(req: Request, res: Response) {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const roleId = req.query.role_id;

      let sql = `
        SELECT s.id as staff_id, s.employee_id, s.name, s.surname, r.name as role_name,
               sa.id as attendance_id, sa.staff_attendance_type_id, sa.remark
        FROM staff s
        LEFT JOIN staff_roles sr ON sr.staff_id = s.id
        LEFT JOIN roles r ON r.id = sr.role_id
        LEFT JOIN staff_attendance sa ON sa.staff_id = s.id AND sa.date = ?
        WHERE s.is_active = 1
      `;
      const params: any[] = [date];

      if (roleId) {
        sql += ` AND (sr.role_id = ? OR s.role_id = ?)`;
        params.push(roleId, roleId);
      }

      sql += ` ORDER BY s.name ASC`;
      const rows = await query(sql, params);
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch staff attendance', 500);
    }
  }

  /**
   * GET /api/attendance/approve-leave
   */
  public static async getApproveLeaves(req: Request, res: Response) {
    try {
      const classId = req.query.class_id;
      const sectionId = req.query.section_id;

      let sql = `
        SELECT sl.id, sl.student_session_id, sl.from_date, sl.to_date, sl.apply_date, sl.status, sl.reason, sl.docs, sl.approve_by,
               s.id as student_id, s.firstname, s.lastname, s.admission_no,
               c.id as class_id, c.class, c.class as class_name,
               sec.id as section_id, sec.section, sec.section as section_name,
               CONCAT_WS(' ', stf.name, stf.surname) as approved_by_name
        FROM student_applyleave sl
        JOIN student_session ss ON ss.id = sl.student_session_id
        JOIN students s ON s.id = ss.student_id
        JOIN classes c ON c.id = ss.class_id
        JOIN sections sec ON sec.id = ss.section_id
        LEFT JOIN staff stf ON stf.id = sl.approve_by
        WHERE 1=1
      `;
      const params: any[] = [];
      if (classId && classId !== 'all') {
        sql += ` AND ss.class_id = ?`;
        params.push(classId);
      }
      if (sectionId && sectionId !== 'all') {
        sql += ` AND ss.section_id = ?`;
        params.push(sectionId);
      }
      sql += ` ORDER BY sl.id DESC`;

      const rows = await query(sql, params);
      return sendSuccess(res, rows);
    } catch (error) {
      logger.error('Error fetching approve leaves:', error);
      return sendError(res, 'Failed to fetch leave applications', 500);
    }
  }

  /**
   * POST /api/attendance/approve-leave
   */
  public static async applyLeave(req: Request, res: Response) {
    try {
      const { student_id, student_session_id, from_date, to_date, apply_date, reason, message, documents, docs } = req.body;
      let targetSessionId = student_session_id;

      if (!targetSessionId && student_id) {
        const stdSession = await queryOne(`SELECT id FROM student_session WHERE student_id = ? ORDER BY id DESC LIMIT 1`, [student_id]);
        targetSessionId = stdSession?.id;
      }

      if (!targetSessionId) {
        return sendError(res, 'Student session ID required', 400);
      }

      const result = await execute(`
        INSERT INTO student_applyleave (student_session_id, apply_date, from_date, to_date, reason, docs, status)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `, [targetSessionId, apply_date || new Date().toISOString().split('T')[0], from_date, to_date, reason || message || '', docs || documents || null]);

      return sendSuccess(res, { id: result.insertId }, 'Leave application submitted successfully', 201);
    } catch (error) {
      logger.error('Error applying leave:', error);
      return sendError(res, 'Failed to submit leave application', 500);
    }
  }

  /**
   * PUT /api/attendance/approve-leave
   */
  public static async updateLeave(req: Request, res: Response) {
    try {
      const { id, from_date, to_date, apply_date, reason, message, docs, documents } = req.body;
      if (!id) return sendError(res, 'Leave ID required', 400);

      await execute(`
        UPDATE student_applyleave 
        SET from_date = COALESCE(?, from_date),
            to_date = COALESCE(?, to_date),
            apply_date = COALESCE(?, apply_date),
            reason = COALESCE(?, reason),
            docs = COALESCE(?, docs)
        WHERE id = ?
      `, [from_date || null, to_date || null, apply_date || null, reason || message || null, docs || documents || null, id]);

      return sendSuccess(res, { id }, 'Leave application updated successfully');
    } catch (error) {
      logger.error('Error updating leave:', error);
      return sendError(res, 'Failed to update leave application', 500);
    }
  }

  /**
   * DELETE /api/attendance/approve-leave
   */
  public static async deleteLeave(req: Request, res: Response) {
    try {
      const id = req.body?.id || req.query.id;
      if (!id) return sendError(res, 'Leave ID required', 400);

      await execute(`DELETE FROM student_applyleave WHERE id = ?`, [id]);
      return sendSuccess(res, { id }, 'Leave application deleted successfully');
    } catch (error) {
      logger.error('Error deleting leave:', error);
      return sendError(res, 'Failed to delete leave application', 500);
    }
  }

  /**
   * POST /api/attendance/approve-leave/status
   */
  public static async updateLeaveStatus(req: Request, res: Response) {
    try {
      const { id, status, approve_by } = req.body;
      if (!id) return sendError(res, 'Leave ID required', 400);

      await execute(`
        UPDATE student_applyleave
        SET status = ?, approve_by = ?
        WHERE id = ?
      `, [status !== undefined ? Number(status) : 1, approve_by || 1, id]);

      return sendSuccess(res, { id, status }, 'Leave status updated successfully');
    } catch (error) {
      logger.error('Error updating leave status:', error);
      return sendError(res, 'Failed to update leave status', 500);
    }
  }

  /**
   * Fallback router.all('/approve_leave')
   */
  public static async approveLeave(req: Request, res: Response) {
    if (req.method === 'GET') return AttendanceController.getApproveLeaves(req, res);
    if (req.method === 'POST') return AttendanceController.applyLeave(req, res);
    if (req.method === 'PUT') return AttendanceController.updateLeave(req, res);
    if (req.method === 'DELETE') return AttendanceController.deleteLeave(req, res);
    return sendError(res, 'Method not allowed', 405);
  }

  /**
   * GET /api/attendance/by-student/:studentId or /api/attendance/by-student
   */
  public static async getByStudent(req: Request, res: Response) {
    try {
      const studentId = req.params.studentId || req.query.student_id || req.query.studentId;
      if (!studentId) {
        return sendSuccess(res, { records: [], summary: { total_days: 0, present: 0, absent: 0, late: 0, half_day: 0, holiday: 0 } });
      }

      const records = await query(`
        SELECT sa.*, at.type as attendance_type, at.key_value
        FROM student_attendences sa
        JOIN student_session ss ON ss.id = sa.student_session_id
        LEFT JOIN attendence_type at ON at.id = sa.attendence_type_id
        WHERE ss.student_id = ? OR sa.student_session_id = ?
        ORDER BY sa.date DESC
      `, [studentId, studentId]);

      const summary = {
        total_days: records.length,
        present: records.filter((r: any) => r.key_value === 'present' || r.attendence_type_id === 1).length,
        absent: records.filter((r: any) => r.key_value === 'absent' || r.attendence_type_id === 4).length,
        late: records.filter((r: any) => r.key_value === 'late' || r.attendence_type_id === 2 || r.attendence_type_id === 3).length,
        half_day: records.filter((r: any) => r.key_value === 'half_day' || r.attendence_type_id === 6).length,
        holiday: records.filter((r: any) => r.key_value === 'holiday' || r.attendence_type_id === 5).length,
      };

      return sendSuccess(res, { records, summary, data: records });
    } catch (error) {
      logger.error('Error in getByStudent attendance:', error);
      return sendError(res, 'Failed to fetch student attendance report', 500);
    }
  }
}
