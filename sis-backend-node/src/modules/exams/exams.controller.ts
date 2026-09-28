import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { query, queryOne, execute, transaction } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export function formatToMySQLDate(dateInput: any): string | null {
  if (!dateInput) return null;
  const str = String(dateInput).trim();
  if (!str) return null;

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // YYYY-MM-DDTHH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    return str.split('T')[0];
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ddmmyyyyMatch) {
    const day = ddmmyyyyMatch[1].padStart(2, '0');
    const month = ddmmyyyyMatch[2].padStart(2, '0');
    const year = ddmmyyyyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Try parsing Date
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

export function formatToMySQLTime(timeInput: any): string {
  if (!timeInput) return '09:00:00';
  const str = String(timeInput).trim();
  if (!str) return '09:00:00';

  // 12-hour AM/PM format (e.g. "09:00 AM", "02:30 PM", "9:00am", "12:00 PM")
  const ampmMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2];
    const seconds = ampmMatch[3] || '00';
    const modifier = ampmMatch[4].toUpperCase();

    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`;
  }

  // 24-hour format (e.g. "14:30", "09:00:00")
  const hhmmMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hhmmMatch) {
    const hours = String(parseInt(hhmmMatch[1], 10)).padStart(2, '0');
    const minutes = hhmmMatch[2];
    const seconds = hhmmMatch[3] || '00';
    return `${hours}:${minutes}:${seconds}`;
  }

  return '09:00:00';
}

export class ExamsController {
  // ==========================================
  // 1. EXAM GROUPS
  // ==========================================

  /**
   * GET /api/Exams/groups or /api/Exams/exam_group
   */
  public static async groups(req: Request, res: Response) {
    try {
      const rows = await query(`
        SELECT eg.*, 
               (SELECT COUNT(*) FROM exam_group_class_batch_exams ecb WHERE ecb.exam_group_id = eg.id) as total_exams
        FROM exam_groups eg
        ORDER BY eg.id DESC
      `);
      return sendSuccess(res, rows);
    } catch (error) {
      logger.error('Error in exam groups:', error);
      return sendError(res, 'Failed to fetch exam groups', 500);
    }
  }

  /**
   * POST /api/exams/groups
   */
  public static async createGroup(req: Request, res: Response) {
    try {
      const { name, exam_type, description, is_active } = req.body;
      if (!name) return sendError(res, 'Exam group name is required', 400);

      const result = await execute(`
        INSERT INTO exam_groups (name, exam_type, description, is_active)
        VALUES (?, ?, ?, ?)
      `, [name, exam_type || 'general', description || '', is_active !== undefined ? is_active : 1]);

      return sendSuccess(res, { id: result.insertId, name, exam_type }, 'Exam group created successfully', 201);
    } catch (error) {
      logger.error('Error creating exam group:', error);
      return sendError(res, 'Failed to create exam group', 500);
    }
  }

  /**
   * PUT /api/exams/groups/:id
   */
  public static async updateGroup(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const { name, exam_type, description, is_active } = req.body;
      if (!id) return sendError(res, 'Exam group ID required', 400);

      await execute(`
        UPDATE exam_groups
        SET name = COALESCE(?, name),
            exam_type = COALESCE(?, exam_type),
            description = COALESCE(?, description),
            is_active = COALESCE(?, is_active),
            updated_at = CURDATE()
        WHERE id = ?
      `, [name || null, exam_type || null, description || null, is_active !== undefined ? is_active : null, id]);

      return sendSuccess(res, { id }, 'Exam group updated successfully');
    } catch (error) {
      logger.error('Error updating exam group:', error);
      return sendError(res, 'Failed to update exam group', 500);
    }
  }

  /**
   * DELETE /api/exams/groups/:id
   */
  public static async deleteGroup(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return sendError(res, 'Exam group ID required', 400);

      await execute(`DELETE FROM exam_groups WHERE id = ?`, [id]);
      return sendSuccess(res, { id }, 'Exam group deleted successfully');
    } catch (error) {
      logger.error('Error deleting exam group:', error);
      return sendError(res, 'Failed to delete exam group', 500);
    }
  }

  // ==========================================
  // 2. GROUP EXAMS (EXAMS IN GROUP)
  // ==========================================

  /**
   * GET /api/exams/list
   */
  public static async listExams(req: Request, res: Response) {
    try {
      const examGroupId = req.query.exam_group_id || req.query.examGroupId;
      let sql = `
        SELECT e.*, e.exam as name, e.exam as exam_name, s.session as session_name,
               (SELECT COUNT(*) FROM exam_group_class_batch_exam_subjects WHERE exam_group_class_batch_exams_id = e.id) as total_subjects,
               (SELECT COUNT(*) FROM exam_group_class_batch_exam_students WHERE exam_group_class_batch_exam_id = e.id) as total_students
        FROM exam_group_class_batch_exams e
        LEFT JOIN sessions s ON s.id = e.session_id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (examGroupId) {
        sql += ` AND e.exam_group_id = ?`;
        params.push(examGroupId);
      }
      sql += ` ORDER BY e.id DESC`;

      const rows = await query(sql, params);
      return sendSuccess(res, rows);
    } catch (error) {
      logger.error('Error in listExams:', error);
      return sendError(res, 'Failed to fetch exams list', 500);
    }
  }

  /**
   * POST /api/exams/save
   */
  public static async saveExam(req: Request, res: Response) {
    try {
      const { exam, exam_group_id, session_id, date_from, date_to, description, is_publish, is_active } = req.body;
      if (!exam || !exam_group_id) {
        return sendError(res, 'Exam name and Exam group ID are required', 400);
      }

      let resolvedSessionId = 21;
      if (session_id) {
        if (typeof session_id === 'number' && !isNaN(session_id)) {
          resolvedSessionId = session_id;
        } else if (typeof session_id === 'string' && /^\d+$/.test(session_id)) {
          resolvedSessionId = parseInt(session_id, 10);
        } else {
          try {
            const sessRow = await queryOne(`SELECT id FROM sessions WHERE session = ? OR is_active = 'yes' LIMIT 1`, [session_id]);
            if (sessRow && sessRow.id) {
              resolvedSessionId = sessRow.id;
            }
          } catch (e) {}
        }
      }

      const cleanDateFrom = formatToMySQLDate(date_from);
      const cleanDateTo = formatToMySQLDate(date_to);

      const result = await execute(`
        INSERT INTO exam_group_class_batch_exams (exam, exam_group_id, session_id, date_from, date_to, description, is_publish, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [exam, Number(exam_group_id), resolvedSessionId, cleanDateFrom, cleanDateTo, description || '', is_publish ? 1 : 0, is_active !== undefined ? (is_active ? 1 : 0) : 1]);

      return sendSuccess(res, { id: result.insertId, exam, exam_group_id }, 'Exam created successfully', 201);
    } catch (error) {
      logger.error('Error creating exam:', error);
      return sendError(res, 'Failed to save exam', 500);
    }
  }

  /**
   * PUT /api/exams/detail/:id or PUT /api/exams/save/:id
   */
  public static async updateExam(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const { exam, exam_group_id, session_id, date_from, date_to, description, is_publish, is_active } = req.body;
      if (!id) return sendError(res, 'Exam ID is required', 400);

      let resolvedSessionId: number | null = null;
      if (session_id !== undefined && session_id !== null) {
        if (typeof session_id === 'number' && !isNaN(session_id)) {
          resolvedSessionId = session_id;
        } else if (typeof session_id === 'string' && /^\d+$/.test(session_id)) {
          resolvedSessionId = parseInt(session_id, 10);
        } else {
          try {
            const sessRow = await queryOne(`SELECT id FROM sessions WHERE session = ? OR is_active = 'yes' LIMIT 1`, [session_id]);
            if (sessRow && sessRow.id) {
              resolvedSessionId = sessRow.id;
            }
          } catch (e) {}
        }
      }

      const cleanDateFrom = formatToMySQLDate(date_from);
      const cleanDateTo = formatToMySQLDate(date_to);

      await execute(`
        UPDATE exam_group_class_batch_exams
        SET exam = COALESCE(?, exam),
            exam_group_id = COALESCE(?, exam_group_id),
            session_id = COALESCE(?, session_id),
            date_from = COALESCE(?, date_from),
            date_to = COALESCE(?, date_to),
            description = COALESCE(?, description),
            is_publish = COALESCE(?, is_publish),
            is_active = COALESCE(?, is_active),
            updated_at = CURDATE()
        WHERE id = ?
      `, [
        exam || null,
        exam_group_id ? Number(exam_group_id) : null,
        resolvedSessionId,
        cleanDateFrom,
        cleanDateTo,
        description || null,
        is_publish !== undefined ? (is_publish ? 1 : 0) : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id
      ]);

      return sendSuccess(res, { id }, 'Exam updated successfully');
    } catch (error) {
      logger.error('Error updating exam:', error);
      return sendError(res, 'Failed to update exam', 500);
    }
  }

  /**
   * DELETE /api/exams/detail/:id
   */
  public static async deleteExam(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return sendError(res, 'Exam ID is required', 400);

      await execute(`DELETE FROM exam_group_class_batch_exams WHERE id = ?`, [id]);
      return sendSuccess(res, { id }, 'Exam deleted successfully');
    } catch (error) {
      logger.error('Error deleting exam:', error);
      return sendError(res, 'Failed to delete exam', 500);
    }
  }

  /**
   * POST /api/exams/publish
   */
  public static async publishExam(req: Request, res: Response) {
    try {
      const { exam_id, is_publish, is_active } = req.body;
      if (!exam_id) return sendError(res, 'Exam ID is required', 400);

      await execute(`
        UPDATE exam_group_class_batch_exams
        SET is_publish = COALESCE(?, is_publish),
            is_active = COALESCE(?, is_active),
            updated_at = CURDATE()
        WHERE id = ?
      `, [is_publish !== undefined ? (is_publish ? 1 : 0) : null, is_active !== undefined ? (is_active ? 1 : 0) : null, exam_id]);

      return sendSuccess(res, { exam_id, is_publish, is_active }, 'Exam status updated successfully');
    } catch (error) {
      logger.error('Error publishing exam:', error);
      return sendError(res, 'Failed to update publish status', 500);
    }
  }

  // ==========================================
  // 3. EXAM SUBJECTS
  // ==========================================

  /**
   * GET /api/exams/subjects/:examId
   */
  public static async getExamSubjects(req: Request, res: Response) {
    try {
      const examId = req.params.examId || req.query.exam_id;
      if (!examId) return sendSuccess(res, []);

      const rows = await query(`
        SELECT es.*, s.name as subject_name, s.code as subject_code, s.type as subject_type
        FROM exam_group_class_batch_exam_subjects es
        JOIN subjects s ON s.id = es.subject_id
        WHERE es.exam_group_class_batch_exams_id = ?
        ORDER BY es.date_from ASC, es.id ASC
      `, [examId]);

      return sendSuccess(res, rows);
    } catch (error) {
      logger.error('Error in getExamSubjects:', error);
      return sendError(res, 'Failed to fetch exam subjects', 500);
    }
  }

  /**
   * POST /api/exams/subjects
   */
  public static async saveExamSubjects(req: Request, res: Response) {
    try {
      const { exam_id, subjects } = req.body;
      if (!exam_id || !Array.isArray(subjects)) {
        return sendError(res, 'exam_id and subjects array required', 400);
      }

      await transaction(async (conn) => {
        for (const sub of subjects) {
          const subjectId = sub.subject_id;
          const cleanDateFrom = formatToMySQLDate(sub.date_from) || new Date().toISOString().split('T')[0];
          const cleanTimeFrom = formatToMySQLTime(sub.time_from);
          const duration = sub.duration || '02:00';
          const roomNo = sub.room_no || '';
          const roomCapacity = Number(sub.room_capacity) || 30;
          const maxMarks = sub.max_marks || 100;
          const minMarks = sub.min_marks || 35;
          const creditHours = sub.credit_hours || 1;

          if (sub.id) {
            await conn.execute(`
              UPDATE exam_group_class_batch_exam_subjects
              SET subject_id = ?, date_from = ?, time_from = ?, duration = ?, room_no = ?, room_capacity = ?, max_marks = ?, min_marks = ?, credit_hours = ?, updated_at = CURDATE()
              WHERE id = ?
            `, [subjectId, cleanDateFrom, cleanTimeFrom, duration, roomNo, roomCapacity, maxMarks, minMarks, creditHours, sub.id]);
          } else {
            await conn.execute(`
              INSERT INTO exam_group_class_batch_exam_subjects (exam_group_class_batch_exams_id, subject_id, date_from, time_from, duration, room_no, room_capacity, max_marks, min_marks, credit_hours, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [exam_id, subjectId, cleanDateFrom, cleanTimeFrom, duration, roomNo, roomCapacity, maxMarks, minMarks, creditHours]);
          }
        }
      });

      return sendSuccess(res, { count: subjects.length }, 'Exam subjects saved successfully');
    } catch (error) {
      logger.error('Error saving exam subjects:', error);
      return sendError(res, 'Failed to save exam subjects', 500);
    }
  }

  /**
   * DELETE /api/exams/subjects/:id
   */
  public static async deleteExamSubject(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return sendError(res, 'Subject ID required', 400);

      await execute(`DELETE FROM exam_group_class_batch_exam_subjects WHERE id = ?`, [id]);
      return sendSuccess(res, { id }, 'Exam subject deleted successfully');
    } catch (error) {
      logger.error('Error deleting exam subject:', error);
      return sendError(res, 'Failed to delete exam subject', 500);
    }
  }

  // ==========================================
  // 4. EXAM STUDENTS ASSIGNMENT
  // ==========================================

  /**
   * GET /api/exams/students
   */
  public static async getExamStudents(req: Request, res: Response) {
    try {
      const examId = req.query.exam_id;
      const classId = req.query.class_id;
      const sectionId = req.query.section_id;

      if (!examId) return sendError(res, 'exam_id required', 400);

      // If class/section is specified, list all students with assignment status
      if (classId) {
        let sql = `
          SELECT s.id as student_id, s.admission_no, s.roll_no, s.firstname, s.lastname, s.gender,
                 c.class as class_name, sec.section as section_name,
                 ss.id as student_session_id,
                 es.id as exam_student_id, es.roll_no as exam_roll_no, es.room_no, es.seat_no,
                 CASE WHEN es.id IS NOT NULL THEN 1 ELSE 0 END as assigned
          FROM student_session ss
          JOIN students s ON s.id = ss.student_id
          JOIN classes c ON c.id = ss.class_id
          JOIN sections sec ON sec.id = ss.section_id
          LEFT JOIN exam_group_class_batch_exam_students es ON es.student_session_id = ss.id AND es.exam_group_class_batch_exam_id = ?
          WHERE ss.class_id = ?
        `;
        const params: any[] = [examId, classId];
        if (sectionId) {
          sql += ` AND ss.section_id = ?`;
          params.push(sectionId);
        }
        sql += ` AND (s.is_active = 'yes' OR s.is_active = 1) ORDER BY s.roll_no ASC, s.firstname ASC`;
        const rows = await query(sql, params);
        return sendSuccess(res, rows);
      }

      // Otherwise list all assigned students
      const rows = await query(`
        SELECT es.id as exam_student_id, es.roll_no as exam_roll_no, es.room_no, es.seat_no,
               s.id as student_id, s.admission_no, s.roll_no, s.firstname, s.lastname, s.gender,
               c.class as class_name, sec.section as section_name,
               ss.id as student_session_id
        FROM exam_group_class_batch_exam_students es
        JOIN student_session ss ON ss.id = es.student_session_id
        JOIN students s ON s.id = ss.student_id
        JOIN classes c ON c.id = ss.class_id
        JOIN sections sec ON sec.id = ss.section_id
        WHERE es.exam_group_class_batch_exam_id = ?
        ORDER BY es.roll_no ASC, s.roll_no ASC, s.firstname ASC
      `, [examId]);

      return sendSuccess(res, rows);
    } catch (error) {
      logger.error('Error fetching exam students:', error);
      return sendError(res, 'Failed to fetch exam students', 500);
    }
  }

  /**
   * POST /api/exams/students/assign-class
   */
  public static async assignClassStudents(req: Request, res: Response) {
    try {
      const { exam_id, class_id, section_id, action = 'assign' } = req.body;
      if (!exam_id || !class_id) {
        return sendError(res, 'exam_id and class_id are required', 400);
      }

      let sql = `
        SELECT ss.id as student_session_id, ss.student_id, s.roll_no
        FROM student_session ss
        JOIN students s ON s.id = ss.student_id
        WHERE ss.class_id = ? AND (s.is_active = 'yes' OR s.is_active = 1)
      `;
      const params: any[] = [class_id];
      if (section_id) {
        sql += ` AND ss.section_id = ?`;
        params.push(section_id);
      }

      const students = await query(sql, params);

      if (action === 'unassign') {
        let delSql = `
          DELETE est FROM exam_group_class_batch_exam_students est
          JOIN student_session ss ON ss.id = est.student_session_id
          WHERE est.exam_group_class_batch_exam_id = ? AND ss.class_id = ?
        `;
        const delParams: any[] = [exam_id, class_id];
        if (section_id) {
          delSql += ` AND ss.section_id = ?`;
          delParams.push(section_id);
        }
        await execute(delSql, delParams);
        return sendSuccess(res, { count: students.length }, 'Class students unassigned from exam successfully');
      }

      let assignedCount = 0;
      await transaction(async (conn) => {
        for (const st of students) {
          const existing = await queryOne(
            `SELECT id FROM exam_group_class_batch_exam_students WHERE exam_group_class_batch_exam_id = ? AND student_session_id = ?`,
            [exam_id, st.student_session_id]
          );
          if (!existing) {
            const cleanRoll = (typeof st.roll_no === 'number' && !isNaN(st.roll_no)) ? st.roll_no : (parseInt(String(st.roll_no).replace(/\D/g, ''), 10) || 0);
            await conn.execute(`
              INSERT INTO exam_group_class_batch_exam_students (exam_group_class_batch_exam_id, student_id, student_session_id, roll_no, is_active)
              VALUES (?, ?, ?, ?, 1)
            `, [exam_id, st.student_id, st.student_session_id, cleanRoll]);
            assignedCount++;
          }
        }
      });

      return sendSuccess(res, { total_in_class: students.length, newly_assigned: assignedCount }, 'Class students assigned to exam successfully');
    } catch (error) {
      logger.error('Error assigning class students to exam:', error);
      return sendError(res, 'Failed to assign class students', 500);
    }
  }

  /**
   * POST /api/exams/students
   */
  public static async saveExamStudents(req: Request, res: Response) {
    try {
      const { exam_id, student_session_ids } = req.body;
      if (!exam_id || !Array.isArray(student_session_ids)) {
        return sendError(res, 'exam_id and student_session_ids array required', 400);
      }

      await transaction(async (conn) => {
        for (const sessionId of student_session_ids) {
          const std = await queryOne(`
            SELECT ss.student_id, s.roll_no 
            FROM student_session ss 
            JOIN students s ON s.id = ss.student_id 
            WHERE ss.id = ?
          `, [sessionId]);
          const studentId = std ? std.student_id : 0;
          const rollNo = std ? std.roll_no : '-';

          const existing = await queryOne(
            `SELECT id FROM exam_group_class_batch_exam_students WHERE exam_group_class_batch_exam_id = ? AND student_session_id = ?`,
            [exam_id, sessionId]
          );

          if (!existing) {
            const cleanRoll = (typeof rollNo === 'number' && !isNaN(rollNo)) ? rollNo : (parseInt(String(rollNo).replace(/\D/g, ''), 10) || 0);
            await conn.execute(`
              INSERT INTO exam_group_class_batch_exam_students (exam_group_class_batch_exam_id, student_id, student_session_id, roll_no, is_active)
              VALUES (?, ?, ?, ?, 1)
            `, [exam_id, studentId, sessionId, cleanRoll]);
          }
        }
      });

      return sendSuccess(res, { count: student_session_ids.length }, 'Students assigned to exam successfully');
    } catch (error) {
      logger.error('Error assigning students:', error);
      return sendError(res, 'Failed to assign students to exam', 500);
    }
  }

  /**
   * DELETE /api/exams/students
   */
  public static async deleteExamStudent(req: Request, res: Response) {
    try {
      const { exam_id, student_session_id } = req.body;
      if (!exam_id || !student_session_id) {
        return sendError(res, 'exam_id and student_session_id required', 400);
      }

      await execute(`
        DELETE FROM exam_group_class_batch_exam_students
        WHERE exam_group_class_batch_exam_id = ? AND student_session_id = ?
      `, [exam_id, student_session_id]);

      return sendSuccess(res, { exam_id, student_session_id }, 'Student removed from exam');
    } catch (error) {
      logger.error('Error removing student from exam:', error);
      return sendError(res, 'Failed to remove student from exam', 500);
    }
  }

  // ==========================================
  // 5. EXAM SCHEDULES & MARKS
  // ==========================================

  /**
   * GET /api/Exams/schedules or /api/Exams/schedule
   */
  public static async schedules(req: Request, res: Response) {
    try {
      const examGroupId = req.query.exam_group_id;
      const examId = req.query.exam_id;

      let sql = `
        SELECT es.*, s.name as subject_name, s.code as subject_code, s.type as subject_type,
               e.exam as exam_name, e.exam_group_id
        FROM exam_group_class_batch_exam_subjects es
        JOIN exam_group_class_batch_exams e ON e.id = es.exam_group_class_batch_exams_id
        JOIN subjects s ON s.id = es.subject_id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (examId) {
        sql += ` AND es.exam_group_class_batch_exams_id = ?`;
        params.push(examId);
      }
      if (examGroupId) {
        sql += ` AND e.exam_group_id = ?`;
        params.push(examGroupId);
      }
      sql += ` ORDER BY es.date_from ASC, es.id ASC`;

      const rows = await query(sql, params);
      return sendSuccess(res, rows);
    } catch (error) {
      logger.error('Error in exam schedules:', error);
      return sendError(res, 'Failed to fetch exam schedules', 500);
    }
  }

  /**
   * POST /api/exams/schedules
   */
  public static async createSchedule(req: Request, res: Response) {
    try {
      const { exam_id, subject_id, date_from, time_from, duration, room_no, room_capacity, max_marks, min_marks, credit_hours } = req.body;
      const targetExamId = exam_id || req.body.exam_group_class_batch_exams_id;
      if (!targetExamId || !subject_id) {
        return sendError(res, 'exam_id and subject_id required', 400);
      }

      const cleanDateFrom = formatToMySQLDate(date_from) || new Date().toISOString().split('T')[0];
      const cleanTimeFrom = formatToMySQLTime(time_from);
      const cleanRoomCapacity = Number(room_capacity) || 30;

      const result = await execute(`
        INSERT INTO exam_group_class_batch_exam_subjects (exam_group_class_batch_exams_id, subject_id, date_from, time_from, duration, room_no, room_capacity, max_marks, min_marks, credit_hours, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, [targetExamId, subject_id, cleanDateFrom, cleanTimeFrom, duration || '02:00', room_no || '', cleanRoomCapacity, max_marks || 100, min_marks || 35, credit_hours || 0]);

      return sendSuccess(res, { id: result.insertId }, 'Exam schedule created successfully', 201);
    } catch (error) {
      logger.error('Error creating schedule:', error);
      return sendError(res, 'Failed to create exam schedule', 500);
    }
  }

  /**
   * DELETE /api/exams/schedules/:id
   */
  public static async deleteSchedule(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return sendError(res, 'Schedule ID required', 400);

      await execute(`DELETE FROM exam_group_class_batch_exam_subjects WHERE id = ?`, [id]);
      return sendSuccess(res, { id }, 'Exam schedule deleted successfully');
    } catch (error) {
      logger.error('Error deleting schedule:', error);
      return sendError(res, 'Failed to delete exam schedule', 500);
    }
  }

  /**
   * GET / POST /api/Exams/marks
   */
  public static async marks(req: Request, res: Response) {
    const method = req.method;

    try {
      if (method === 'GET') {
        let examScheduleId: any = req.query.exam_schedule_id || req.query.subject_id;
        let examId: any = req.query.exam_id;
        let classId: any = req.query.class_id;
        let sectionId: any = req.query.section_id;

        // If exam_schedule_id was passed as a nested object by axios
        if (examScheduleId && typeof examScheduleId === 'object') {
          if (examScheduleId.exam_id) examId = examScheduleId.exam_id;
          if (examScheduleId.class_id) classId = examScheduleId.class_id;
          if (examScheduleId.section_id) sectionId = examScheduleId.section_id;
          examScheduleId = examScheduleId.exam_schedule_id || examScheduleId.subject_id;
        }

        // Always resolve resolvedScheduleId precisely for this exam:
        let resolvedScheduleId: any = null;
        if (examId) {
          if (examScheduleId) {
            // Check if it's already a schedule.id for this exam
            const schRow = await queryOne(`SELECT id FROM exam_group_class_batch_exam_subjects WHERE id = ? AND exam_group_class_batch_exams_id = ? LIMIT 1`, [examScheduleId, examId]);
            if (schRow) {
              resolvedScheduleId = schRow.id;
            } else {
              // Check if it's a subject_id for this exam
              const schBySub = await queryOne(`SELECT id FROM exam_group_class_batch_exam_subjects WHERE subject_id = ? AND exam_group_class_batch_exams_id = ? LIMIT 1`, [examScheduleId, examId]);
              if (schBySub) resolvedScheduleId = schBySub.id;
            }
          }
          if (!resolvedScheduleId && req.query.subject_id) {
            const schBySub = await queryOne(`SELECT id FROM exam_group_class_batch_exam_subjects WHERE subject_id = ? AND exam_group_class_batch_exams_id = ? LIMIT 1`, [req.query.subject_id, examId]);
            if (schBySub) resolvedScheduleId = schBySub.id;
          }
        } else if (examScheduleId) {
          const schRow = await queryOne(`SELECT id, exam_group_class_batch_exams_id FROM exam_group_class_batch_exam_subjects WHERE id = ? LIMIT 1`, [examScheduleId]);
          if (schRow) {
            resolvedScheduleId = schRow.id;
            if (!examId) examId = schRow.exam_group_class_batch_exams_id;
          }
        }

        // Check if this exam has students enrolled in exam_group_class_batch_exam_students
        let hasEnrolled = false;
        if (examId) {
          const countRow = await queryOne(`SELECT COUNT(*) as c FROM exam_group_class_batch_exam_students WHERE exam_group_class_batch_exam_id = ?`, [examId]);
          if (countRow && countRow.c > 0) hasEnrolled = true;
        }

        let sql = '';
        const params: any[] = [];

        if (hasEnrolled && examId) {
          sql = `
            SELECT es.id as exam_student_id, es.student_session_id, es.student_id, COALESCE(es.roll_no, s.roll_no, '-') as roll_no,
                   s.admission_no, s.firstname, s.lastname, s.father_name, s.gender,
                   er.id as result_id, er.get_marks as marks_obtained, er.attendence as attendance, er.note
            FROM exam_group_class_batch_exam_students es
            JOIN student_session ss ON ss.id = es.student_session_id
            JOIN students s ON s.id = ss.student_id
            LEFT JOIN exam_group_exam_results er ON er.exam_group_class_batch_exam_student_id = es.id
                 ${resolvedScheduleId ? 'AND er.exam_group_class_batch_exam_subject_id = ?' : ''}
            WHERE es.exam_group_class_batch_exam_id = ?
          `;
          if (resolvedScheduleId) params.push(resolvedScheduleId);
          params.push(examId);

          if (classId) {
            sql += ` AND ss.class_id = ?`;
            params.push(classId);
          }
          if (sectionId) {
            sql += ` AND ss.section_id = ?`;
            params.push(sectionId);
          }
        } else {
          // If not yet enrolled, fetch all active students in class or session
          sql = `
            SELECT 0 as exam_student_id, ss.id as student_session_id, s.id as student_id, COALESCE(ss.roll_no, s.roll_no, '-') as roll_no,
                   s.admission_no, s.firstname, s.lastname, s.father_name, s.gender,
                   er.id as result_id, er.get_marks as marks_obtained, COALESCE(er.attendence, 'present') as attendance, er.note
            FROM student_session ss
            JOIN students s ON s.id = ss.student_id
            LEFT JOIN exam_group_class_batch_exam_students es ON es.student_session_id = ss.id ${examId ? 'AND es.exam_group_class_batch_exam_id = ?' : ''}
            LEFT JOIN exam_group_exam_results er ON er.exam_group_class_batch_exam_student_id = es.id
                 ${resolvedScheduleId ? 'AND er.exam_group_class_batch_exam_subject_id = ?' : ''}
            WHERE (s.is_active = 'yes' OR s.is_active = 1)
          `;
          if (examId) params.push(examId);
          if (resolvedScheduleId) params.push(resolvedScheduleId);

          if (classId) {
            sql += ` AND ss.class_id = ?`;
            params.push(classId);
          }
          if (sectionId) {
            sql += ` AND ss.section_id = ?`;
            params.push(sectionId);
          }
        }

        sql += ` ORDER BY s.roll_no ASC, s.firstname ASC`;
        const rows = await query(sql, params);
        return sendSuccess(res, rows);
      }

      if (method === 'POST') {
        const { marks, marks_data, exam_schedule_id, exam_id, subject_id } = req.body;
        const records = marks || marks_data || [];

        if (!Array.isArray(records)) {
          return sendError(res, 'marks array required', 400);
        }

        let targetExamId = exam_id;
        let baseScheduleId = exam_schedule_id;

        // If exam_id is missing, find it from schedule
        if (!targetExamId && baseScheduleId) {
          const schRow = await queryOne(`SELECT exam_group_class_batch_exams_id FROM exam_group_class_batch_exam_subjects WHERE id = ? LIMIT 1`, [baseScheduleId]);
          if (schRow) targetExamId = schRow.exam_group_class_batch_exams_id;
        }

        // Resolve scheduleId precisely for targetExamId
        let resolvedScheduleId: any = null;
        if (targetExamId) {
          if (baseScheduleId) {
            const schRow = await queryOne(`SELECT id FROM exam_group_class_batch_exam_subjects WHERE id = ? AND exam_group_class_batch_exams_id = ? LIMIT 1`, [baseScheduleId, targetExamId]);
            if (schRow) {
              resolvedScheduleId = schRow.id;
            } else {
              const schBySub = await queryOne(`SELECT id FROM exam_group_class_batch_exam_subjects WHERE subject_id = ? AND exam_group_class_batch_exams_id = ? LIMIT 1`, [baseScheduleId, targetExamId]);
              if (schBySub) resolvedScheduleId = schBySub.id;
            }
          }
          if (!resolvedScheduleId && subject_id) {
            const schBySub = await queryOne(`SELECT id FROM exam_group_class_batch_exam_subjects WHERE (id = ? OR subject_id = ?) AND exam_group_class_batch_exams_id = ? LIMIT 1`, [subject_id, subject_id, targetExamId]);
            if (schBySub) resolvedScheduleId = schBySub.id;
          }
        } else if (baseScheduleId) {
          const schRow = await queryOne(`SELECT id, exam_group_class_batch_exams_id FROM exam_group_class_batch_exam_subjects WHERE id = ? LIMIT 1`, [baseScheduleId]);
          if (schRow) {
            resolvedScheduleId = schRow.id;
            targetExamId = schRow.exam_group_class_batch_exams_id;
          }
        }

        await transaction(async (conn) => {
          for (const item of records) {
            const studentSessionId = item.student_session_id || item.student_id;
            const marksObtained = item.marks_obtained !== '' && item.marks_obtained !== null && item.marks_obtained !== undefined ? Number(item.marks_obtained) : null;
            const attendance = item.attendance || 'present';
            const note = item.note || '';
            let scheduleId = resolvedScheduleId || item.exam_schedule_id || item.exam_group_class_batch_exam_subject_id || item.subject_id;

            // Resolve scheduleId if needed per item
            if (scheduleId && targetExamId && !resolvedScheduleId) {
              const schCheck = await queryOne(`SELECT id FROM exam_group_class_batch_exam_subjects WHERE id = ? AND exam_group_class_batch_exams_id = ? LIMIT 1`, [scheduleId, targetExamId]);
              if (schCheck) {
                scheduleId = schCheck.id;
              } else {
                const schBySub = await queryOne(`SELECT id FROM exam_group_class_batch_exam_subjects WHERE subject_id = ? AND exam_group_class_batch_exams_id = ? LIMIT 1`, [scheduleId, targetExamId]);
                if (schBySub) scheduleId = schBySub.id;
              }
            }

            if (!scheduleId) continue;

            // Find or Auto-Enroll exam_student record
            let examStudent = await queryOne(`
              SELECT id FROM exam_group_class_batch_exam_students 
              WHERE (student_session_id = ? OR student_id = ?)
                ${targetExamId ? 'AND exam_group_class_batch_exam_id = ?' : ''}
              LIMIT 1
            `, targetExamId ? [studentSessionId, studentSessionId, targetExamId] : [studentSessionId, studentSessionId]);

            let examStudentId: number;
            if (!examStudent) {
              // Auto-enroll student into exam_group_class_batch_exam_students
              let realStudentId = studentSessionId;
              let realSessionId = studentSessionId;
              let rollNo = item.roll_no || '';

              const ssRow = await queryOne(`
                SELECT ss.id, ss.student_id, s.roll_no 
                FROM student_session ss 
                JOIN students s ON s.id = ss.student_id 
                WHERE ss.id = ? OR ss.student_id = ? 
                LIMIT 1
              `, [studentSessionId, studentSessionId]);

              if (ssRow) {
                realSessionId = ssRow.id;
                realStudentId = ssRow.student_id;
                rollNo = rollNo || ssRow.roll_no || '';
              } else {
                const sRow = await queryOne(`SELECT id, roll_no FROM students WHERE id = ? LIMIT 1`, [studentSessionId]);
                if (sRow) {
                  realStudentId = sRow.id;
                  rollNo = rollNo || sRow.roll_no || '';
                }
              }

              const cleanRoll = (typeof rollNo === 'number' && !isNaN(rollNo)) ? rollNo : (parseInt(String(rollNo).replace(/\D/g, ''), 10) || 0);
              const [insResult]: any = await conn.execute(`
                INSERT INTO exam_group_class_batch_exam_students (exam_group_class_batch_exam_id, student_id, student_session_id, roll_no, is_active)
                VALUES (?, ?, ?, ?, 1)
              `, [Number(targetExamId) || 0, Number(realStudentId), Number(realSessionId), cleanRoll]);
              examStudentId = insResult?.insertId;
            } else {
              examStudentId = examStudent.id;
            }

            const cleanMarks = (marksObtained !== undefined && marksObtained !== null) ? Number(marksObtained) : null;
            const cleanAtt = attendance || 'present';
            const cleanNote = note || '';

            const existing = await queryOne(`
              SELECT id FROM exam_group_exam_results 
              WHERE exam_group_class_batch_exam_student_id = ? AND exam_group_class_batch_exam_subject_id = ?
            `, [examStudentId, scheduleId]);

            if (existing) {
              await conn.execute(`
                UPDATE exam_group_exam_results
                SET get_marks = ?, attendence = ?, note = ?, updated_at = CURDATE()
                WHERE id = ?
              `, [cleanMarks, cleanAtt, cleanNote, existing.id]);
            } else {
              await conn.execute(`
                INSERT INTO exam_group_exam_results (exam_group_class_batch_exam_student_id, exam_group_class_batch_exam_subject_id, attendence, get_marks, note, is_active)
                VALUES (?, ?, ?, ?, ?, 1)
              `, [Number(examStudentId), Number(scheduleId), cleanAtt, cleanMarks, cleanNote]);
            }
          }
        });

        return sendSuccess(res, { count: records.length }, 'Marks saved successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      logger.error('Error in exam marks:', error);
      return sendError(res, 'Failed to process exam marks', 500);
    }
  }

  // ==========================================
  // 6. ADMIT CARD TEMPLATES
  // ==========================================

  /**
   * GET /api/exams/templates/admit or /api/exams/templates/admit/:id
   */
  public static async getAdmitTemplates(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (id) {
        const rows = await query(`SELECT * FROM template_admitcards WHERE id = ?`, [id]);
        if (rows.length === 0) return sendError(res, 'Admit card template not found', 404);
        return sendSuccess(res, rows[0]);
      }
      const rows = await query(`SELECT * FROM template_admitcards ORDER BY id DESC`);
      return sendSuccess(res, rows);
    } catch (error) {
      logger.error('Error fetching admit templates:', error);
      return sendError(res, 'Failed to fetch admit card templates', 500);
    }
  }

  /**
   * POST /api/exams/templates/admit
   */
  public static async createAdmitTemplate(req: Request, res: Response) {
    try {
      const b = req.body || {};
      const template = b.template_name || b.template || b.name || 'Admit Card Template';
      const heading = b.heading ?? '';
      const title = b.title ?? 'ADMIT CARD';
      const exam_name = b.exam_name ?? '';
      const school_name = b.school_name ?? '';
      const exam_center = b.exam_center ?? '';
      const content_footer = b.content_footer ?? b.footer_text ?? '';
      let left_logo = b.left_logo ?? '';
      let right_logo = b.right_logo ?? '';
      let sign = b.sign ?? '';
      let background_img = b.background_img ?? '';

      const files = (req.files as Express.Multer.File[]) || [];
      if (files && files.length > 0) {
        const destDir = path.resolve(process.cwd(), 'uploads', 'admit_card');
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

        for (const f of files) {
          const ext = path.extname(f.originalname) || '.jpg';
          const destName = `${f.fieldname}_${Date.now()}${ext}`;
          fs.renameSync(f.path, path.join(destDir, destName));
          if (f.fieldname === 'left_logo') left_logo = destName;
          else if (f.fieldname === 'right_logo') right_logo = destName;
          else if (f.fieldname === 'sign') sign = destName;
          else if (f.fieldname === 'background_img') background_img = destName;
        }
      }

      const is_name = b.show_name !== undefined ? (Number(b.show_name) ? 1 : 0) : (b.is_name !== undefined ? (Number(b.is_name) ? 1 : 0) : 1);
      const is_father_name = b.show_father_name !== undefined ? (Number(b.show_father_name) ? 1 : 0) : (b.is_father_name !== undefined ? (Number(b.is_father_name) ? 1 : 0) : 1);
      const is_mother_name = b.show_mother_name !== undefined ? (Number(b.show_mother_name) ? 1 : 0) : (b.is_mother_name !== undefined ? (Number(b.is_mother_name) ? 1 : 0) : 1);
      const is_dob = b.show_dob !== undefined ? (Number(b.show_dob) ? 1 : 0) : (b.is_dob !== undefined ? (Number(b.is_dob) ? 1 : 0) : 1);
      const is_admission_no = b.show_admission_no !== undefined ? (Number(b.show_admission_no) ? 1 : 0) : (b.is_admission_no !== undefined ? (Number(b.is_admission_no) ? 1 : 0) : 1);
      const is_roll_no = b.show_roll_no !== undefined ? (Number(b.show_roll_no) ? 1 : 0) : (b.is_roll_no !== undefined ? (Number(b.is_roll_no) ? 1 : 0) : 1);
      const is_address = b.show_address !== undefined ? (Number(b.show_address) ? 1 : 0) : (b.is_address !== undefined ? (Number(b.is_address) ? 1 : 0) : 1);
      const is_gender = b.show_gender !== undefined ? (Number(b.show_gender) ? 1 : 0) : (b.is_gender !== undefined ? (Number(b.is_gender) ? 1 : 0) : 1);
      const is_photo = b.show_photo !== undefined ? (Number(b.show_photo) ? 1 : 0) : (b.is_photo !== undefined ? (Number(b.is_photo) ? 1 : 0) : 1);
      const is_class = b.show_class !== undefined ? (Number(b.show_class) ? 1 : 0) : (b.is_class !== undefined ? (Number(b.is_class) ? 1 : 0) : 1);
      const is_section = b.show_section !== undefined ? (Number(b.show_section) ? 1 : 0) : (b.is_section !== undefined ? (Number(b.is_section) ? 1 : 0) : 1);

      const result = await execute(`
        INSERT INTO template_admitcards (template, heading, title, exam_name, school_name, exam_center, content_footer, left_logo, right_logo, sign, background_img, is_name, is_father_name, is_mother_name, is_dob, is_admission_no, is_roll_no, is_address, is_gender, is_photo, is_class, is_section)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [template, heading, title, exam_name, school_name, exam_center, content_footer, left_logo, right_logo, sign, background_img, is_name, is_father_name, is_mother_name, is_dob, is_admission_no, is_roll_no, is_address, is_gender, is_photo, is_class, is_section]);

      return sendSuccess(res, { id: result.insertId, template }, 'Admit card template created successfully', 201);
    } catch (error) {
      logger.error('Error creating admit template:', error);
      return sendError(res, 'Failed to create admit card template', 500);
    }
  }

  /**
   * PUT / POST /api/exams/templates/admit/:id
   */
  public static async updateAdmitTemplate(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return sendError(res, 'Template ID required', 400);

      const b = req.body || {};
      const template = b.template_name ?? b.template ?? b.name ?? null;
      const heading = b.heading ?? null;
      const title = b.title ?? null;
      const exam_name = b.exam_name ?? null;
      const school_name = b.school_name ?? null;
      const exam_center = b.exam_center ?? null;
      const content_footer = b.content_footer ?? b.footer_text ?? null;
      let left_logo = b.left_logo ?? null;
      let right_logo = b.right_logo ?? null;
      let sign = b.sign ?? null;
      let background_img = b.background_img ?? null;

      const files = (req.files as Express.Multer.File[]) || [];
      if (files && files.length > 0) {
        const destDir = path.resolve(process.cwd(), 'uploads', 'admit_card');
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

        for (const f of files) {
          const ext = path.extname(f.originalname) || '.jpg';
          const destName = `${f.fieldname}_${Date.now()}${ext}`;
          fs.renameSync(f.path, path.join(destDir, destName));
          if (f.fieldname === 'left_logo') left_logo = destName;
          else if (f.fieldname === 'right_logo') right_logo = destName;
          else if (f.fieldname === 'sign') sign = destName;
          else if (f.fieldname === 'background_img') background_img = destName;
        }
      }

      const is_name = b.show_name !== undefined ? (Number(b.show_name) ? 1 : 0) : (b.is_name !== undefined ? (Number(b.is_name) ? 1 : 0) : null);
      const is_father_name = b.show_father_name !== undefined ? (Number(b.show_father_name) ? 1 : 0) : (b.is_father_name !== undefined ? (Number(b.is_father_name) ? 1 : 0) : null);
      const is_mother_name = b.show_mother_name !== undefined ? (Number(b.show_mother_name) ? 1 : 0) : (b.is_mother_name !== undefined ? (Number(b.is_mother_name) ? 1 : 0) : null);
      const is_dob = b.show_dob !== undefined ? (Number(b.show_dob) ? 1 : 0) : (b.is_dob !== undefined ? (Number(b.is_dob) ? 1 : 0) : null);
      const is_admission_no = b.show_admission_no !== undefined ? (Number(b.show_admission_no) ? 1 : 0) : (b.is_admission_no !== undefined ? (Number(b.is_admission_no) ? 1 : 0) : null);
      const is_roll_no = b.show_roll_no !== undefined ? (Number(b.show_roll_no) ? 1 : 0) : (b.is_roll_no !== undefined ? (Number(b.is_roll_no) ? 1 : 0) : null);
      const is_address = b.show_address !== undefined ? (Number(b.show_address) ? 1 : 0) : (b.is_address !== undefined ? (Number(b.is_address) ? 1 : 0) : null);
      const is_gender = b.show_gender !== undefined ? (Number(b.show_gender) ? 1 : 0) : (b.is_gender !== undefined ? (Number(b.is_gender) ? 1 : 0) : null);
      const is_photo = b.show_photo !== undefined ? (Number(b.show_photo) ? 1 : 0) : (b.is_photo !== undefined ? (Number(b.is_photo) ? 1 : 0) : null);
      const is_class = b.show_class !== undefined ? (Number(b.show_class) ? 1 : 0) : (b.is_class !== undefined ? (Number(b.is_class) ? 1 : 0) : null);
      const is_section = b.show_section !== undefined ? (Number(b.show_section) ? 1 : 0) : (b.is_section !== undefined ? (Number(b.is_section) ? 1 : 0) : null);

      await execute(`
        UPDATE template_admitcards
        SET template = COALESCE(?, template),
            heading = COALESCE(?, heading),
            title = COALESCE(?, title),
            exam_name = COALESCE(?, exam_name),
            school_name = COALESCE(?, school_name),
            exam_center = COALESCE(?, exam_center),
            content_footer = COALESCE(?, content_footer),
            left_logo = COALESCE(?, left_logo),
            right_logo = COALESCE(?, right_logo),
            sign = COALESCE(?, sign),
            background_img = COALESCE(?, background_img),
            is_name = COALESCE(?, is_name),
            is_father_name = COALESCE(?, is_father_name),
            is_mother_name = COALESCE(?, is_mother_name),
            is_dob = COALESCE(?, is_dob),
            is_admission_no = COALESCE(?, is_admission_no),
            is_roll_no = COALESCE(?, is_roll_no),
            is_address = COALESCE(?, is_address),
            is_gender = COALESCE(?, is_gender),
            is_photo = COALESCE(?, is_photo),
            is_class = COALESCE(?, is_class),
            is_section = COALESCE(?, is_section),
            updated_at = CURDATE()
        WHERE id = ?
      `, [template, heading, title, exam_name, school_name, exam_center, content_footer, left_logo, right_logo, sign, background_img, is_name, is_father_name, is_mother_name, is_dob, is_admission_no, is_roll_no, is_address, is_gender, is_photo, is_class, is_section, id]);

      return sendSuccess(res, { id }, 'Admit card template updated successfully');
    } catch (error) {
      logger.error('Error updating admit template:', error);
      return sendError(res, 'Failed to update admit card template', 500);
    }
  }

  /**
   * DELETE /api/exams/templates/admit/:id
   */
  public static async deleteAdmitTemplate(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return sendError(res, 'Template ID required', 400);

      await execute(`DELETE FROM template_admitcards WHERE id = ?`, [id]);
      return sendSuccess(res, { id }, 'Admit card template deleted successfully');
    } catch (error) {
      logger.error('Error deleting admit template:', error);
      return sendError(res, 'Failed to delete admit card template', 500);
    }
  }

  // ==========================================
  // 7. MARKSHEET TEMPLATES
  // ==========================================

  /**
   * GET /api/exams/templates/marksheet or /api/exams/templates/marksheet/:id
   */
  public static async getMarksheetTemplates(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (id) {
        const rows = await query(`SELECT * FROM template_marksheets WHERE id = ?`, [id]);
        if (rows.length === 0) return sendError(res, 'Marksheet template not found', 404);
        return sendSuccess(res, rows[0]);
      }
      const rows = await query(`SELECT * FROM template_marksheets ORDER BY id DESC`);
      return sendSuccess(res, rows);
    } catch (error) {
      logger.error('Error fetching marksheet templates:', error);
      return sendError(res, 'Failed to fetch marksheet templates', 500);
    }
  }

  /**
   * POST /api/exams/templates/marksheet
   */
  public static async createMarksheetTemplate(req: Request, res: Response) {
    try {
      const b = req.body || {};
      const template = b.template_name || b.template || b.name || 'Marksheet Template';
      const heading = b.heading ?? '';
      const title = b.title ?? 'REPORT CARD';
      const exam_name = b.exam_name ?? '';
      const school_name = b.school_name ?? '';
      const exam_center = b.exam_center ?? '';
      const content = b.content ?? '';
      const content_footer = b.content_footer ?? b.footer_text ?? '';
      let left_logo = b.left_logo ?? '';
      let right_logo = b.right_logo ?? '';
      let left_sign = b.left_sign ?? '';
      let middle_sign = b.middle_sign ?? '';
      let right_sign = b.right_sign ?? '';
      let background_img = b.background_img ?? '';
      const exam_session = b.exam_session !== undefined ? Number(b.exam_session) : 1;
      const date = b.date ?? '';

      const files = (req.files as Express.Multer.File[]) || [];
      if (files && files.length > 0) {
        const destDir = path.resolve(process.cwd(), 'uploads', 'marksheet');
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

        for (const f of files) {
          const ext = path.extname(f.originalname) || '.jpg';
          const destName = `${f.fieldname}_${Date.now()}${ext}`;
          fs.renameSync(f.path, path.join(destDir, destName));
          if (f.fieldname === 'left_logo') left_logo = destName;
          else if (f.fieldname === 'right_logo') right_logo = destName;
          else if (f.fieldname === 'left_sign') left_sign = destName;
          else if (f.fieldname === 'middle_sign') middle_sign = destName;
          else if (f.fieldname === 'right_sign') right_sign = destName;
          else if (f.fieldname === 'background_img') background_img = destName;
        }
      }

      const is_name = b.show_name !== undefined ? (Number(b.show_name) ? 1 : 0) : (b.is_name !== undefined ? (Number(b.is_name) ? 1 : 0) : 1);
      const is_father_name = b.show_father_name !== undefined ? (Number(b.show_father_name) ? 1 : 0) : (b.is_father_name !== undefined ? (Number(b.is_father_name) ? 1 : 0) : 1);
      const is_mother_name = b.show_mother_name !== undefined ? (Number(b.show_mother_name) ? 1 : 0) : (b.is_mother_name !== undefined ? (Number(b.is_mother_name) ? 1 : 0) : 1);
      const is_dob = b.show_dob !== undefined ? (Number(b.show_dob) ? 1 : 0) : (b.is_dob !== undefined ? (Number(b.is_dob) ? 1 : 0) : 1);
      const is_admission_no = b.show_admission_no !== undefined ? (Number(b.show_admission_no) ? 1 : 0) : (b.is_admission_no !== undefined ? (Number(b.is_admission_no) ? 1 : 0) : 1);
      const is_roll_no = b.show_roll_no !== undefined ? (Number(b.show_roll_no) ? 1 : 0) : (b.is_roll_no !== undefined ? (Number(b.is_roll_no) ? 1 : 0) : 1);
      const is_photo = b.show_photo !== undefined ? (Number(b.show_photo) ? 1 : 0) : (b.is_photo !== undefined ? (Number(b.is_photo) ? 1 : 0) : 1);
      const is_division = b.show_division !== undefined ? (Number(b.show_division) ? 1 : 0) : (b.is_division !== undefined ? (Number(b.is_division) ? 1 : 0) : 1);
      const is_class = b.show_class !== undefined ? (Number(b.show_class) ? 1 : 0) : (b.is_class !== undefined ? (Number(b.is_class) ? 1 : 0) : 1);
      const is_section = b.show_section !== undefined ? (Number(b.show_section) ? 1 : 0) : (b.is_section !== undefined ? (Number(b.is_section) ? 1 : 0) : 1);

      const result = await execute(`
        INSERT INTO template_marksheets (template, heading, title, exam_name, school_name, exam_center, content, content_footer, left_logo, right_logo, left_sign, middle_sign, right_sign, background_img, exam_session, date, is_name, is_father_name, is_mother_name, is_dob, is_admission_no, is_roll_no, is_photo, is_division, is_class, is_section)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [template, heading, title, exam_name, school_name, exam_center, content, content_footer, left_logo, right_logo, left_sign, middle_sign, right_sign, background_img, exam_session, date, is_name, is_father_name, is_mother_name, is_dob, is_admission_no, is_roll_no, is_photo, is_division, is_class, is_section]);

      return sendSuccess(res, { id: result.insertId, template }, 'Marksheet template created successfully', 201);
    } catch (error) {
      logger.error('Error creating marksheet template:', error);
      return sendError(res, 'Failed to create marksheet template', 500);
    }
  }

  /**
   * PUT / POST /api/exams/templates/marksheet/:id
   */
  public static async updateMarksheetTemplate(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return sendError(res, 'Template ID required', 400);

      const b = req.body || {};
      const template = b.template_name ?? b.template ?? b.name ?? null;
      const heading = b.heading ?? null;
      const title = b.title ?? null;
      const exam_name = b.exam_name ?? null;
      const school_name = b.school_name ?? null;
      const exam_center = b.exam_center ?? null;
      const content = b.content ?? null;
      const content_footer = b.content_footer ?? b.footer_text ?? null;
      let left_logo = b.left_logo ?? null;
      let right_logo = b.right_logo ?? null;
      let left_sign = b.left_sign ?? null;
      let middle_sign = b.middle_sign ?? null;
      let right_sign = b.right_sign ?? null;
      let background_img = b.background_img ?? null;
      const exam_session = b.exam_session !== undefined ? Number(b.exam_session) : null;
      const date = b.date ?? null;

      const files = (req.files as Express.Multer.File[]) || [];
      if (files && files.length > 0) {
        const destDir = path.resolve(process.cwd(), 'uploads', 'marksheet');
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

        for (const f of files) {
          const ext = path.extname(f.originalname) || '.jpg';
          const destName = `${f.fieldname}_${Date.now()}${ext}`;
          fs.renameSync(f.path, path.join(destDir, destName));
          if (f.fieldname === 'left_logo') left_logo = destName;
          else if (f.fieldname === 'right_logo') right_logo = destName;
          else if (f.fieldname === 'left_sign') left_sign = destName;
          else if (f.fieldname === 'middle_sign') middle_sign = destName;
          else if (f.fieldname === 'right_sign') right_sign = destName;
          else if (f.fieldname === 'background_img') background_img = destName;
        }
      }

      const is_name = b.show_name !== undefined ? (Number(b.show_name) ? 1 : 0) : (b.is_name !== undefined ? (Number(b.is_name) ? 1 : 0) : null);
      const is_father_name = b.show_father_name !== undefined ? (Number(b.show_father_name) ? 1 : 0) : (b.is_father_name !== undefined ? (Number(b.is_father_name) ? 1 : 0) : null);
      const is_mother_name = b.show_mother_name !== undefined ? (Number(b.show_mother_name) ? 1 : 0) : (b.is_mother_name !== undefined ? (Number(b.is_mother_name) ? 1 : 0) : null);
      const is_dob = b.show_dob !== undefined ? (Number(b.show_dob) ? 1 : 0) : (b.is_dob !== undefined ? (Number(b.is_dob) ? 1 : 0) : null);
      const is_admission_no = b.show_admission_no !== undefined ? (Number(b.show_admission_no) ? 1 : 0) : (b.is_admission_no !== undefined ? (Number(b.is_admission_no) ? 1 : 0) : null);
      const is_roll_no = b.show_roll_no !== undefined ? (Number(b.show_roll_no) ? 1 : 0) : (b.is_roll_no !== undefined ? (Number(b.is_roll_no) ? 1 : 0) : null);
      const is_photo = b.show_photo !== undefined ? (Number(b.show_photo) ? 1 : 0) : (b.is_photo !== undefined ? (Number(b.is_photo) ? 1 : 0) : null);
      const is_division = b.show_division !== undefined ? (Number(b.show_division) ? 1 : 0) : (b.is_division !== undefined ? (Number(b.is_division) ? 1 : 0) : null);
      const is_class = b.show_class !== undefined ? (Number(b.show_class) ? 1 : 0) : (b.is_class !== undefined ? (Number(b.is_class) ? 1 : 0) : null);
      const is_section = b.show_section !== undefined ? (Number(b.show_section) ? 1 : 0) : (b.is_section !== undefined ? (Number(b.is_section) ? 1 : 0) : null);

      await execute(`
        UPDATE template_marksheets
        SET template = COALESCE(?, template),
            heading = COALESCE(?, heading),
            title = COALESCE(?, title),
            exam_name = COALESCE(?, exam_name),
            school_name = COALESCE(?, school_name),
            exam_center = COALESCE(?, exam_center),
            content = COALESCE(?, content),
            content_footer = COALESCE(?, content_footer),
            left_logo = COALESCE(?, left_logo),
            right_logo = COALESCE(?, right_logo),
            left_sign = COALESCE(?, left_sign),
            middle_sign = COALESCE(?, middle_sign),
            right_sign = COALESCE(?, right_sign),
            background_img = COALESCE(?, background_img),
            exam_session = COALESCE(?, exam_session),
            date = COALESCE(?, date),
            is_name = COALESCE(?, is_name),
            is_father_name = COALESCE(?, is_father_name),
            is_mother_name = COALESCE(?, is_mother_name),
            is_dob = COALESCE(?, is_dob),
            is_admission_no = COALESCE(?, is_admission_no),
            is_roll_no = COALESCE(?, is_roll_no),
            is_photo = COALESCE(?, is_photo),
            is_division = COALESCE(?, is_division),
            is_class = COALESCE(?, is_class),
            is_section = COALESCE(?, is_section),
            updated_at = CURDATE()
        WHERE id = ?
      `, [template, heading, title, exam_name, school_name, exam_center, content, content_footer, left_logo, right_logo, left_sign, middle_sign, right_sign, background_img, exam_session, date, is_name, is_father_name, is_mother_name, is_dob, is_admission_no, is_roll_no, is_photo, is_division, is_class, is_section, id]);

      return sendSuccess(res, { id }, 'Marksheet template updated successfully');
    } catch (error) {
      logger.error('Error updating marksheet template:', error);
      return sendError(res, 'Failed to update marksheet template', 500);
    }
  }

  /**
   * DELETE /api/exams/templates/marksheet/:id
   */
  public static async deleteMarksheetTemplate(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return sendError(res, 'Template ID required', 400);

      await execute(`DELETE FROM template_marksheets WHERE id = ?`, [id]);
      return sendSuccess(res, { id }, 'Marksheet template deleted successfully');
    } catch (error) {
      logger.error('Error deleting marksheet template:', error);
      return sendError(res, 'Failed to delete marksheet template', 500);
    }
  }

  // ==========================================
  // 8. GRADES & METADATA
  // ==========================================

  /**
   * GET /api/Exams/grades
   */
  public static async grades(req: Request, res: Response) {
    try {
      const examType = req.query.exam_type;
      let sql = `SELECT * FROM grades WHERE 1=1`;
      const params: any[] = [];
      if (examType) {
        sql += ` AND exam_type = ?`;
        params.push(examType);
      }
      sql += ` ORDER BY mark_from DESC`;
      const rows = await query(sql, params);
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch grades', 500);
    }
  }

  /**
   * GET /api/exams/grades/meta
   */
  public static async getGradesMeta(req: Request, res: Response) {
    return sendSuccess(res, {
      exam_systems: [
        { id: 'general', name: 'General Purpose / Marks Based' },
        { id: 'gpa', name: 'GPA / Grading Scale' },
        { id: 'cce', name: 'CCE (Continuous and Comprehensive Evaluation)' },
        { id: 'cbse', name: 'CBSE / Percentage Grade' },
        { id: 'basic_system', name: 'Basic System' }
      ],
      form_fields: [
        { name: 'exam_type', label: 'Exam System', type: 'select' },
        { name: 'name', label: 'Grade Name', type: 'text' },
        { name: 'point', label: 'Grade Point', type: 'number' },
        { name: 'mark_from', label: 'Percentage From', type: 'number' },
        { name: 'mark_upto', label: 'Percentage Upto', type: 'number' },
        { name: 'description', label: 'Description', type: 'textarea' }
      ],
      table_columns: [
        { key: 'exam_type', label: 'Exam Type' },
        { key: 'name', label: 'Grade Name' },
        { key: 'point', label: 'Grade Point' },
        { key: 'mark_from', label: 'Percentage From' },
        { key: 'mark_upto', label: 'Percentage Upto' },
        { key: 'description', label: 'Description' }
      ]
    });
  }

  /**
   * GET /api/exams/exam-types
   */
  public static async getExamTypes(req: Request, res: Response) {
    return sendSuccess(res, [
      { key: 'general', name: 'General / Standard' },
      { key: 'gpa', name: 'GPA' },
      { key: 'cce', name: 'CCE' },
      { key: 'cbse', name: 'CBSE' },
      { key: 'basic_system', name: 'Basic System' }
    ]);
  }

  /**
   * POST /api/exams/grades
   */
  public static async createGrade(req: Request, res: Response) {
    try {
      const { exam_type, name, point, mark_from, mark_upto, description, is_active } = req.body;
      if (!name) return sendError(res, 'Grade name is required', 400);

      const result = await execute(`
        INSERT INTO grades (exam_type, name, point, mark_from, mark_upto, description, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [exam_type || 'general', name, point || 0, mark_from || 0, mark_upto || 100, description || '', is_active || 'yes']);

      return sendSuccess(res, { id: result.insertId }, 'Grade created successfully', 201);
    } catch (error) {
      logger.error('Error creating grade:', error);
      return sendError(res, 'Failed to create grade', 500);
    }
  }

  /**
   * PUT /api/exams/grades/:id
   */
  public static async updateGrade(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const { exam_type, name, point, mark_from, mark_upto, description, is_active } = req.body;
      if (!id) return sendError(res, 'Grade ID required', 400);

      await execute(`
        UPDATE grades
        SET exam_type = COALESCE(?, exam_type),
            name = COALESCE(?, name),
            point = COALESCE(?, point),
            mark_from = COALESCE(?, mark_from),
            mark_upto = COALESCE(?, mark_upto),
            description = COALESCE(?, description),
            is_active = COALESCE(?, is_active),
            updated_at = CURDATE()
        WHERE id = ?
      `, [exam_type || null, name || null, point !== undefined ? point : null, mark_from !== undefined ? mark_from : null, mark_upto !== undefined ? mark_upto : null, description || null, is_active || null, id]);

      return sendSuccess(res, { id }, 'Grade updated successfully');
    } catch (error) {
      logger.error('Error updating grade:', error);
      return sendError(res, 'Failed to update grade', 500);
    }
  }

  /**
   * DELETE /api/exams/grades/:id
   */
  public static async deleteGrade(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return sendError(res, 'Grade ID required', 400);

      await execute(`DELETE FROM grades WHERE id = ?`, [id]);
      return sendSuccess(res, { id }, 'Grade deleted successfully');
    } catch (error) {
      logger.error('Error deleting grade:', error);
      return sendError(res, 'Failed to delete grade', 500);
    }
  }

  // ==========================================
  // 9. RESULTS & CONNECTIONS
  // ==========================================

  /**
   * GET /api/exams/results
   */
  public static async getExamResults(req: Request, res: Response) {
    try {
      const examId = req.query.exam_id;
      const examGroupId = req.query.exam_group_id;
      const classId = req.query.class_id;
      const sectionId = req.query.section_id;

      if (!examId && !examGroupId) {
        return sendError(res, 'exam_id or exam_group_id required', 400);
      }

      const examDetails = await queryOne(`
        SELECT e.*, eg.name as exam_group_name, eg.exam_type
        FROM exam_group_class_batch_exams e
        JOIN exam_groups eg ON eg.id = e.exam_group_id
        WHERE e.id = ? OR e.exam_group_id = ?
        LIMIT 1
      `, [examId || 0, examGroupId || 0]);

      const subjects = await query(`
        SELECT es.*, s.name as subject_name, s.code as subject_code
        FROM exam_group_class_batch_exam_subjects es
        JOIN subjects s ON s.id = es.subject_id
        WHERE es.exam_group_class_batch_exams_id = ?
        ORDER BY es.id ASC
      `, [examDetails?.id || examId || 0]);

      const gradesList = await query(`SELECT * FROM grades ORDER BY mark_from DESC`);

      let studentsSql = `
        SELECT es.id as exam_student_id, es.roll_no as exam_roll_no,
               s.id as student_id, s.admission_no, s.roll_no, s.firstname, s.lastname, s.gender,
               c.class as class_name, sec.section as section_name,
               ss.id as student_session_id
        FROM exam_group_class_batch_exam_students es
        JOIN student_session ss ON ss.id = es.student_session_id
        JOIN students s ON s.id = ss.student_id
        JOIN classes c ON c.id = ss.class_id
        JOIN sections sec ON sec.id = ss.section_id
        WHERE es.exam_group_class_batch_exam_id = ?
      `;
      const sParams: any[] = [examDetails?.id || examId || 0];

      if (classId) {
        studentsSql += ` AND ss.class_id = ?`;
        sParams.push(classId);
      }
      if (sectionId) {
        studentsSql += ` AND ss.section_id = ?`;
        sParams.push(sectionId);
      }

      studentsSql += ` ORDER BY s.roll_no ASC, s.firstname ASC`;
      const students = await query(studentsSql, sParams);

      const studentResults = [];
      let passedCount = 0;
      let failedCount = 0;

      for (const std of students) {
        const marksRows = await query(`
          SELECT er.*, es.subject_id, es.max_marks, es.min_marks, s.name as subject_name
          FROM exam_group_exam_results er
          JOIN exam_group_class_batch_exam_subjects es ON es.id = er.exam_group_class_batch_exam_subject_id
          JOIN subjects s ON s.id = es.subject_id
          WHERE er.exam_group_class_batch_exam_student_id = ?
        `, [std.exam_student_id]);

        let totalObtained = 0;
        let totalMax = 0;
        let isPass = true;

        const subjectMarksMap: Record<string, any> = {};
        for (const m of marksRows) {
          const obtained = m.get_marks !== null ? Number(m.get_marks) : 0;
          const max = Number(m.max_marks || 100);
          const min = Number(m.min_marks || 35);
          totalObtained += obtained;
          totalMax += max;
          if (obtained < min) isPass = false;

          subjectMarksMap[m.subject_id] = {
            obtained,
            max,
            min,
            attendance: m.attendence,
            note: m.note
          };
        }

        const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
        const matchedGrade = gradesList.find((g: any) => percentage >= Number(g.mark_from) && percentage <= Number(g.mark_upto));

        if (isPass && marksRows.length > 0) passedCount++;
        else if (marksRows.length > 0) failedCount++;

        studentResults.push({
          ...std,
          subject_marks: subjectMarksMap,
          total_marks: totalObtained,
          max_marks: totalMax,
          percentage: parseFloat(percentage.toFixed(2)),
          grade: matchedGrade ? matchedGrade.name : 'N/A',
          status: isPass ? 'Pass' : 'Fail'
        });
      }

      return sendSuccess(res, {
        exam_details: examDetails,
        subjects,
        grades: gradesList,
        students: studentResults,
        total_students: studentResults.length,
        passed_count: passedCount,
        failed_count: failedCount
      });
    } catch (error) {
      logger.error('Error in getExamResults:', error);
      return sendError(res, 'Failed to fetch exam results', 500);
    }
  }

  /**
   * GET /api/exams/connections/:examGroupId
   */
  public static async getConnectedExams(req: Request, res: Response) {
    try {
      const examGroupId = req.params.examGroupId;
      if (!examGroupId) return sendSuccess(res, []);

      const rows = await query(`
        SELECT c.*, e.exam as exam_name, e.exam_group_id
        FROM exam_group_exam_connections c
        JOIN exam_group_class_batch_exams e ON e.id = c.exam_group_class_batch_exams_id
        WHERE c.exam_group_id = ?
        ORDER BY c.id ASC
      `, [examGroupId]);

      return sendSuccess(res, rows);
    } catch (error) {
      logger.error('Error fetching connected exams:', error);
      return sendError(res, 'Failed to fetch connected exams', 500);
    }
  }

  /**
   * POST /api/exams/connections
   */
  public static async saveConnectedExams(req: Request, res: Response) {
    try {
      const { exam_group_id, connections } = req.body;
      if (!exam_group_id || !Array.isArray(connections)) {
        return sendError(res, 'exam_group_id and connections array required', 400);
      }

      await transaction(async (conn) => {
        await conn.execute(`DELETE FROM exam_group_exam_connections WHERE exam_group_id = ?`, [exam_group_id]);
        for (const c of connections) {
          await conn.execute(`
            INSERT INTO exam_group_exam_connections (exam_group_id, exam_group_class_batch_exams_id, exam_weightage, is_active)
            VALUES (?, ?, ?, 1)
          `, [exam_group_id, c.exam_id, c.exam_weightage || 0]);
        }
      });

      return sendSuccess(res, { count: connections.length }, 'Exam connections saved successfully');
    } catch (error) {
      logger.error('Error saving connected exams:', error);
      return sendError(res, 'Failed to save exam connections', 500);
    }
  }

  /**
   * GET /api/exams/dashboard-pipeline
   */
  public static async getDashboardPipeline(req: Request, res: Response) {
    try {
      const groups = await query(`
        SELECT eg.*, 
               (SELECT COUNT(*) FROM exam_group_class_batch_exams ecb WHERE ecb.exam_group_id = eg.id) as total_exams
        FROM exam_groups eg
        ORDER BY eg.id DESC
      `);

      const exams = await query(`
        SELECT e.*, eg.name as exam_group_name, eg.exam_type as group_exam_type,
               (SELECT COUNT(*) FROM exam_group_class_batch_exam_subjects es WHERE es.exam_group_class_batch_exams_id = e.id) as total_subjects,
               (SELECT COUNT(*) FROM exam_group_class_batch_exam_students est WHERE est.exam_group_class_batch_exam_id = e.id) as total_students,
               (SELECT COUNT(*) FROM exam_group_exam_results er 
                JOIN exam_group_class_batch_exam_students est ON est.id = er.exam_group_class_batch_exam_student_id
                WHERE est.exam_group_class_batch_exam_id = e.id) as entered_marks_count
        FROM exam_group_class_batch_exams e
        JOIN exam_groups eg ON eg.id = e.exam_group_id
        ORDER BY e.id DESC
      `);

      return sendSuccess(res, {
        total_groups: groups.length,
        total_exams: exams.length,
        groups,
        exams
      });
    } catch (error) {
      logger.error('Error in getDashboardPipeline:', error);
      return sendError(res, 'Failed to fetch exam pipeline', 500);
    }
  }

  /**
   * GET /api/exams/consolidated-results
   */
  public static async getConsolidatedResults(req: Request, res: Response) {
    try {
      const examId = req.query.exam_id;
      const classId = req.query.class_id;
      const sectionId = req.query.section_id;

      if (!examId) {
        return sendError(res, 'exam_id is required', 400);
      }

      // 1. Fetch Exam Details
      const examDetails = await queryOne(`
        SELECT e.*, eg.name as exam_group_name, eg.exam_type
        FROM exam_group_class_batch_exams e
        JOIN exam_groups eg ON eg.id = e.exam_group_id
        WHERE e.id = ?
        LIMIT 1
      `, [examId]);

      if (!examDetails) {
        return sendError(res, 'Exam not found', 404);
      }

      // 2. Fetch Subjects in this exam
      const subjects = await query(`
        SELECT es.*, s.name as subject_name, s.code as subject_code, s.type as subject_type
        FROM exam_group_class_batch_exam_subjects es
        JOIN subjects s ON s.id = es.subject_id
        WHERE es.exam_group_class_batch_exams_id = ?
        ORDER BY es.date_from ASC, es.id ASC
      `, [examId]);

      // 3. Fetch Enrolled Students with optional class/section filter
      let studentSql = `
        SELECT est.id as exam_student_id, est.roll_no as exam_roll_no,
               s.id as student_id, s.admission_no, s.roll_no, s.firstname, s.lastname, s.gender, s.image,
               c.class, sec.section, ss.id as student_session_id
        FROM exam_group_class_batch_exam_students est
        JOIN student_session ss ON ss.id = est.student_session_id
        JOIN students s ON s.id = ss.student_id
        LEFT JOIN classes c ON c.id = ss.class_id
        LEFT JOIN sections sec ON sec.id = ss.section_id
        WHERE est.exam_group_class_batch_exam_id = ?
      `;
      const studentParams: any[] = [examId];
      if (classId) {
        studentSql += ` AND ss.class_id = ?`;
        studentParams.push(classId);
      }
      if (sectionId) {
        studentSql += ` AND ss.section_id = ?`;
        studentParams.push(sectionId);
      }
      studentSql += ` ORDER BY est.roll_no ASC, s.firstname ASC`;

      const students = await query(studentSql, studentParams);

      // 4. Fetch Marks for all students in this exam
      const marksRows = await query(`
        SELECT er.*, est.id as exam_student_id, es.id as schedule_subject_id
        FROM exam_group_exam_results er
        JOIN exam_group_class_batch_exam_students est ON est.id = er.exam_group_class_batch_exam_student_id
        JOIN exam_group_class_batch_exam_subjects es ON es.id = er.exam_group_class_batch_exam_subject_id
        WHERE est.exam_group_class_batch_exam_id = ?
      `, [examId]);

      // 5. Fetch Grades scale
      const grades = await query(`SELECT * FROM grades ORDER BY mark_from DESC`);

      // 6. Map results student-by-student
      const marksMap = new Map<string, any>();
      for (const m of marksRows) {
        marksMap.set(`${m.exam_student_id}_${m.schedule_subject_id}`, m);
      }

      let grandTotalPossible = 0;
      for (const sub of subjects) {
        grandTotalPossible += Number(sub.max_marks || 100);
      }

      const rows = students.map((st: any) => {
        let totalObtained = 0;
        let isFailed = false;
        let subjectsAttempted = 0;

        const studentSubjectResults = subjects.map((sub: any) => {
          const key = `${st.exam_student_id}_${sub.id}`;
          const resRow = marksMap.get(key);
          const maxM = Number(sub.max_marks || 100);
          const minM = Number(sub.min_marks || 35);
          const obt = resRow && resRow.get_marks !== null && resRow.get_marks !== undefined ? Number(resRow.get_marks) : null;
          const att = resRow ? (resRow.attendence || 'present') : 'present';

          if (obt !== null) {
            totalObtained += obt;
            subjectsAttempted++;
            if (obt < minM) isFailed = true;
          }

          // Grade calculation for this subject
          const pct = obt !== null && maxM > 0 ? (obt / maxM) * 100 : 0;
          let subGrade = '-';
          if (obt !== null) {
            const matchedGrade = grades.find((g: any) => pct >= Number(g.mark_from) && pct <= Number(g.mark_upto));
            subGrade = matchedGrade ? matchedGrade.name : (pct >= 40 ? 'Pass' : 'Fail');
          }

          return {
            subject_id: sub.subject_id,
            subject_name: sub.subject_name,
            subject_code: sub.subject_code,
            date_from: sub.date_from,
            max_marks: maxM,
            min_marks: minM,
            marks_obtained: obt,
            attendance: att,
            note: resRow?.note || '',
            is_passed: obt !== null ? obt >= minM : false,
            grade: subGrade
          };
        });

        const overallPercent = grandTotalPossible > 0 ? Math.round((totalObtained / grandTotalPossible) * 100 * 100) / 100 : 0;
        const matchedOverallGrade = grades.find((g: any) => overallPercent >= Number(g.mark_from) && overallPercent <= Number(g.mark_upto));
        const overallGrade = matchedOverallGrade ? matchedOverallGrade.name : (overallPercent >= 40 ? 'Pass' : 'Fail');

        return {
          exam_student_id: st.exam_student_id,
          student_id: st.student_id,
          student_session_id: st.student_session_id,
          admission_no: st.admission_no,
          roll_no: st.exam_roll_no || st.roll_no || '-',
          student_name: [st.firstname, st.lastname].filter(Boolean).join(' '),
          gender: st.gender,
          image: st.image,
          class: st.class,
          section: st.section,
          subjects: studentSubjectResults,
          total_marks_obtained: totalObtained,
          grand_total_marks: grandTotalPossible,
          percentage: overallPercent,
          grade: overallGrade,
          result_status: isFailed ? 'Fail' : (subjectsAttempted > 0 ? 'Pass' : 'Pending')
        };
      });

      return sendSuccess(res, {
        exam: examDetails,
        subjects,
        students: rows
      });
    } catch (error) {
      logger.error('Error in getConsolidatedResults:', error);
      return sendError(res, 'Failed to fetch consolidated results', 500);
    }
  }

  /**
   * GET /api/Exams/student/:studentId
   */
  public static async studentExams(req: Request, res: Response) {
    try {
      const studentId = req.params.studentId || req.params.id || req.query.student_id || req.query.studentId;
      if (!studentId) {
        return sendSuccess(res, []);
      }
      const rows = await query(`
        SELECT e.id as exam_id, e.id, e.exam as exam_name, e.exam, eg.name as exam_group_name,
               es.roll_no as exam_roll_no,
               (SELECT COUNT(*) FROM exam_group_class_batch_exam_subjects WHERE exam_group_class_batch_exams_id = e.id) as total_subjects,
               e.date_from, e.date_to, e.is_publish
        FROM exam_group_class_batch_exam_students es
        JOIN exam_group_class_batch_exams e ON e.id = es.exam_group_class_batch_exam_id
        JOIN exam_groups eg ON eg.id = e.exam_group_id
        JOIN student_session ss ON ss.id = es.student_session_id
        WHERE ss.student_id = ? OR es.student_id = ?
        ORDER BY e.id DESC
      `, [studentId, studentId]).catch(() => []);

      return sendSuccess(res, rows);
    } catch (error) {
      logger.error('Error in studentExams:', error);
      return sendError(res, 'Failed to fetch student exams', 500);
    }
  }

  /**
   * GET /api/exams/student/:studentId/schedule
   */
  public static async studentExamSchedule(req: Request, res: Response) {
    try {
      const studentId = req.params.studentId || req.params.id || req.query.student_id;
      if (!studentId) return sendSuccess(res, []);

      const rows = await query(`
        SELECT es.id as schedule_id, es.date_from, es.time_from, es.duration, es.room_no, es.max_marks, es.min_marks,
               sub.name as subject_name, sub.code as subject_code, sub.type as subject_type,
               e.id as exam_id, e.exam as exam_name, eg.name as exam_group_name,
               est.roll_no as exam_roll_no
        FROM exam_group_class_batch_exam_students est
        JOIN exam_group_class_batch_exams e ON e.id = est.exam_group_class_batch_exam_id
        JOIN exam_groups eg ON eg.id = e.exam_group_id
        JOIN exam_group_class_batch_exam_subjects es ON es.exam_group_class_batch_exams_id = e.id
        JOIN subjects sub ON sub.id = es.subject_id
        JOIN student_session ss ON ss.id = est.student_session_id
        WHERE (ss.student_id = ? OR est.student_id = ?)
        ORDER BY es.date_from ASC, es.time_from ASC
      `, [studentId, studentId]).catch(() => []);

      return sendSuccess(res, rows);
    } catch (error) {
      logger.error('Error in studentExamSchedule:', error);
      return sendError(res, 'Failed to fetch student exam schedule', 500);
    }
  }

  /**
   * GET /api/exams/student/:studentId/results
   */
  public static async studentExamResults(req: Request, res: Response) {
    try {
      const studentId = req.params.studentId || req.params.id || req.query.student_id;
      if (!studentId) return sendSuccess(res, []);

      // Only published exams (is_publish = 1)
      const exams = await query(`
        SELECT DISTINCT e.id as exam_id, e.exam as exam_name, eg.name as exam_group_name, eg.exam_type,
               e.date_from, e.date_to, est.id as exam_student_id, est.roll_no as exam_roll_no
        FROM exam_group_class_batch_exam_students est
        JOIN exam_group_class_batch_exams e ON e.id = est.exam_group_class_batch_exam_id
        JOIN exam_groups eg ON eg.id = e.exam_group_id
        JOIN student_session ss ON ss.id = est.student_session_id
        WHERE (ss.student_id = ? OR est.student_id = ?) AND e.is_publish = 1
        ORDER BY e.id DESC
      `, [studentId, studentId]).catch(() => []);

      const grades = await query(`SELECT * FROM grades ORDER BY mark_from DESC`).catch(() => []);

      const results = [];
      for (const ex of exams) {
        const subjects = await query(`
          SELECT es.id as schedule_id, es.max_marks, es.min_marks,
                 sub.name as subject_name, sub.code as subject_code,
                 er.get_marks, er.attendence, er.note
          FROM exam_group_class_batch_exam_subjects es
          JOIN subjects sub ON sub.id = es.subject_id
          LEFT JOIN exam_group_exam_results er ON er.exam_group_class_batch_exam_subject_id = es.id 
                                             AND er.exam_group_class_batch_exam_student_id = ?
          WHERE es.exam_group_class_batch_exams_id = ?
          ORDER BY es.date_from ASC
        `, [ex.exam_student_id, ex.exam_id]);

        let totalObtained = 0;
        let grandTotal = 0;
        let isPass = true;

        const mappedSubjects = subjects.map((sub: any) => {
          const maxM = Number(sub.max_marks || 100);
          const minM = Number(sub.min_marks || 35);
          const obt = sub.get_marks !== null && sub.get_marks !== undefined ? Number(sub.get_marks) : null;
          grandTotal += maxM;
          if (obt !== null) {
            totalObtained += obt;
            if (obt < minM) isPass = false;
          } else {
            isPass = false;
          }

          const pct = obt !== null && maxM > 0 ? (obt / maxM) * 100 : 0;
          const matchG = grades.find((g: any) => pct >= Number(g.mark_from) && pct <= Number(g.mark_upto));
          const gradeName = matchG ? matchG.name : (pct >= 35 ? 'Pass' : 'Fail');

          return {
            subject_name: sub.subject_name,
            subject_code: sub.subject_code,
            max_marks: maxM,
            min_marks: minM,
            obtained: obt,
            attendance: sub.attendence || 'present',
            grade: gradeName,
            remarks: sub.note || ''
          };
        });

        const percentage = grandTotal > 0 ? Math.round((totalObtained / grandTotal) * 100 * 100) / 100 : 0;
        const overallMatchG = grades.find((g: any) => percentage >= Number(g.mark_from) && percentage <= Number(g.mark_upto));

        results.push({
          exam_id: ex.exam_id,
          exam_name: ex.exam_name,
          exam_group_name: ex.exam_group_name,
          roll_no: ex.exam_roll_no,
          date_from: ex.date_from,
          date_to: ex.date_to,
          total_marks: totalObtained,
          grand_total: grandTotal,
          percentage,
          grade: overallMatchG ? overallMatchG.name : (percentage >= 35 ? 'Pass' : 'Fail'),
          result_status: isPass ? 'Pass' : 'Fail',
          subjects: mappedSubjects
        });
      }

      return sendSuccess(res, results);
    } catch (error) {
      logger.error('Error in studentExamResults:', error);
      return sendError(res, 'Failed to fetch student exam results', 500);
    }
  }

  /**
   * POST /api/exams/students/generate-roll-no or /api/exams/generate-rollno
   */
  public static async generateRollNumbers(req: Request, res: Response) {
    try {
      const { exam_id, prefix = 'EX', start_no = 101, digits = 3, order_by = 'roll_no' } = req.body;
      if (!exam_id) return sendError(res, 'exam_id is required', 400);

      const students = await query(`
        SELECT est.id, s.roll_no, s.admission_no, s.firstname, s.lastname
        FROM exam_group_class_batch_exam_students est
        JOIN student_session ss ON ss.id = est.student_session_id
        JOIN students s ON s.id = ss.student_id
        WHERE est.exam_group_class_batch_exam_id = ?
        ORDER BY ${order_by === 'admission_no' ? 's.admission_no ASC' : (order_by === 'name' ? 's.firstname ASC' : 's.roll_no ASC, s.id ASC')}
      `, [exam_id]);

      if (students.length === 0) {
        return sendError(res, 'No students enrolled in this examination', 400);
      }

      // Fetch scheduled halls and capacities for this exam
      const scheduleRows = await query(`
        SELECT room_no, COALESCE(room_capacity, 30) as capacity
        FROM exam_group_class_batch_exam_subjects
        WHERE exam_group_class_batch_exams_id = ? AND room_no IS NOT NULL AND room_no != ''
        GROUP BY room_no, room_capacity
        ORDER BY room_no ASC
      `, [exam_id]);

      const halls = scheduleRows.length > 0
        ? scheduleRows.map(r => ({ room_no: r.room_no || 'Room 101', capacity: Number(r.capacity) || 30 }))
        : [{ room_no: 'Room 101', capacity: 100 }];

      const totalCapacity = halls.reduce((sum, h) => sum + h.capacity, 0);

      let curRoll = Number(start_no) || 101;
      let hallIdx = 0;
      let seatInHall = 1;

      await transaction(async (conn) => {
        for (const r of students) {
          const currentHall = halls[hallIdx] || { room_no: `Room ${101 + hallIdx}`, capacity: 30 };
          const roomNo = currentHall.room_no;
          const seatNo = `Seat ${seatInHall}`;

          await conn.execute(`
            UPDATE exam_group_class_batch_exam_students 
            SET roll_no = ?, room_no = ?, seat_no = ? 
            WHERE id = ?
          `, [curRoll, roomNo, seatNo, r.id]);

          curRoll++;
          seatInHall++;
          if (seatInHall > currentHall.capacity && hallIdx < halls.length - 1) {
            hallIdx++;
            seatInHall = 1;
          }
        }
      });

      return sendSuccess(res, {
        updated: students.length,
        total_students: students.length,
        total_capacity: totalCapacity,
        is_capacity_sufficient: students.length <= totalCapacity,
        halls
      }, 'Roll numbers and seating arrangements generated successfully');
    } catch (error) {
      logger.error('Error generating roll numbers:', error);
      return sendError(res, 'Failed to generate roll numbers', 500);
    }
  }

  /**
   * POST /api/exams/print-admit-cards
   */
  public static async printAdmitCards(req: Request, res: Response) {
    try {
      const { exam_id, template_id, student_ids } = req.body;
      if (!exam_id) return sendError(res, 'exam_id is required', 400);

      const exam = await queryOne(`
        SELECT e.*, eg.name as exam_group_name, eg.exam_type
        FROM exam_group_class_batch_exams e
        JOIN exam_groups eg ON eg.id = e.exam_group_id
        WHERE e.id = ? LIMIT 1
      `, [exam_id]);

      let template = null;
      if (template_id) {
        template = await queryOne(`SELECT * FROM template_admitcards WHERE id = ? LIMIT 1`, [template_id]);
      } else {
        template = await queryOne(`SELECT * FROM template_admitcards ORDER BY id DESC LIMIT 1`);
      }

      const subjects = await query(`
        SELECT es.*, s.name as subject_name, s.code as subject_code, s.type as subject_type
        FROM exam_group_class_batch_exam_subjects es
        JOIN subjects s ON s.id = es.subject_id
        WHERE es.exam_group_class_batch_exams_id = ?
        ORDER BY es.date_from ASC, es.time_from ASC
      `, [exam_id]);

      let stdSql = `
        SELECT est.id as exam_student_id, est.roll_no as exam_roll_no,
               s.id as student_id, s.admission_no, s.roll_no, s.firstname, s.lastname, s.father_name, s.mother_name,
               s.dob, s.gender, s.current_address, s.image,
               c.class, sec.section
        FROM exam_group_class_batch_exam_students est
        JOIN student_session ss ON ss.id = est.student_session_id
        JOIN students s ON s.id = ss.student_id
        LEFT JOIN classes c ON c.id = ss.class_id
        LEFT JOIN sections sec ON sec.id = ss.section_id
        WHERE est.exam_group_class_batch_exam_id = ?
      `;
      const params: any[] = [exam_id];
      if (Array.isArray(student_ids) && student_ids.length > 0) {
        stdSql += ` AND (est.id IN (?) OR s.id IN (?))`;
        params.push(student_ids, student_ids);
      }
      stdSql += ` ORDER BY est.roll_no ASC, s.firstname ASC`;

      const students = await query(stdSql, params);

      return sendSuccess(res, {
        exam,
        template,
        subjects,
        admit_cards: students.map((st: any) => ({
          ...st,
          student_name: [st.firstname, st.lastname].filter(Boolean).join(' '),
          subjects
        }))
      });
    } catch (error) {
      logger.error('Error generating admit cards for print:', error);
      return sendError(res, 'Failed to generate admit cards', 500);
    }
  }

  /**
   * POST /api/exams/print-marksheets
   */
  public static async printMarksheets(req: Request, res: Response) {
    try {
      const { exam_id, template_id, student_ids } = req.body;
      if (!exam_id) return sendError(res, 'exam_id is required', 400);

      const exam = await queryOne(`
        SELECT e.*, eg.name as exam_group_name, eg.exam_type
        FROM exam_group_class_batch_exams e
        JOIN exam_groups eg ON eg.id = e.exam_group_id
        WHERE e.id = ? LIMIT 1
      `, [exam_id]);

      let template = null;
      if (template_id) {
        template = await queryOne(`SELECT * FROM template_marksheets WHERE id = ? LIMIT 1`, [template_id]);
      } else {
        template = await queryOne(`SELECT * FROM template_marksheets ORDER BY id DESC LIMIT 1`);
      }

      const subjects = await query(`
        SELECT es.*, s.name as subject_name, s.code as subject_code, s.type as subject_type
        FROM exam_group_class_batch_exam_subjects es
        JOIN subjects s ON s.id = es.subject_id
        WHERE es.exam_group_class_batch_exams_id = ?
        ORDER BY es.date_from ASC, es.id ASC
      `, [exam_id]);

      const grades = await query(`SELECT * FROM grades ORDER BY mark_from DESC`);

      let stdSql = `
        SELECT est.id as exam_student_id, est.roll_no as exam_roll_no,
               s.id as student_id, s.admission_no, s.roll_no, s.firstname, s.lastname, s.father_name, s.mother_name,
               s.dob, s.gender, s.image,
               c.class, sec.section
        FROM exam_group_class_batch_exam_students est
        JOIN student_session ss ON ss.id = est.student_session_id
        JOIN students s ON s.id = ss.student_id
        LEFT JOIN classes c ON c.id = ss.class_id
        LEFT JOIN sections sec ON sec.id = ss.section_id
        WHERE est.exam_group_class_batch_exam_id = ?
      `;
      const params: any[] = [exam_id];
      if (Array.isArray(student_ids) && student_ids.length > 0) {
        stdSql += ` AND (est.id IN (?) OR s.id IN (?))`;
        params.push(student_ids, student_ids);
      }
      stdSql += ` ORDER BY est.roll_no ASC, s.firstname ASC`;

      const students = await query(stdSql, params);

      const marksRows = await query(`
        SELECT er.*, est.id as exam_student_id, es.id as schedule_subject_id
        FROM exam_group_exam_results er
        JOIN exam_group_class_batch_exam_students est ON est.id = er.exam_group_class_batch_exam_student_id
        JOIN exam_group_class_batch_exam_subjects es ON es.id = er.exam_group_class_batch_exam_subject_id
        WHERE est.exam_group_class_batch_exam_id = ?
      `, [exam_id]);

      const marksMap = new Map<string, any>();
      for (const m of marksRows) {
        marksMap.set(`${m.exam_student_id}_${m.schedule_subject_id}`, m);
      }

      let grandTotalPossible = 0;
      for (const sub of subjects) {
        grandTotalPossible += Number(sub.max_marks || 100);
      }

      const marksheets = students.map((st: any) => {
        let totalObtained = 0;
        let isFailed = false;

        const studentSubjectResults = subjects.map((sub: any) => {
          const resRow = marksMap.get(`${st.exam_student_id}_${sub.id}`);
          const maxM = Number(sub.max_marks || 100);
          const minM = Number(sub.min_marks || 35);
          const obt = resRow && resRow.get_marks !== null && resRow.get_marks !== undefined ? Number(resRow.get_marks) : null;
          const att = resRow ? (resRow.attendence || 'present') : 'present';

          if (obt !== null) {
            totalObtained += obt;
            if (obt < minM) isFailed = true;
          }

          const pct = obt !== null && maxM > 0 ? (obt / maxM) * 100 : 0;
          const matchG = grades.find((g: any) => pct >= Number(g.mark_from) && pct <= Number(g.mark_upto));

          return {
            subject_name: sub.subject_name,
            subject_code: sub.subject_code,
            max_marks: maxM,
            min_marks: minM,
            marks_obtained: obt,
            attendance: att,
            grade: matchG ? matchG.name : (pct >= 35 ? 'Pass' : 'Fail')
          };
        });

        const percentage = grandTotalPossible > 0 ? Math.round((totalObtained / grandTotalPossible) * 100 * 100) / 100 : 0;
        const overallMatchG = grades.find((g: any) => percentage >= Number(g.mark_from) && percentage <= Number(g.mark_upto));

        return {
          ...st,
          student_name: [st.firstname, st.lastname].filter(Boolean).join(' '),
          subjects: studentSubjectResults,
          total_marks: totalObtained,
          grand_total: grandTotalPossible,
          percentage,
          grade: overallMatchG ? overallMatchG.name : (percentage >= 35 ? 'Pass' : 'Fail'),
          result_status: isFailed ? 'Fail' : 'Pass'
        };
      });

      return sendSuccess(res, {
        exam,
        template,
        grades,
        marksheets
      });
    } catch (error) {
      logger.error('Error generating marksheets for print:', error);
      return sendError(res, 'Failed to generate marksheets', 500);
    }
  }

  /**
   * GET /api/exams/teacher-remarks
   */
  public static async getTeacherRemarks(req: Request, res: Response) {
    try {
      const examId = req.query.exam_id;
      if (!examId) return sendSuccess(res, []);

      const rows = await query(`
        SELECT er.*, es.roll_no as exam_roll_no, s.firstname, s.lastname, s.admission_no
        FROM exam_group_exam_results er
        JOIN exam_group_class_batch_exam_students es ON es.id = er.exam_group_class_batch_exam_student_id
        JOIN student_session ss ON ss.id = es.student_session_id
        JOIN students s ON s.id = ss.student_id
        WHERE es.exam_group_class_batch_exam_id = ?
      `, [examId]).catch(() => []);

      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch teacher remarks', 500);
    }
  }

  /**
   * POST /api/exams/teacher-remarks
   */
  public static async saveTeacherRemarks(req: Request, res: Response) {
    try {
      const { remarks } = req.body;
      if (Array.isArray(remarks)) {
        await transaction(async (conn) => {
          for (const r of remarks) {
            if (r.student_session_id && r.teacher_remark) {
              await conn.execute(`
                UPDATE exam_group_exam_results er
                JOIN exam_group_class_batch_exam_students es ON es.id = er.exam_group_class_batch_exam_student_id
                SET er.note = ?
                WHERE es.student_session_id = ?
              `, [r.teacher_remark, r.student_session_id]);
            }
          }
        });
      }
      return sendSuccess(res, { success: true }, 'Teacher remarks saved');
    } catch (error) {
      return sendError(res, 'Failed to save teacher remarks', 500);
    }
  }

  /**
   * GET /api/exams/attendance-sheet
   */
  public static async getAttendanceSheet(req: Request, res: Response) {
    try {
      const examId = req.query.exam_id;
      if (!examId) return sendError(res, 'exam_id required', 400);

      const exam = await queryOne(`SELECT * FROM exam_group_class_batch_exams WHERE id = ?`, [examId]);
      const subjects = await query(`
        SELECT es.*, s.name as subject_name
        FROM exam_group_class_batch_exam_subjects es
        JOIN subjects s ON s.id = es.subject_id
        WHERE es.exam_group_class_batch_exams_id = ?
      `, [examId]);

      const students = await query(`
        SELECT est.*, s.admission_no, s.roll_no, s.firstname, s.lastname, c.class, sec.section
        FROM exam_group_class_batch_exam_students est
        JOIN student_session ss ON ss.id = est.student_session_id
        JOIN students s ON s.id = ss.student_id
        LEFT JOIN classes c ON c.id = ss.class_id
        LEFT JOIN sections sec ON sec.id = ss.section_id
        WHERE est.exam_group_class_batch_exam_id = ?
        ORDER BY est.roll_no ASC, s.firstname ASC
      `, [examId]);

      return sendSuccess(res, { exam, subjects, students });
    } catch (error) {
      return sendError(res, 'Failed to fetch attendance sheet', 500);
    }
  }
}

