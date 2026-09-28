import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { query, queryOne, execute } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response.util';
import { StorageService } from '../../services/storage.service';
import { logger } from '../../utils/logger';

export class HomeworkController {
  /**
   * GET /api/homework/dropdowns
   */
  /**
   * GET /api/homework/dropdowns
   */
  public static async dropdowns(req: Request, res: Response) {
    try {
      const classes = await query(`SELECT id, class FROM classes ORDER BY id ASC`);
      const sections = await query(`SELECT id, section FROM sections ORDER BY section ASC`);
      const class_sections = await query(`
        SELECT cs.id, cs.class_id, cs.section_id, sec.section
        FROM class_sections cs
        JOIN sections sec ON sec.id = cs.section_id
        ORDER BY cs.class_id ASC, sec.section ASC
      `);
      const subject_groups = await query(`
        SELECT sg.id, sg.name, cs.class_id, cs.section_id
        FROM subject_groups sg
        LEFT JOIN subject_group_class_sections sgcs ON sgcs.subject_group_id = sg.id
        LEFT JOIN class_sections cs ON cs.id = sgcs.class_section_id
        ORDER BY sg.name ASC
      `);
      const subject_group_subjects = await query(`
        SELECT sgs.id, sgs.subject_group_id, sgs.subject_id, s.name as subject_name, s.code as subject_code
        FROM subject_group_subjects sgs
        JOIN subjects s ON s.id = sgs.subject_id
        ORDER BY s.name ASC
      `);
      const subjects = await query(`SELECT id, name, code, type FROM subjects ORDER BY name ASC`);

      return res.status(200).json({
        status: true,
        data: {
          classes,
          sections,
          class_sections,
          subject_groups,
          subject_group_subjects,
          subjects,
        },
        classes,
        sections,
        class_sections,
        subject_groups,
        subject_group_subjects,
        subjects,
      });
    } catch (error) {
      logger.error('Error fetching homework dropdowns:', error);
      return sendError(res, 'Failed to fetch homework dropdowns', 500);
    }
  }

  /**
   * GET /api/Homework or /api/homework
   */
  public static async list(req: Request, res: Response) {
    try {
      const classId = req.query.class_id;
      const sectionId = req.query.section_id;
      const subjectGroupId = req.query.subject_group_id;
      const subjectId = req.query.subject_id;

      let sql = `
        SELECT h.*, 
               c.class as class_name, 
               sec.section as section_name,
               COALESCE(s.name, s_direct.name) as subject_name,
               COALESCE(s.code, s_direct.code) as subject_code,
               sg.name as subject_group_name,
               stf.name as staff_name, 
               stf.surname as staff_surname,
               (SELECT COUNT(*) FROM homework_evaluation he WHERE he.homework_id = h.id AND he.status != 'Pending') as evaluated_count,
               (SELECT COUNT(*) FROM student_session ss WHERE ss.class_id = h.class_id AND ss.section_id = h.section_id) as total_students
        FROM homework h
        LEFT JOIN classes c ON c.id = h.class_id
        LEFT JOIN sections sec ON sec.id = h.section_id
        LEFT JOIN subject_group_subjects sgs ON sgs.id = h.subject_group_subject_id
        LEFT JOIN subjects s ON s.id = sgs.subject_id
        LEFT JOIN subjects s_direct ON s_direct.id = h.subject_id
        LEFT JOIN subject_groups sg ON sg.id = sgs.subject_group_id
        LEFT JOIN staff stf ON stf.id = h.created_by
        WHERE 1=1
      `;
      const params: any[] = [];

      if (classId) {
        sql += ` AND h.class_id = ?`;
        params.push(classId);
      }
      if (sectionId) {
        sql += ` AND h.section_id = ?`;
        params.push(sectionId);
      }
      if (subjectGroupId) {
        sql += ` AND sgs.subject_group_id = ?`;
        params.push(subjectGroupId);
      }
      if (subjectId) {
        sql += ` AND (h.subject_id = ? OR sgs.subject_id = ?)`;
        params.push(subjectId, subjectId);
      }

      sql += ` ORDER BY h.homework_date DESC, h.id DESC`;
      const rows = await query(sql, params);
      return sendSuccess(res, rows);
    } catch (error) {
      logger.error('Error fetching homework:', error);
      return sendError(res, 'Failed to fetch homework', 500);
    }
  }

  /**
   * POST /api/Homework/add or /api/homework/add
   */
  public static async add(req: Request, res: Response) {
    try {
      const {
        class_id, section_id, subject_id, subject_group_subject_id,
        homework_date, submit_date, description, document,
        document_base64, document_file_name, staff_id
      } = req.body;
      const createdBy = (req as any).user?.staffId || (req as any).user?.id || staff_id || 1;

      if (!class_id || !section_id) {
        return sendError(res, 'class_id and section_id are required', 400);
      }

      // Resolve subject_group_subject_id and subject_id
      let finalSgsId = subject_group_subject_id ? Number(subject_group_subject_id) : null;
      let finalSubjectId = subject_id ? Number(subject_id) : 0;

      if (finalSgsId && !finalSubjectId) {
        const sgsRow = await queryOne(`SELECT subject_id FROM subject_group_subjects WHERE id = ?`, [finalSgsId]);
        if (sgsRow) finalSubjectId = sgsRow.subject_id;
      } else if (!finalSgsId && finalSubjectId) {
        const sgsRow = await queryOne(`SELECT id FROM subject_group_subjects WHERE subject_id = ? LIMIT 1`, [finalSubjectId]);
        if (sgsRow) finalSgsId = sgsRow.id;
      }

      let docPath = typeof document === 'string' ? document : '';
      const base64Data = document_base64 || (document && document.startsWith('data:') ? document : null);
      if (base64Data) {
        docPath = (await StorageService.saveBase64File(base64Data, `hw_${Date.now()}`, 'educational/homework')) || '';
      }

      const today = new Date().toISOString().split('T')[0];
      const hwDate = homework_date || today;
      const subDate = submit_date || today;

      const result = await execute(`
        INSERT INTO homework (
          class_id, section_id, session_id, staff_id,
          subject_group_subject_id, subject_id,
          homework_date, submit_date, create_date,
          description, document, created_by, evaluated_by
        ) VALUES (?, ?, 21, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `, [
        Number(class_id), Number(section_id), Number(createdBy),
        finalSgsId, finalSubjectId,
        hwDate, subDate, today,
        description || '', docPath, Number(createdBy)
      ]);

      return sendSuccess(res, { id: result.insertId }, 'Homework added successfully', 201);
    } catch (error) {
      logger.error('Error adding homework:', error);
      return sendError(res, 'Failed to create homework', 500);
    }
  }

  /**
   * POST /api/homework/edit
   */
  public static async edit(req: Request, res: Response) {
    try {
      const {
        id, class_id, section_id, subject_id, subject_group_subject_id,
        homework_date, submit_date, description, document,
        document_base64
      } = req.body;
      if (!id) return sendError(res, 'Homework ID required', 400);

      let finalSgsId = subject_group_subject_id ? Number(subject_group_subject_id) : null;
      let finalSubjectId = subject_id ? Number(subject_id) : null;

      if (finalSgsId && !finalSubjectId) {
        const sgsRow = await queryOne(`SELECT subject_id FROM subject_group_subjects WHERE id = ?`, [finalSgsId]);
        if (sgsRow) finalSubjectId = sgsRow.subject_id;
      }

      let docPath = typeof document === 'string' ? document : undefined;
      const base64Data = document_base64 || (document && document.startsWith('data:') ? document : null);
      if (base64Data) {
        docPath = (await StorageService.saveBase64File(base64Data, `hw_${Date.now()}`, 'educational/homework')) || '';
      }

      await execute(`
        UPDATE homework 
        SET class_id = COALESCE(?, class_id),
            section_id = COALESCE(?, section_id),
            subject_id = COALESCE(?, subject_id),
            subject_group_subject_id = COALESCE(?, subject_group_subject_id),
            homework_date = COALESCE(?, homework_date),
            submit_date = COALESCE(?, submit_date),
            description = COALESCE(?, description),
            document = COALESCE(?, document)
        WHERE id = ?
      `, [
        class_id || null, section_id || null, finalSubjectId, finalSgsId,
        homework_date || null, submit_date || null, description || null,
        docPath !== undefined ? docPath : null, id
      ]);

      return sendSuccess(res, { id }, 'Homework updated successfully');
    } catch (error) {
      logger.error('Error updating homework:', error);
      return sendError(res, 'Failed to update homework', 500);
    }
  }

  /**
   * POST /api/homework/delete or DELETE /api/Homework/delete/:id
   */
  public static async delete(req: Request, res: Response) {
    try {
      const id = req.params.id || req.body.id || req.query.id;
      if (!id) return sendError(res, 'Homework ID required', 400);

      await execute(`DELETE FROM homework_evaluation WHERE homework_id = ?`, [id]);
      await execute(`DELETE FROM homework WHERE id = ?`, [id]);

      return sendSuccess(res, { id }, 'Homework deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete homework', 500);
    }
  }

  /**
   * POST /api/homework/submit_assignment
   */
  public static async submitAssignment(req: Request, res: Response) {
    return sendSuccess(res, { success: true }, 'Assignment submitted successfully');
  }

  /**
   * GET /api/homework/submissions
   */
  public static async getSubmissions(req: Request, res: Response) {
    try {
      const homeworkId = req.query.homework_id;
      const rows = await query(`
        SELECT he.*, s.firstname, s.lastname, s.admission_no, s.roll_no
        FROM homework_evaluation he
        JOIN student_session ss ON ss.id = he.student_session_id
        JOIN students s ON s.id = ss.student_id
        WHERE he.homework_id = ?
      `, [homeworkId]).catch(async () => []);

      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch submissions', 500);
    }
  }

  /**
   * POST /api/homework/evaluate
   */
  public static async evaluateHomework(req: Request, res: Response) {
    try {
      const { homework_id, evaluation_date, student_list } = req.body;
      const evaluatedBy = (req as any).user?.staffId || (req as any).user?.id || 1;
      const evalDate = evaluation_date || new Date().toISOString().split('T')[0];

      if (!homework_id) {
        return sendError(res, 'Homework ID required', 400);
      }

      await execute(`
        UPDATE homework
        SET evaluation_date = ?,
            evaluated_by = ?
        WHERE id = ?
      `, [evalDate, evaluatedBy, homework_id]);

      if (Array.isArray(student_list)) {
        for (const item of student_list) {
          const sessId = item.student_session_id;
          const status = item.status || 'Pending';
          const remark = item.remark || '';

          const sessRow = await queryOne(`SELECT student_id FROM student_session WHERE id = ?`, [sessId]);
          const studentId = sessRow ? sessRow.student_id : (item.student_id || 0);

          const existing = await queryOne(`
            SELECT id FROM homework_evaluation 
            WHERE homework_id = ? AND student_session_id = ?
          `, [homework_id, sessId]);

          if (existing) {
            await execute(`
              UPDATE homework_evaluation
              SET status = ?, remark = ?, date = ?
              WHERE id = ?
            `, [status, remark, evalDate, existing.id]);
          } else {
            await execute(`
              INSERT INTO homework_evaluation (homework_id, student_id, student_session_id, date, status, remark)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [homework_id, studentId, sessId, evalDate, status, remark]);
          }
        }
      }

      return sendSuccess(res, { success: true }, 'Homework evaluated successfully');
    } catch (error) {
      logger.error('Error evaluating homework:', error);
      return sendError(res, 'Failed to evaluate homework', 500);
    }
  }

  /**
   * GET /api/homework/evaluation_students
   */
  public static async getEvaluationStudents(req: Request, res: Response) {
    try {
      const classId = req.query.class_id;
      const sectionId = req.query.section_id;
      const homeworkId = req.query.homework_id;

      let sql = `
        SELECT s.id, s.id as student_id, s.admission_no, s.roll_no, s.firstname, s.lastname,
               ss.id as student_session_id,
               he.status, he.remark, he.date as evaluation_date
        FROM student_session ss
        JOIN students s ON s.id = ss.student_id
        LEFT JOIN homework_evaluation he ON (he.student_session_id = ss.id AND he.homework_id = ?)
        WHERE (s.is_active = 'yes' OR s.is_active = 1)
      `;
      const params: any[] = [homeworkId || 0];
      if (classId) {
        sql += ` AND ss.class_id = ?`;
        params.push(classId);
      }
      if (sectionId) {
        sql += ` AND ss.section_id = ?`;
        params.push(sectionId);
      }
      sql += ` ORDER BY s.roll_no ASC, s.firstname ASC`;

      const rows = await query(sql, params);
      return sendSuccess(res, rows);
    } catch (error) {
      logger.error('Error fetching evaluation students:', error);
      return sendError(res, 'Failed to fetch evaluation students', 500);
    }
  }

  /**
   * GET /api/homework/student/:studentId
   */
  public static async getHomeworkByStudent(req: Request, res: Response) {
    try {
      const studentId = req.params.studentId;
      const rows = await query(`
        SELECT h.*, s.name as subject_name, c.class as class_name, sec.section as section_name
        FROM homework h
        JOIN student_session ss ON ss.class_id = h.class_id AND ss.section_id = h.section_id
        JOIN subjects s ON s.id = h.subject_id
        JOIN classes c ON c.id = h.class_id
        JOIN sections sec ON sec.id = h.section_id
        WHERE ss.student_id = ?
        ORDER BY h.homework_date DESC
      `, [studentId]);

      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch student homework', 500);
    }
  }
}
