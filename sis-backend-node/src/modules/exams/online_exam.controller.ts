import { Request, Response } from 'express';
import { query, queryOne, execute, transaction } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export class OnlineExamController {
  /**
   * GET /api/Onlineexam or /api/exams/online-exams
   */
  public static async list(req: Request, res: Response) {
    try {
      const rows = await query(`
        SELECT oe.*, 
               (SELECT COUNT(*) FROM onlineexam_questions oeq WHERE oeq.onlineexam_id = oe.id) as total_questions,
               (SELECT COUNT(*) FROM onlineexam_students oes WHERE oes.onlineexam_id = oe.id) as total_students,
               (SELECT COUNT(DISTINCT oea.onlineexam_student_id) FROM onlineexam_attempts oea 
                JOIN onlineexam_students oes ON oes.id = oea.onlineexam_student_id 
                WHERE oes.onlineexam_id = oe.id) as total_attempts
        FROM onlineexam oe
        ORDER BY oe.id DESC
      `);
      return sendSuccess(res, rows);
    } catch (error) {
      logger.error('Error fetching online exams:', error);
      return sendError(res, 'Failed to fetch online exams', 500);
    }
  }

  /**
   * POST /api/exams/online-exams or /api/Onlineexam
   */
  public static async create(req: Request, res: Response) {
    try {
      const { exam, attempt, exam_from, exam_to, time_from, time_to, duration, passing_percentage, description, session_id, publish_result, is_active } = req.body;
      if (!exam) return sendError(res, 'Exam title is required', 400);

      const result = await execute(`
        INSERT INTO onlineexam (exam, attempt, exam_from, exam_to, time_from, time_to, duration, passing_percentage, description, session_id, publish_result, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        exam, 
        attempt || 1, 
        exam_from || null, 
        exam_to || null, 
        time_from || null, 
        time_to || null, 
        duration || '01:00', 
        passing_percentage || 40, 
        description || '', 
        session_id || 21, 
        publish_result ? 1 : 0, 
        is_active || 'yes'
      ]);

      return sendSuccess(res, { id: result.insertId, exam }, 'Online exam created successfully', 201);
    } catch (error) {
      logger.error('Error creating online exam:', error);
      return sendError(res, 'Failed to create online exam', 500);
    }
  }

  /**
   * PUT /api/exams/online-exams/:id or /api/Onlineexam/:id
   */
  public static async update(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const { exam, attempt, exam_from, exam_to, time_from, time_to, duration, passing_percentage, description, publish_result, is_active } = req.body;
      if (!id) return sendError(res, 'Exam ID is required', 400);

      await execute(`
        UPDATE onlineexam
        SET exam = COALESCE(?, exam),
            attempt = COALESCE(?, attempt),
            exam_from = ?,
            exam_to = ?,
            time_from = ?,
            time_to = ?,
            duration = COALESCE(?, duration),
            passing_percentage = COALESCE(?, passing_percentage),
            description = COALESCE(?, description),
            publish_result = COALESCE(?, publish_result),
            is_active = COALESCE(?, is_active),
            updated_at = CURDATE()
        WHERE id = ?
      `, [
        exam, 
        attempt, 
        exam_from || null, 
        exam_to || null, 
        time_from || null, 
        time_to || null, 
        duration, 
        passing_percentage, 
        description, 
        publish_result !== undefined ? (publish_result ? 1 : 0) : null, 
        is_active, 
        id
      ]);

      return sendSuccess(res, { id }, 'Online exam updated successfully');
    } catch (error) {
      logger.error('Error updating online exam:', error);
      return sendError(res, 'Failed to update online exam', 500);
    }
  }

  /**
   * DELETE /api/exams/online-exams/:id or /api/Onlineexam/:id
   */
  public static async delete(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return sendError(res, 'Exam ID is required', 400);

      await execute(`DELETE FROM onlineexam_questions WHERE onlineexam_id = ?`, [id]);
      await execute(`DELETE FROM onlineexam_students WHERE onlineexam_id = ?`, [id]);
      await execute(`DELETE FROM onlineexam WHERE id = ?`, [id]);

      return sendSuccess(res, { id }, 'Online exam deleted successfully');
    } catch (error) {
      logger.error('Error deleting online exam:', error);
      return sendError(res, 'Failed to delete online exam', 500);
    }
  }

  /**
   * POST /api/exams/online-exams/publish or /api/Onlineexam/publish
   */
  public static async publishResult(req: Request, res: Response) {
    try {
      const { id, publish_result } = req.body;
      if (!id) return sendError(res, 'Exam ID is required', 400);

      const val = publish_result ? 1 : 0;
      await execute(`UPDATE onlineexam SET publish_result = ? WHERE id = ?`, [val, id]);

      return sendSuccess(res, { id, publish_result: val }, `Results ${val ? 'published' : 'unpublished'} successfully`);
    } catch (error) {
      logger.error('Error publishing exam results:', error);
      return sendError(res, 'Failed to update publish state', 500);
    }
  }

  /**
   * GET /api/Onlineexam/:id or /api/exams/online-exams/:id
   */
  public static async detail(req: Request, res: Response) {
    try {
      const id = req.params.id || req.query.id;
      const exam = await queryOne(`SELECT * FROM onlineexam WHERE id = ?`, [id]);
      if (!exam) return sendError(res, 'Online exam not found', 404);

      const questions = await query(`
        SELECT q.*, oeq.id as exam_question_id
        FROM onlineexam_questions oeq
        JOIN questions q ON q.id = oeq.question_id
        WHERE oeq.onlineexam_id = ?
        ORDER BY oeq.id ASC
      `, [id]);

      exam.questions = questions;
      return sendSuccess(res, exam);
    } catch (error) {
      return sendError(res, 'Failed to fetch exam details', 500);
    }
  }

  // ==========================================
  // QUESTIONS LINKING TO EXAM
  // ==========================================

  /**
   * GET /api/exams/online-exams/:id/questions
   */
  public static async getExamQuestions(req: Request, res: Response) {
    try {
      const examId = req.params.id || req.query.exam_id;
      const rows = await query(`
        SELECT q.*, s.name as subject_name, oeq.id as exam_question_id
        FROM onlineexam_questions oeq
        JOIN questions q ON q.id = oeq.question_id
        LEFT JOIN subjects s ON s.id = q.subject_id
        WHERE oeq.onlineexam_id = ?
        ORDER BY oeq.id ASC
      `, [examId]);

      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch exam questions', 500);
    }
  }

  /**
   * POST /api/exams/online-exams/questions/assign
   */
  public static async assignQuestions(req: Request, res: Response) {
    try {
      const { onlineexam_id, question_ids } = req.body;
      if (!onlineexam_id || !Array.isArray(question_ids) || question_ids.length === 0) {
        return sendError(res, 'onlineexam_id and question_ids are required', 400);
      }

      for (const qId of question_ids) {
        const exists = await queryOne(`SELECT id FROM onlineexam_questions WHERE onlineexam_id = ? AND question_id = ?`, [onlineexam_id, qId]);
        if (!exists) {
          await execute(`
            INSERT INTO onlineexam_questions (onlineexam_id, question_id, session_id, is_active)
            VALUES (?, ?, 21, 'yes')
          `, [onlineexam_id, qId]);
        }
      }

      return sendSuccess(res, null, `${question_ids.length} questions linked to examination`);
    } catch (error) {
      logger.error('Error assigning questions to exam:', error);
      return sendError(res, 'Failed to assign questions', 500);
    }
  }

  /**
   * DELETE /api/exams/online-exams/questions/:examQuestionId
   */
  public static async removeQuestion(req: Request, res: Response) {
    try {
      const id = req.params.examQuestionId;
      await execute(`DELETE FROM onlineexam_questions WHERE id = ?`, [id]);
      return sendSuccess(res, { id }, 'Question removed from examination');
    } catch (error) {
      return sendError(res, 'Failed to remove question', 500);
    }
  }

  // ==========================================
  // STUDENTS ASSIGNMENT TO EXAM
  // ==========================================

  /**
   * GET /api/exams/online-exams/:id/students
   */
  public static async getExamStudents(req: Request, res: Response) {
    try {
      const examId = req.params.id || req.query.exam_id;
      const rows = await query(`
        SELECT oes.id as onlineexam_student_id, oes.onlineexam_id, oes.student_session_id,
               s.id as student_id, s.admission_no, s.roll_no, s.firstname, s.lastname, s.gender,
               c.class, sec.section,
               (SELECT COUNT(*) FROM onlineexam_attempts oea WHERE oea.onlineexam_student_id = oes.id) as attempts_count,
               (SELECT COUNT(*) FROM onlineexam_student_results oesr 
                JOIN onlineexam_questions oeq ON oeq.id = oesr.onlineexam_question_id
                JOIN questions q ON q.id = oeq.question_id
                WHERE oesr.onlineexam_student_id = oes.id AND oesr.select_option = q.correct) as correct_answers,
               (SELECT COUNT(*) FROM onlineexam_questions oeq WHERE oeq.onlineexam_id = oes.onlineexam_id) as total_questions
        FROM onlineexam_students oes
        JOIN student_session ss ON ss.id = oes.student_session_id
        JOIN students s ON s.id = ss.student_id
        LEFT JOIN classes c ON c.id = ss.class_id
        LEFT JOIN sections sec ON sec.id = ss.section_id
        WHERE oes.onlineexam_id = ?
        ORDER BY s.firstname ASC, s.lastname ASC
      `, [examId]);

      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch exam students', 500);
    }
  }

  /**
   * POST /api/exams/online-exams/students/assign-class
   */
  public static async assignClassStudents(req: Request, res: Response) {
    try {
      const { onlineexam_id, class_id, section_id, action = 'assign' } = req.body;
      if (!onlineexam_id || !class_id) {
        return sendError(res, 'onlineexam_id and class_id are required', 400);
      }

      let studentQuery = `
        SELECT ss.id as student_session_id
        FROM student_session ss
        JOIN students s ON s.id = ss.student_id
        WHERE ss.class_id = ?
      `;
      const params: any[] = [class_id];
      if (section_id) {
        studentQuery += ` AND ss.section_id = ?`;
        params.push(section_id);
      }

      const students = await query(studentQuery, params);
      if (!students.length) {
        return sendSuccess(res, { count: 0 }, 'No students found in selected class/section');
      }

      const sessionIds = students.map((s: any) => s.student_session_id);

      if (action === 'unassign') {
        const placeholders = sessionIds.map(() => '?').join(',');
        await execute(
          `DELETE FROM onlineexam_students WHERE onlineexam_id = ? AND student_session_id IN (${placeholders})`,
          [onlineexam_id, ...sessionIds]
        );
        return sendSuccess(res, { count: sessionIds.length }, `Successfully unassigned ${sessionIds.length} students`);
      }

      let addedCount = 0;
      for (const ssId of sessionIds) {
        const exists = await queryOne(
          `SELECT id FROM onlineexam_students WHERE onlineexam_id = ? AND student_session_id = ?`,
          [onlineexam_id, ssId]
        );
        if (!exists) {
          await execute(
            `INSERT INTO onlineexam_students (onlineexam_id, student_session_id) VALUES (?, ?)`,
            [onlineexam_id, ssId]
          );
          addedCount++;
        }
      }

      return sendSuccess(res, { count: addedCount }, `Successfully enrolled ${addedCount} students into the online exam`);
    } catch (error) {
      logger.error('Error assigning class students to online exam:', error);
      return sendError(res, 'Failed to assign class students', 500);
    }
  }

  /**
   * GET /api/exams/online-exams/:id/results
   */
  public static async getExamResults(req: Request, res: Response) {
    try {
      const examId = req.params.id || req.query.exam_id;
      const exam = await queryOne(`SELECT * FROM onlineexam WHERE id = ?`, [examId]);
      if (!exam) return sendError(res, 'Exam not found', 404);

      const students = await query(`
        SELECT oes.id as onlineexam_student_id, s.id as student_id, s.admission_no, s.roll_no,
               s.firstname, s.lastname, c.class, sec.section,
               (SELECT COUNT(*) FROM onlineexam_attempts oea WHERE oea.onlineexam_student_id = oes.id) as attempts_made,
               (SELECT COUNT(*) FROM onlineexam_student_results oesr 
                JOIN onlineexam_questions oeq ON oeq.id = oesr.onlineexam_question_id
                JOIN questions q ON q.id = oeq.question_id
                WHERE oesr.onlineexam_student_id = oes.id AND oesr.select_option = q.correct) as correct_count,
               (SELECT COUNT(*) FROM onlineexam_student_results oesr WHERE oesr.onlineexam_student_id = oes.id) as answered_count,
               (SELECT COUNT(*) FROM onlineexam_questions oeq WHERE oeq.onlineexam_id = oes.onlineexam_id) as total_questions
        FROM onlineexam_students oes
        JOIN student_session ss ON ss.id = oes.student_session_id
        JOIN students s ON s.id = ss.student_id
        LEFT JOIN classes c ON c.id = ss.class_id
        LEFT JOIN sections sec ON sec.id = ss.section_id
        WHERE oes.onlineexam_id = ?
        ORDER BY correct_count DESC, s.firstname ASC
      `, [examId]);

      const results = students.map((st: any) => {
        const total = st.total_questions || 0;
        const correct = st.correct_count || 0;
        const percentage = total > 0 ? Number(((correct / total) * 100).toFixed(2)) : 0;
        const isPass = percentage >= (exam.passing_percentage || 40);
        return {
          ...st,
          score: correct,
          total_marks: total,
          percentage,
          is_pass: isPass,
          status: st.attempts_made > 0 ? 'Submitted' : 'Pending'
        };
      });

      return sendSuccess(res, { exam, results });
    } catch (error) {
      return sendError(res, 'Failed to fetch exam results', 500);
    }
  }

  // ==========================================
  // QUESTION BANK CRUD
  // ==========================================

  /**
   * GET /api/Question or /api/exams/questions
   */
  public static async questionBank(req: Request, res: Response) {
    try {
      const subjectId = req.query.subject_id;
      const search = req.query.search;
      let sql = `
        SELECT q.*, s.name as subject_name
        FROM questions q
        LEFT JOIN subjects s ON s.id = q.subject_id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (subjectId) {
        sql += ` AND q.subject_id = ?`;
        params.push(subjectId);
      }
      if (search) {
        sql += ` AND (q.question LIKE ? OR q.opt_a LIKE ? OR q.opt_b LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      sql += ` ORDER BY q.id DESC`;

      const rows = await query(sql, params);
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch question bank', 500);
    }
  }

  /**
   * POST /api/exams/questions
   */
  public static async addQuestion(req: Request, res: Response) {
    try {
      const { subject_id, question, opt_a, opt_b, opt_c, opt_d, opt_e, correct } = req.body;
      if (!question || !subject_id) {
        return sendError(res, 'Question and subject_id required', 400);
      }

      const result = await execute(`
        INSERT INTO questions (subject_id, question, opt_a, opt_b, opt_c, opt_d, opt_e, correct)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        subject_id, 
        question, 
        opt_a || '', 
        opt_b || '', 
        opt_c || '', 
        opt_d || '', 
        opt_e || '', 
        correct || 'opt_a'
      ]);

      return sendSuccess(res, { id: result.insertId }, 'Question added to Question Bank successfully', 201);
    } catch (error) {
      logger.error('Error adding question:', error);
      return sendError(res, 'Failed to add question', 500);
    }
  }

  /**
   * PUT /api/exams/questions/:id
   */
  public static async updateQuestion(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const { subject_id, question, opt_a, opt_b, opt_c, opt_d, opt_e, correct } = req.body;
      if (!id) return sendError(res, 'Question ID is required', 400);

      await execute(`
        UPDATE questions
        SET subject_id = COALESCE(?, subject_id),
            question = COALESCE(?, question),
            opt_a = COALESCE(?, opt_a),
            opt_b = COALESCE(?, opt_b),
            opt_c = COALESCE(?, opt_c),
            opt_d = COALESCE(?, opt_d),
            opt_e = COALESCE(?, opt_e),
            correct = COALESCE(?, correct),
            updated_at = CURDATE()
        WHERE id = ?
      `, [subject_id, question, opt_a, opt_b, opt_c, opt_d, opt_e, correct, id]);

      return sendSuccess(res, { id }, 'Question updated successfully');
    } catch (error) {
      logger.error('Error updating question:', error);
      return sendError(res, 'Failed to update question', 500);
    }
  }

  /**
   * DELETE /api/exams/questions/:id
   */
  public static async deleteQuestion(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return sendError(res, 'Question ID required', 400);

      await execute(`DELETE FROM onlineexam_questions WHERE question_id = ?`, [id]);
      await execute(`DELETE FROM questions WHERE id = ?`, [id]);
      return sendSuccess(res, { id }, 'Question deleted from Question Bank successfully');
    } catch (error) {
      logger.error('Error deleting question:', error);
      return sendError(res, 'Failed to delete question', 500);
    }
  }

  // ==========================================
  // STUDENT & PARENT PORTAL APIS
  // ==========================================

  /**
   * GET /api/Onlineexam/student or /api/student/onlineexam
   */
  public static async studentAssignedExams(req: Request, res: Response) {
    try {
      const studentSessionId = req.query.student_session_id || req.query.studentId;
      let sql = `
        SELECT oe.*, oes.id as onlineexam_student_id,
               (SELECT COUNT(*) FROM onlineexam_questions oeq WHERE oeq.onlineexam_id = oe.id) as total_questions,
               (SELECT COUNT(*) FROM onlineexam_attempts oea WHERE oea.onlineexam_student_id = oes.id) as attempts_made,
               (SELECT COUNT(*) FROM onlineexam_student_results oesr 
                JOIN onlineexam_questions oeq ON oeq.id = oesr.onlineexam_question_id
                JOIN questions q ON q.id = oeq.question_id
                WHERE oesr.onlineexam_student_id = oes.id AND oesr.select_option = q.correct) as correct_count
        FROM onlineexam oe
        JOIN onlineexam_students oes ON oes.onlineexam_id = oe.id
        WHERE (oe.is_active = 'yes' OR oe.is_active = '1' OR oe.is_active = 1)
      `;
      const params: any[] = [];
      if (studentSessionId) {
        sql += ` AND oes.student_session_id = ?`;
        params.push(studentSessionId);
      }
      sql += ` ORDER BY oe.id DESC`;

      const rows = await query(sql, params).catch(() => []);
      
      const mapped = rows.map((r: any) => {
        const total = r.total_questions || 0;
        const correct = r.correct_count || 0;
        const percentage = total > 0 ? Number(((correct / total) * 100).toFixed(2)) : 0;
        const isPass = percentage >= (r.passing_percentage || 40);
        return {
          ...r,
          score: correct,
          total_marks: total,
          percentage,
          is_passed: isPass,
          student_status: r.attempts_made > 0 ? 'Submitted' : 'Pending'
        };
      });

      return sendSuccess(res, mapped);
    } catch (error) {
      return sendError(res, 'Failed to fetch student online exams', 500);
    }
  }

  /**
   * GET /api/exams/online-exams/student/take/:examId
   */
  public static async getExamForStudent(req: Request, res: Response) {
    try {
      const examId = req.params.examId;
      const studentSessionId = req.query.student_session_id;

      const exam = await queryOne(`SELECT * FROM onlineexam WHERE id = ?`, [examId]);
      if (!exam) return sendError(res, 'Exam not found', 404);

      // Verify student is enrolled
      if (studentSessionId) {
        const enrolled = await queryOne(
          `SELECT id FROM onlineexam_students WHERE onlineexam_id = ? AND student_session_id = ?`,
          [examId, studentSessionId]
        );
        if (!enrolled) {
          return sendError(res, 'You are not enrolled in this online examination', 403);
        }
      }

      // Fetch questions WITHOUT exposing `correct` option to student during test
      const questions = await query(`
        SELECT oeq.id as onlineexam_question_id, q.id as question_id, q.question, 
               q.opt_a, q.opt_b, q.opt_c, q.opt_d, q.opt_e, s.name as subject_name
        FROM onlineexam_questions oeq
        JOIN questions q ON q.id = oeq.question_id
        LEFT JOIN subjects s ON s.id = q.subject_id
        WHERE oeq.onlineexam_id = ?
        ORDER BY oeq.id ASC
      `, [examId]);

      return sendSuccess(res, {
        exam,
        questions
      });
    } catch (error) {
      return sendError(res, 'Failed to load exam questions for student', 500);
    }
  }

  /**
   * POST /api/exams/online-exams/student/submit
   */
  public static async submitStudentExam(req: Request, res: Response) {
    try {
      const { onlineexam_id, student_session_id, answers } = req.body;
      if (!onlineexam_id || !student_session_id || !answers) {
        return sendError(res, 'Missing required submission fields', 400);
      }

      // 1. Get or create onlineexam_students record
      let oes = await queryOne(
        `SELECT id FROM onlineexam_students WHERE onlineexam_id = ? AND student_session_id = ?`,
        [onlineexam_id, student_session_id]
      );
      if (!oes) {
        const ins = await execute(
          `INSERT INTO onlineexam_students (onlineexam_id, student_session_id) VALUES (?, ?)`,
          [onlineexam_id, student_session_id]
        );
        oes = { id: ins.insertId };
      }

      const oesId = oes.id;

      // 2. Insert attempt
      await execute(
        `INSERT INTO onlineexam_attempts (onlineexam_student_id, created_at, updated_at) VALUES (?, NOW(), CURDATE())`,
        [oesId]
      );

      // 3. Save student answers & calculate score
      await execute(`DELETE FROM onlineexam_student_results WHERE onlineexam_student_id = ?`, [oesId]);

      let score = 0;
      const examQuestions = await query(`
        SELECT oeq.id as exam_question_id, q.correct
        FROM onlineexam_questions oeq
        JOIN questions q ON q.id = oeq.question_id
        WHERE oeq.onlineexam_id = ?
      `, [onlineexam_id]);

      const correctMap = new Map<number, string>();
      examQuestions.forEach((eq: any) => correctMap.set(eq.exam_question_id, eq.correct));

      for (const [eqIdStr, selectedOption] of Object.entries(answers)) {
        const eqId = Number(eqIdStr);
        if (selectedOption) {
          await execute(`
            INSERT INTO onlineexam_student_results (onlineexam_student_id, onlineexam_question_id, select_option)
            VALUES (?, ?, ?)
          `, [oesId, eqId, selectedOption]);

          if (correctMap.get(eqId) === selectedOption) {
            score++;
          }
        }
      }

      const total = examQuestions.length;
      const percentage = total > 0 ? Number(((score / total) * 100).toFixed(2)) : 0;
      const exam = await queryOne(`SELECT passing_percentage, publish_result FROM onlineexam WHERE id = ?`, [onlineexam_id]);
      const isPass = percentage >= (exam?.passing_percentage || 40);

      return sendSuccess(res, {
        score,
        total,
        percentage,
        is_pass: isPass,
        publish_result: exam?.publish_result || 0
      }, 'Examination submitted successfully!');
    } catch (error) {
      logger.error('Error submitting online exam:', error);
      return sendError(res, 'Failed to submit examination', 500);
    }
  }
}
