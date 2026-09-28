import { Request, Response } from 'express';
import { query, queryOne, execute, transaction } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export class AcademicsController {
  /**
   * GET /api/Academics/stats
   */
  public static async stats(req: Request, res: Response) {
    try {
      const studentCount = await queryOne(`SELECT COUNT(*) as total FROM students WHERE is_active = 'yes' OR is_active = 1`);
      const teacherCount = await queryOne(`SELECT COUNT(*) as total FROM staff WHERE is_active = 1`);
      const classCount = await queryOne(`SELECT COUNT(*) as total FROM classes`);
      const sectionCount = await queryOne(`SELECT COUNT(*) as total FROM sections`);

      return res.json({
        status: true,
        total_students: studentCount?.total || 0,
        total_teachers: teacherCount?.total || 0,
        total_classes: classCount?.total || 0,
        total_sections: sectionCount?.total || 0,
      });
    } catch (error) {
      logger.error('Error in AcademicsController.stats:', error);
      return sendError(res, 'Failed to fetch academic stats', 500);
    }
  }

  /**
   * GET /api/Academics/teachers
   */
  public static async teachers(req: Request, res: Response) {
    try {
      const teachers = await query(`
        SELECT DISTINCT s.id, s.employee_id, s.name, s.surname, s.email, s.contact_no, s.gender, COALESCE(r.name, 'Teacher') as role
        FROM staff s
        LEFT JOIN staff_roles sr ON sr.staff_id = s.id
        LEFT JOIN roles r ON r.id = sr.role_id
        WHERE s.is_active = 1 AND (LOWER(COALESCE(r.name, '')) LIKE '%teacher%' OR LOWER(COALESCE(r.name, '')) LIKE '%faculty%' OR sr.role_id = 2 OR sr.role_id IS NULL)
        ORDER BY s.name ASC
      `);
      return sendSuccess(res, teachers);
    } catch (error) {
      logger.error('Error fetching teachers:', error);
      return sendError(res, 'Failed to fetch teachers', 500);
    }
  }

  /**
   * GET /api/Academics/timetables
   */
  public static async timetables(req: Request, res: Response) {
    try {
      const results = await query(`
        SELECT st.*, 
               c.class as className, 
               s.section as sectionName, 
               COALESCE(sub.name, sub_direct.name) as subjectName,
               COALESCE(sub.code, sub_direct.code) as subjectCode,
               stf.name as staffName, 
               stf.surname as staffSurname, 
               stf.email as staffEmail
        FROM subject_timetable st
        LEFT JOIN classes c ON c.id = st.class_id
        LEFT JOIN sections s ON s.id = st.section_id
        LEFT JOIN subject_group_subjects sgs ON sgs.id = st.subject_group_subject_id
        LEFT JOIN subjects sub ON sub.id = sgs.subject_id
        LEFT JOIN subjects sub_direct ON sub_direct.id = st.subject_group_id
        LEFT JOIN staff stf ON stf.id = st.staff_id
        ORDER BY st.id ASC
      `);

      const formatted = results.map((row) => {
        const isExplicitBreak = Boolean(
          (row.room_no && /break|lunch|recess|assembly|activity|interval/i.test(row.room_no)) ||
          (row.subjectName && /break|lunch|recess|assembly|activity|interval/i.test(row.subjectName))
        );
        const hasTeacher = Boolean(row.staff_id || row.staffName);
        const isBreak = isExplicitBreak || (!hasTeacher && !row.subjectName);

        let period = row.time_from || 'Period 1';
        if (/09:00/i.test(row.time_from)) period = 'Period 1';
        else if (/10:00/i.test(row.time_from)) period = 'Period 2';
        else if (/11:00/i.test(row.time_from)) period = 'Period 3';
        else if (/12:00/i.test(row.time_from)) period = 'Period 4';
        else if (/01:00|13:00/i.test(row.time_from)) period = 'Period 5';
        else if (/02:00|14:00/i.test(row.time_from)) period = 'Period 6';
        else if (/03:00|15:00/i.test(row.time_from)) period = 'Period 7';
        else if (/04:00|16:00/i.test(row.time_from)) period = 'Period 8';

        const subjectTitle = row.subjectName || (isBreak ? (row.room_no || 'Break') : (hasTeacher ? 'Teaching Period' : 'Period'));

        return {
          id: row.id,
          staff_id: row.staff_id,
          class_id: row.class_id,
          section_id: row.section_id,
          className: row.className,
          section: row.sectionName,
          day: row.day,
          period,
          subject: isBreak ? (row.subjectName || row.room_no || 'Break') : subjectTitle,
          teacher: [row.staffName, row.staffSurname].filter(Boolean).join(' '),
          teacher_email: row.staffEmail || '',
          room: isBreak ? '' : row.room_no,
          time_from: row.time_from,
          time_to: row.time_to,
          is_break: isBreak,
        };
      });

      return res.json({ status: true, data: formatted });
    } catch (error) {
      logger.error('Error fetching timetables:', error);
      return sendError(res, 'Failed to fetch timetables', 500);
    }
  }

  /**
   * GET / POST / PUT / DELETE /api/Academics/classes
   */
  public static async classes(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || req.query.id || req.body?.id;

    try {
      if (method === 'GET') {
        if (id) {
          const cls = await queryOne(`SELECT * FROM classes WHERE id = ?`, [id]);
          if (!cls) return sendError(res, 'Class not found', 404);

          const sections = await query(`
            SELECT s.id, s.section, cs.id as class_section_id
            FROM class_sections cs
            JOIN sections s ON s.id = cs.section_id
            WHERE cs.class_id = ?
          `, [id]);
          cls.sections = sections;
          return sendSuccess(res, cls);
        }

        const classes = await query(`SELECT * FROM classes ORDER BY id ASC`);
        for (const c of classes) {
          const sections = await query(`
            SELECT s.id, s.section, cs.id as class_section_id
            FROM class_sections cs
            JOIN sections s ON s.id = cs.section_id
            WHERE cs.class_id = ?
          `, [c.id]);
          c.sections = sections;
        }
        return sendSuccess(res, classes);
      }

      if (method === 'POST' || method === 'PUT') {
        const { id: classId, className, class: classTitle, sections, is_active, status } = req.body;
        const name = classTitle || className;
        const targetId = classId || id;
        const activeStatus = is_active || (status === 'Active' ? 'yes' : (status === 'Inactive' ? 'no' : 'yes'));

        let finalClassId = targetId;

        if (targetId) {
          if (name) {
            await execute(`UPDATE classes SET \`class\` = ?, is_active = ? WHERE id = ?`, [name, activeStatus, targetId]);
          }
          if (Array.isArray(sections)) {
            await execute(`DELETE FROM class_sections WHERE class_id = ?`, [targetId]);
            for (const secId of sections) {
              if (secId) {
                await execute(`INSERT INTO class_sections (class_id, section_id, is_active) VALUES (?, ?, ?)`, [targetId, secId, activeStatus]);
              }
            }
          }
          return sendSuccess(res, { id: targetId, class: name }, 'Class updated successfully');
        } else {
          if (!name) return sendError(res, 'Class name is required', 400);

          const result = await execute(`INSERT INTO classes (\`class\`, is_active) VALUES (?, ?)`, [name, activeStatus]);
          finalClassId = result.insertId;

          if (Array.isArray(sections)) {
            for (const secId of sections) {
              if (secId) {
                await execute(`INSERT INTO class_sections (class_id, section_id, is_active) VALUES (?, ?, ?)`, [finalClassId, secId, activeStatus]);
              }
            }
          }

          return sendSuccess(res, { id: finalClassId, class: name }, 'Class created successfully', 201);
        }
      }

      if (method === 'DELETE') {
        const delId = id || req.params.id || req.query.id || req.body?.id;
        if (!delId) return sendError(res, 'Class ID required', 400);

        await execute(`DELETE FROM subject_group_class_sections WHERE class_section_id IN (SELECT id FROM class_sections WHERE class_id = ?)`, [delId]);
        await execute(`DELETE FROM class_teacher WHERE class_id = ?`, [delId]);
        await execute(`DELETE FROM class_sections WHERE class_id = ?`, [delId]);
        await execute(`DELETE FROM classes WHERE id = ?`, [delId]);
        return sendSuccess(res, { success: true }, 'Class deleted successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      logger.error('Error in classes handler:', error);
      return sendError(res, 'Error processing class request', 500);
    }
  }

  /**
   * GET / POST / PUT / DELETE /api/Academics/sections
   */
  public static async sections(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || req.query.id || req.body?.id;

    try {
      if (method === 'GET') {
        if (id) {
          const section = await queryOne(`SELECT * FROM sections WHERE id = ?`, [id]);
          if (!section) return sendError(res, 'Section not found', 404);
          return sendSuccess(res, section);
        }
        const sections = await query(`SELECT * FROM sections ORDER BY section ASC`);
        return sendSuccess(res, sections);
      }

      if (method === 'POST' || method === 'PUT') {
        const { id: secId, section, is_active, status } = req.body;
        const targetId = secId || id;
        const activeStatus = is_active || (status === 'Active' ? 'yes' : (status === 'Inactive' ? 'no' : 'yes'));

        if (targetId) {
          if (!section) return sendError(res, 'Section name is required', 400);
          await execute(`UPDATE sections SET section = ?, is_active = ? WHERE id = ?`, [section, activeStatus, targetId]);
          return sendSuccess(res, { id: targetId, section }, 'Section updated successfully');
        } else {
          if (!section) return sendError(res, 'Section name is required', 400);
          const result = await execute(`INSERT INTO sections (section, is_active) VALUES (?, ?)`, [section, activeStatus]);
          return sendSuccess(res, { id: result.insertId, section }, 'Section created successfully', 201);
        }
      }

      if (method === 'DELETE') {
        const delId = id || req.params.id || req.query.id || req.body?.id;
        if (!delId) return sendError(res, 'Section ID required', 400);

        await execute(`DELETE FROM subject_group_class_sections WHERE class_section_id IN (SELECT id FROM class_sections WHERE section_id = ?)`, [delId]);
        await execute(`DELETE FROM class_teacher WHERE section_id = ?`, [delId]);
        await execute(`DELETE FROM class_sections WHERE section_id = ?`, [delId]);
        await execute(`DELETE FROM sections WHERE id = ?`, [delId]);
        return sendSuccess(res, { success: true }, 'Section deleted successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      logger.error('Error in sections handler:', error);
      return sendError(res, 'Error processing section request', 500);
    }
  }

  /**
   * GET / POST / PUT / DELETE /api/Academics/subjects
   */
  public static async subjects(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || req.query.id || req.body?.id;

    try {
      if (method === 'GET') {
        const rows = await query(`SELECT * FROM subjects ORDER BY name ASC`);
        return sendSuccess(res, rows);
      }

      if (method === 'POST' || method === 'PUT') {
        const { id: subId, name, code, type, is_active, status } = req.body;
        const targetId = subId || id;
        const activeStatus = is_active || (status === 'Active' ? 'yes' : (status === 'Inactive' ? 'no' : 'yes'));

        if (!name) return sendError(res, 'Subject name is required', 400);

        if (targetId) {
          await execute(
            `UPDATE subjects SET name = ?, code = ?, type = ?, is_active = ? WHERE id = ?`,
            [name, code || '', type || 'Theory', activeStatus, targetId]
          );
          return sendSuccess(res, { id: targetId, name, code, type }, 'Subject updated successfully');
        } else {
          const result = await execute(
            `INSERT INTO subjects (name, code, type, is_active) VALUES (?, ?, ?, ?)`,
            [name, code || '', type || 'Theory', activeStatus]
          );
          return sendSuccess(res, { id: result.insertId, name, code, type }, 'Subject created successfully', 201);
        }
      }

      if (method === 'DELETE') {
        const delId = id || req.params.id || req.query.id || req.body?.id;
        if (!delId) return sendError(res, 'Subject ID required', 400);

        await execute(`DELETE FROM subject_group_subjects WHERE subject_id = ?`, [delId]);
        await execute(`DELETE FROM subjects WHERE id = ?`, [delId]);
        return sendSuccess(res, { success: true }, 'Subject deleted successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      logger.error('Error in subjects handler:', error);
      return sendError(res, 'Error processing subject request', 500);
    }
  }

  /**
   * GET / POST / PUT / DELETE /api/Academics/subject_groups or /subject-groups
   */
  public static async subjectGroups(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || req.query.id || req.body?.id;

    try {
      if (method === 'GET') {
        const groups = await query(`
          SELECT sg.* 
          FROM subject_groups sg
          ORDER BY sg.id DESC
        `);

        for (const g of groups) {
          const subjects = await query(`
            SELECT sgs.id as group_subject_id, sub.id as subject_id, sub.id, sub.name, sub.code, sub.type
            FROM subject_group_subjects sgs
            JOIN subjects sub ON sub.id = sgs.subject_id
            WHERE sgs.subject_group_id = ?
          `, [g.id]);

          const sections = await query(`
            SELECT sgcs.id as sgcs_id, cs.id as class_section_id, 
                   cs.class_id, c.class as class, c.class as className,
                   cs.section_id, s.section as section, s.section as sectionName
            FROM subject_group_class_sections sgcs
            JOIN class_sections cs ON cs.id = sgcs.class_section_id
            LEFT JOIN classes c ON c.id = cs.class_id
            LEFT JOIN sections s ON s.id = cs.section_id
            WHERE sgcs.subject_group_id = ?
          `, [g.id]);

          g.subjects = subjects;
          g.group_subject = subjects;
          g.sections = sections;
          g.className = Array.from(new Set(sections.map((s: any) => s.class || s.className).filter(Boolean))).join(', ');
          g.section = Array.from(new Set(sections.map((s: any) => s.section || s.sectionName).filter(Boolean))).join(', ');
          g.sectionName = g.section;
        }

        return sendSuccess(res, groups);
      }

      if (method === 'POST' || method === 'PUT') {
        const { id: groupId, name, description, class_id, sections, subjects, session_id } = req.body;
        const targetId = groupId || id;
        if (!name) return sendError(res, 'Group name is required', 400);

        const sess = await queryOne(`SELECT id FROM sessions WHERE is_active = 'yes' LIMIT 1`);
        const activeSessionId = session_id || sess?.id || 21;

        let activeGroupId = targetId;
        if (activeGroupId) {
          await execute(`UPDATE subject_groups SET name = ?, description = ? WHERE id = ?`, [name, description || '', activeGroupId]);
          await execute(`DELETE FROM subject_group_class_sections WHERE subject_group_id = ?`, [activeGroupId]);
          await execute(`DELETE FROM subject_group_subjects WHERE subject_group_id = ?`, [activeGroupId]);
        } else {
          const result = await execute(`
            INSERT INTO subject_groups (name, description, session_id) 
            VALUES (?, ?, ?)
          `, [name, description || '', activeSessionId]);
          activeGroupId = result.insertId;
        }

        // Link class sections
        if (class_id && Array.isArray(sections)) {
          for (const secId of sections) {
            let cs = await queryOne(`SELECT id FROM class_sections WHERE class_id = ? AND section_id = ? LIMIT 1`, [class_id, secId]);
            if (!cs) {
              const insCS = await execute(`INSERT INTO class_sections (class_id, section_id, is_active) VALUES (?, ?, 'yes')`, [class_id, secId]);
              cs = { id: insCS.insertId };
            }
            if (cs) {
              await execute(`
                INSERT INTO subject_group_class_sections (subject_group_id, class_section_id, session_id, is_active)
                VALUES (?, ?, ?, 1)
              `, [activeGroupId, cs.id, activeSessionId]);
            }
          }
        }

        // Link subjects
        if (Array.isArray(subjects)) {
          for (const subId of subjects) {
            if (subId) {
              await execute(`
                INSERT INTO subject_group_subjects (subject_group_id, subject_id, session_id)
                VALUES (?, ?, ?)
              `, [activeGroupId, subId, activeSessionId]);
            }
          }
        }

        return sendSuccess(res, { id: activeGroupId, name }, 'Subject group saved successfully', 201);
      }

      if (method === 'DELETE') {
        const delId = id || req.params.id || req.query.id || req.body?.id;
        if (!delId) return sendError(res, 'Subject Group ID required', 400);

        await execute(`DELETE FROM subject_group_class_sections WHERE subject_group_id = ?`, [delId]);
        await execute(`DELETE FROM subject_group_subjects WHERE subject_group_id = ?`, [delId]);
        await execute(`DELETE FROM subject_groups WHERE id = ?`, [delId]);
        return sendSuccess(res, { success: true }, 'Subject group deleted successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      logger.error('Error in subjectGroups:', error);
      return sendError(res, 'Failed to process subject groups', 500);
    }
  }

  /**
   * GET / POST / DELETE /api/Academics/class_teachers
   */
  public static async classTeachers(req: Request, res: Response) {
    const method = req.method;
    try {
      if (method === 'GET') {
        const rows = await query(`
          SELECT ct.id, c.class as \`class\`, c.class as className,
                 s.section as section, s.section as sectionName,
                 ct.class_id, ct.section_id, ct.staff_id,
                 st.name as staff_name, st.surname as staff_surname,
                 st.employee_id
          FROM class_teacher ct
          LEFT JOIN classes c ON c.id = ct.class_id
          LEFT JOIN sections s ON s.id = ct.section_id
          LEFT JOIN staff st ON st.id = ct.staff_id
          ORDER BY c.id ASC, s.id ASC
        `);

        const groupedMap = new Map<string, any>();
        for (const row of rows) {
          const key = `${row.class_id}_${row.section_id}`;
          if (!groupedMap.has(key)) {
            groupedMap.set(key, {
              id: row.id,
              class_id: row.class_id,
              section_id: row.section_id,
              class: row.class || '',
              className: row.className || '',
              section: row.section || '',
              sectionName: row.sectionName || '',
              teachers: []
            });
          }
          if (row.staff_id) {
            groupedMap.get(key).teachers.push({
              id: row.staff_id,
              name: row.staff_name,
              surname: row.staff_surname,
              employee_id: row.employee_id
            });
          }
        }
        return sendSuccess(res, Array.from(groupedMap.values()));
      }

      if (method === 'POST') {
        const { class_id, section_id, teachers, session_id } = req.body;
        if (!class_id || !section_id) {
          return sendError(res, 'Class and section are required', 400);
        }

        const sess = await queryOne(`SELECT id FROM sessions WHERE is_active = 'yes' LIMIT 1`);
        const activeSessionId = session_id || sess?.id || 21;

        await execute(`DELETE FROM class_teacher WHERE class_id = ? AND section_id = ?`, [class_id, section_id]);

        if (Array.isArray(teachers)) {
          for (const tId of teachers) {
            if (tId) {
              await execute(`
                INSERT INTO class_teacher (class_id, section_id, staff_id, session_id) 
                VALUES (?, ?, ?, ?)
              `, [class_id, section_id, tId, activeSessionId]);
            }
          }
        }
        return sendSuccess(res, { success: true }, 'Class teachers assigned successfully');
      }

      if (method === 'DELETE') {
        const classId = req.params.classId || req.query.class_id || req.body.class_id;
        const sectionId = req.params.sectionId || req.query.section_id || req.body.section_id;
        if (classId && sectionId) {
          await execute(`DELETE FROM class_teacher WHERE class_id = ? AND section_id = ?`, [classId, sectionId]);
        }
        return sendSuccess(res, { success: true }, 'Class teacher assignment removed');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      logger.error('Error in classTeachers:', error);
      return sendError(res, 'Failed to process class teachers', 500);
    }
  }

  /**
   * GET /api/Academics/sessions or /api/Academics/session
   */
  public static async sessions(req: Request, res: Response) {
    try {
      const rows = await query(`
        SELECT * FROM sessions 
        ORDER BY CASE WHEN is_active = 'yes' THEN 0 ELSE 1 END, id DESC
      `);
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch sessions', 500);
    }
  }

  /**
   * POST /api/Academics/promote
   */
  public static async promote(req: Request, res: Response) {
    try {
      const { session_id, class_promote_id, section_promote_id, student_list } = req.body;
      if (!student_list || !Array.isArray(student_list) || student_list.length === 0) {
        return sendError(res, 'No students provided for promotion', 400);
      }

      const sess = await queryOne(`SELECT id FROM sessions WHERE is_active = 'yes' LIMIT 1`);
      const targetSessionId = session_id || sess?.id || 21;

      for (const studentId of student_list) {
        if (!studentId) continue;
        const exists = await queryOne(`SELECT id FROM student_session WHERE student_id = ? AND session_id = ?`, [studentId, targetSessionId]);
        if (exists) {
          await execute(`
            UPDATE student_session 
            SET class_id = ?, section_id = ?, is_active = 'yes' 
            WHERE id = ?
          `, [class_promote_id, section_promote_id, exists.id]);
        } else {
          await execute(`
            INSERT INTO student_session (student_id, class_id, section_id, session_id, route_id, hostel_room_id, is_alumni, is_active)
            VALUES (?, ?, ?, ?, 0, 0, 0, 'yes')
          `, [studentId, class_promote_id, section_promote_id, targetSessionId]);
        }
      }

      return sendSuccess(res, { count: student_list.length }, 'Students promoted successfully');
    } catch (error) {
      logger.error('Error in student promotion:', error);
      return sendError(res, 'Failed to promote students', 500);
    }
  }

  /**
   * POST /api/Academics/timetable_save
   */
  public static async saveTimetable(req: Request, res: Response) {
    try {
      const b = req.body || {};
      const isBreak = Boolean(
        b.is_break ||
        b.isBreak ||
        (b.subject && /break|lunch|recess|assembly|activity|interval/i.test(b.subject)) ||
        (b.subject_id === 'break')
      );

      // Resolve class_id
      let classId = b.class_id ? Number(b.class_id) : null;
      if (!classId && b.className) {
        const c = await queryOne(`SELECT id FROM classes WHERE id = ? OR class = ? LIMIT 1`, [b.className, b.className]);
        if (c) classId = c.id;
      }
      if (!classId) {
        const c = await queryOne(`SELECT id FROM classes ORDER BY id ASC LIMIT 1`);
        classId = c?.id || 14;
      }

      // Resolve section_id
      let sectionId = b.section_id ? Number(b.section_id) : null;
      if (!sectionId && b.section) {
        const s = await queryOne(`SELECT id FROM sections WHERE id = ? OR section = ? LIMIT 1`, [b.section, b.section]);
        if (s) sectionId = s.id;
      }
      if (!sectionId) {
        const s = await queryOne(`SELECT id FROM sections ORDER BY id ASC LIMIT 1`);
        sectionId = s?.id || 6;
      }

      // Resolve staff_id
      let staffId = isBreak ? null : (b.staff_id ? Number(b.staff_id) : null);
      if (!isBreak && !staffId && b.teacher) {
        const stf = await queryOne(`
          SELECT id FROM staff 
          WHERE id = ? OR name = ? OR CONCAT(name, ' ', surname) = ? OR email = ?
          LIMIT 1
        `, [b.teacher, b.teacher, b.teacher, b.teacher]);
        if (stf) staffId = stf.id;
      }

      // Resolve subject_group_subject_id and subject_group_id
      let subjectGroupId = isBreak ? null : (b.subject_group_id ? Number(b.subject_group_id) : null);
      let subjectGroupSubjectId: number | null = null;
      let subjectId = isBreak ? null : (b.subject_id && !isNaN(Number(b.subject_id)) ? Number(b.subject_id) : null);

      if (!isBreak && !subjectId && b.subject) {
        const sub = await queryOne(`SELECT id FROM subjects WHERE id = ? OR name = ? OR code = ? LIMIT 1`, [b.subject, b.subject, b.subject]);
        if (sub) subjectId = sub.id;
      }

      if (!isBreak && subjectId) {
        if (subjectGroupId) {
          const sgs = await queryOne(`
            SELECT id FROM subject_group_subjects 
            WHERE subject_group_id = ? AND subject_id = ? 
            LIMIT 1
          `, [subjectGroupId, subjectId]);
          if (sgs) subjectGroupSubjectId = sgs.id;
        }
        if (!subjectGroupSubjectId) {
          const sgs = await queryOne(`
            SELECT id, subject_group_id FROM subject_group_subjects 
            WHERE subject_id = ? 
            ORDER BY id DESC LIMIT 1
          `, [subjectId]);
          if (sgs) {
            subjectGroupSubjectId = sgs.id;
            if (!subjectGroupId) subjectGroupId = sgs.subject_group_id;
          }
        }
        if (!subjectGroupSubjectId) {
          if (!subjectGroupId) {
            const sg = await queryOne(`SELECT id FROM subject_groups ORDER BY id DESC LIMIT 1`);
            subjectGroupId = sg?.id || 6;
          }
          const ins = await execute(`
            INSERT INTO subject_group_subjects (subject_group_id, subject_id, session_id)
            VALUES (?, ?, COALESCE((SELECT id FROM sessions WHERE is_active = 'yes' LIMIT 1), 21))
          `, [subjectGroupId, subjectId]);
          subjectGroupSubjectId = ins.insertId;
        }
      }

      const day = b.day || 'Monday';
      const timeFrom = b.time_from || b.timeFrom || b.period || '09:00 AM';
      const timeTo = b.time_to || b.timeTo || b.period || '10:00 AM';
      const roomNo = isBreak ? (b.subject || b.room_no || 'Break') : (b.room_no || b.room || '101');

      const existing = await queryOne(`
        SELECT id FROM subject_timetable 
        WHERE day = ? AND class_id = ? AND section_id = ? AND time_from = ?
        LIMIT 1
      `, [day, classId, sectionId, timeFrom]);

      let recordId: number;
      if (existing) {
        await execute(`
          UPDATE subject_timetable 
          SET staff_id = ?, subject_group_id = ?, subject_group_subject_id = ?, time_to = ?, room_no = ?, session_id = COALESCE((SELECT id FROM sessions WHERE is_active = 'yes' LIMIT 1), 21)
          WHERE id = ?
        `, [staffId, subjectGroupId, subjectGroupSubjectId, timeTo, roomNo, existing.id]);
        recordId = existing.id;
      } else {
        const result = await execute(`
          INSERT INTO subject_timetable (day, class_id, section_id, subject_group_id, subject_group_subject_id, staff_id, time_from, time_to, room_no, session_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT id FROM sessions WHERE is_active = 'yes' LIMIT 1), 21))
        `, [day, classId, sectionId, subjectGroupId, subjectGroupSubjectId, staffId, timeFrom, timeTo, roomNo]);
        recordId = result.insertId;
      }

      return sendSuccess(res, { id: recordId }, isBreak ? 'Break scheduled successfully' : 'Timetable period scheduled successfully', 201);
    } catch (error) {
      logger.error('Error in saveTimetable:', error);
      return sendError(res, 'Failed to save timetable period', 500);
    }
  }

  /**
   * DELETE /api/Academics/timetable_save
   */
  public static async deleteTimetablePeriod(req: Request, res: Response) {
    try {
      const id = req.query.id || req.body.id;
      if (id) {
        await execute(`DELETE FROM subject_timetable WHERE id = ?`, [id]);
      }
      return sendSuccess(res, { success: true }, 'Timetable period deleted');
    } catch (error) {
      return sendError(res, 'Failed to delete timetable period', 500);
    }
  }
}
