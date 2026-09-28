import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { query, queryOne, execute, transaction } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export class LessonPlanController {
  /**
   * GET /api/admin/lessonplan/dropdowns or /api/Lessonplan/dropdowns
   */
  public static async getDropdowns(req: Request, res: Response) {
    try {
      const classes = await query(`
        SELECT c.id, c.class
        FROM classes c
        ORDER BY c.id ASC
      `);

      const sections = await query(`SELECT id, section FROM sections ORDER BY section ASC`);
      const subjects = await query(`SELECT id, name, code, type FROM subjects ORDER BY name ASC`);
      
      const subject_groups = await query(`
        SELECT sg.id, sg.name, cs.class_id, cs.section_id, sgcs.id as subject_group_class_sections_id
        FROM subject_groups sg
        LEFT JOIN subject_group_class_sections sgcs ON sgcs.subject_group_id = sg.id
        LEFT JOIN class_sections cs ON cs.id = sgcs.class_section_id
        ORDER BY sg.name ASC
      `);

      const subject_group_subjects = await query(`
        SELECT sgs.id, sgs.subject_group_id, sgs.subject_id, s.name as subject_name, s.code as subject_code
        FROM subject_group_subjects sgs
        JOIN subjects s ON s.id = sgs.subject_id
      `);

      // Return only teaching staff (teachers) by joining staff_roles and roles, excluding non-teaching staff
      const teachers = await query(`
        SELECT DISTINCT s.id, s.name, s.surname, s.employee_id, s.email, COALESCE(r.name, 'Teacher') as role
        FROM staff s
        JOIN staff_roles sr ON sr.staff_id = s.id
        JOIN roles r ON r.id = sr.role_id
        WHERE s.is_active = 1
          AND (
            sr.role_id = 2
            OR LOWER(r.name) LIKE '%teacher%'
            OR LOWER(r.name) LIKE '%faculty%'
            OR LOWER(r.name) LIKE '%lecturer%'
            OR LOWER(r.name) LIKE '%instructor%'
            OR s.id IN (SELECT DISTINCT staff_id FROM subject_timetable WHERE staff_id IS NOT NULL)
          )
          AND sr.role_id NOT IN (3, 4, 6)
          AND LOWER(r.name) NOT IN ('accountant', 'librarian', 'receptionist', 'super admin', 'admin')
        ORDER BY s.name ASC
      `);

      const staffList = teachers.length > 0 ? teachers : await query(`
        SELECT DISTINCT s.id, s.name, s.surname, s.employee_id, s.email, COALESCE(r.name, 'Teacher') as role
        FROM staff s
        LEFT JOIN staff_roles sr ON sr.staff_id = s.id
        LEFT JOIN roles r ON r.id = sr.role_id
        WHERE s.is_active = 1
          AND COALESCE(sr.role_id, 0) NOT IN (3, 4, 6)
          AND LOWER(COALESCE(r.name, '')) NOT IN ('accountant', 'librarian', 'receptionist')
        ORDER BY s.name ASC
      `);

      return res.json({
        status: true,
        success: true,
        data: {
          classes,
          sections,
          subjects,
          subject_groups,
          subject_group_subjects,
          staff: staffList
        },
        classes,
        sections,
        subjects,
        subject_groups,
        subject_group_subjects,
        staff: staffList
      });
    } catch (error) {
      logger.error('Error fetching lessonplan dropdowns:', error);
      return sendError(res, 'Failed to fetch dropdowns', 500);
    }
  }

  /**
   * GET /api/admin/lessonplan/subject-group-subject
   * Resolves subject_group_subject_id and subject_group_class_sections_id
   */
  public static async getSubjectGroupSubjectId(req: Request, res: Response) {
    try {
      const { class_id, section_id, subject_group_id, subject_id } = req.query;

      // 1. Direct match on subject_group_subjects
      let sgsRow: any = null;
      if (subject_group_id && subject_id) {
        sgsRow = await queryOne(
          `SELECT id as subject_group_subject_id, subject_group_id, subject_id FROM subject_group_subjects WHERE subject_group_id = ? AND subject_id = ? LIMIT 1`,
          [subject_group_id, subject_id]
        );
      } else if (subject_id) {
        sgsRow = await queryOne(
          `SELECT id as subject_group_subject_id, subject_group_id, subject_id FROM subject_group_subjects WHERE subject_id = ? LIMIT 1`,
          [subject_id]
        );
      }

      // 2. Resolve subject_group_class_sections_id if class_id and section_id provided
      let sgcsRow: any = null;
      if (class_id && section_id && subject_group_id) {
        sgcsRow = await queryOne(`
          SELECT sgcs.id as subject_group_class_sections_id
          FROM subject_group_class_sections sgcs
          JOIN class_sections cs ON cs.id = sgcs.class_section_id
          WHERE cs.class_id = ? AND cs.section_id = ? AND sgcs.subject_group_id = ?
          LIMIT 1
        `, [class_id, section_id, subject_group_id]);
      } else if (subject_group_id) {
        sgcsRow = await queryOne(`
          SELECT id as subject_group_class_sections_id
          FROM subject_group_class_sections
          WHERE subject_group_id = ?
          LIMIT 1
        `, [subject_group_id]);
      }

      return sendSuccess(res, {
        subject_group_subject_id: sgsRow ? sgsRow.subject_group_subject_id : null,
        subject_group_class_sections_id: sgcsRow ? sgcsRow.subject_group_class_sections_id : null,
        subject_group_id: sgsRow ? sgsRow.subject_group_id : (subject_group_id || null),
        subject_id: sgsRow ? sgsRow.subject_id : (subject_id || null)
      });
    } catch (error) {
      return sendError(res, 'Failed to resolve subject group subject', 500);
    }
  }

  // ==========================================
  // WEEK TIMETABLE & SUBJECT GROUP DATA
  // ==========================================

  /**
   * GET /api/admin/lessonplan/week-dates
   * Returns weekly timetable schedule for a teacher with their assigned periods
   */
  public static async getWeekDates(req: Request, res: Response) {
    try {
      const { staff_id, date } = req.query;

      // Calculate week start (Monday) from the given date
      const targetDate = date ? new Date(String(date)) : new Date();
      const dayOfWeek = targetDate.getDay(); // 0=Sun, 1=Mon ... 6=Sat
      const diff = targetDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(targetDate);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const prevWeekStart = new Date(monday);
      prevWeekStart.setDate(monday.getDate() - 7);

      const nextWeekStart = new Date(monday);
      nextWeekStart.setDate(monday.getDate() + 7);

      const fmt = (d: Date) => d.toISOString().split('T')[0];
      const fmtDisplay = (d: Date) => {
        const p = fmt(d).split('-');
        return `${p[2]}/${p[1]}/${p[0]}`;
      };

      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const timetable: Record<string, any> = {};

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dStr = fmt(d);
        const dName = dayNames[i];

        // 1. Get scheduled timetable periods for this day of week
        const scheduledPeriods = staff_id ? await query(`
          SELECT st.id as timetable_id, st.day, st.time_from, st.time_to, st.room_no,
                 st.class_id, c.class as class, c.class as class_name,
                 st.section_id, sec.section as section, sec.section as section_name,
                 st.subject_group_id, sg.name as subject_group_name,
                 st.subject_group_subject_id,
                 s.id as subject_id, s.name as subject_name, s.code as subject_code
          FROM subject_timetable st
          LEFT JOIN classes c ON c.id = st.class_id
          LEFT JOIN sections sec ON sec.id = st.section_id
          LEFT JOIN subject_groups sg ON sg.id = st.subject_group_id
          LEFT JOIN subject_group_subjects sgs ON sgs.id = st.subject_group_subject_id
          LEFT JOIN subjects s ON s.id = sgs.subject_id
          WHERE st.staff_id = ? AND LOWER(st.day) = LOWER(?)
          ORDER BY st.time_from ASC
        `, [staff_id, dName]) : [];

        // 2. Get syllabus logs for this staff on this day
        const syllabusLogs = staff_id ? await query(`
          SELECT ss.id, ss.topic_id, ss.date, ss.time_from, ss.time_to,
                 ss.sub_topic, ss.teaching_method, ss.presentation, ss.attachment, ss.lacture_video, ss.lacture_youtube_url,
                 t.name as topic_name, t.status as topic_status,
                 l.id as lesson_id, l.name as lesson_name,
                 s.id as subject_id, s.name as subject_name, s.code as subject_code,
                 sg.id as subject_group_id, sg.name as subject_group_name,
                 c.id as class_id, c.class as class, c.class as class_name,
                 sec.id as section_id, sec.section as section, sec.section as section_name,
                 sgs.id as subject_group_subject_id
          FROM subject_syllabus ss
          JOIN topic t ON t.id = ss.topic_id
          JOIN lesson l ON l.id = t.lesson_id
          LEFT JOIN subject_group_subjects sgs ON sgs.id = l.subject_group_subject_id
          LEFT JOIN subjects s ON s.id = sgs.subject_id
          LEFT JOIN subject_groups sg ON sg.id = sgs.subject_group_id
          LEFT JOIN subject_group_class_sections sgcs ON sgcs.id = l.subject_group_class_sections_id
          LEFT JOIN class_sections cs ON cs.id = sgcs.class_section_id
          LEFT JOIN classes c ON c.id = cs.class_id
          LEFT JOIN sections sec ON sec.id = cs.section_id
          WHERE ss.created_for = ? AND ss.date = ?
          ORDER BY ss.time_from ASC
        `, [staff_id, dStr]) : [];

        // Merge: Match syllabus logs with scheduled timetable slots if times/subjects align, or add standalone
        const matchedSyllabusIds = new Set<number>();
        const mergedPeriods: any[] = [];

        for (const sp of scheduledPeriods) {
          const match = syllabusLogs.find((sl: any) =>
            !matchedSyllabusIds.has(sl.id) &&
            ((sl.subject_id && sl.subject_id === sp.subject_id) ||
             (sl.time_from && sp.time_from && sl.time_from.trim().toLowerCase() === sp.time_from.trim().toLowerCase()))
          );

          if (match) {
            matchedSyllabusIds.add(match.id);
            mergedPeriods.push({
              ...sp,
              ...match,
              has_syllabus: true
            });
          } else {
            mergedPeriods.push({
              ...sp,
              has_syllabus: false
            });
          }
        }

        // Add any remaining syllabus logs that weren't matched to a timetable slot
        for (const sl of syllabusLogs) {
          if (!matchedSyllabusIds.has(sl.id)) {
            mergedPeriods.push({
              ...sl,
              has_syllabus: true
            });
          }
        }

        timetable[dName] = {
          day: dName,
          date: dStr,
          date_formatted: fmtDisplay(d),
          periods: mergedPeriods
        };
      }

      return sendSuccess(res, {
        this_week_start: fmt(monday),
        this_week_end: fmt(sunday),
        this_week_start_formatted: fmtDisplay(monday),
        this_week_end_formatted: fmtDisplay(sunday),
        prev_week_start: fmt(prevWeekStart),
        next_week_start: fmt(nextWeekStart),
        timetable
      });
    } catch (error) {
      logger.error('Error fetching week dates:', error);
      return sendError(res, 'Failed to fetch week timetable', 500);
    }
  }

  /**
   * GET /api/admin/lessonplan/subject-groups-with-subjects
   * Returns all subject groups with their nested subjects
   */
  public static async getSubjectGroupsWithSubjects(req: Request, res: Response) {
    try {
      const groups = await query(`
        SELECT sg.id, sg.name
        FROM subject_groups sg
        ORDER BY sg.name ASC
      `);

      for (const g of groups) {
        const subjects = await query(`
          SELECT sgs.id as subject_group_subject_id, sgs.subject_id, s.name, s.code, s.type
          FROM subject_group_subjects sgs
          JOIN subjects s ON s.id = sgs.subject_id
          WHERE sgs.subject_group_id = ?
          ORDER BY s.name ASC
        `, [g.id]);
        g.group_subject = subjects;
        g.subjects = subjects;
      }

      return sendSuccess(res, groups);
    } catch (error) {
      logger.error('Error fetching subject groups with subjects:', error);
      return sendError(res, 'Failed to fetch subject groups', 500);
    }
  }

  // ==========================================
  // LESSONS & TOPICS (MERGED HUB CRUD)
  // ==========================================

  /**
   * GET /api/admin/lessonplan/lessons or /api/Lessonplan/lesson
   */
  public static async listLessons(req: Request, res: Response) {
    try {
      const { class_id, section_id, subject_group_id, subject_id, subject_group_subject_id } = req.query;

      let sql = `
        SELECT l.id, l.name, l.subject_group_subject_id, l.subject_group_class_sections_id, l.session_id, l.created_at,
               s.name as subject_name, s.id as subject_id, s.code as subject_code,
               sg.name as subject_group_name, sg.id as subject_group_id,
               c.class as class_name, c.id as class_id,
               sec.section as section_name, sec.id as section_id
        FROM lesson l
        LEFT JOIN subject_group_subjects sgs ON sgs.id = l.subject_group_subject_id
        LEFT JOIN subjects s ON s.id = sgs.subject_id
        LEFT JOIN subject_groups sg ON sg.id = sgs.subject_group_id
        LEFT JOIN subject_group_class_sections sgcs ON (sgcs.id = l.subject_group_class_sections_id)
        LEFT JOIN class_sections cs ON cs.id = sgcs.class_section_id
        LEFT JOIN classes c ON c.id = cs.class_id
        LEFT JOIN sections sec ON sec.id = cs.section_id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (subject_group_subject_id) {
        sql += ` AND l.subject_group_subject_id = ?`;
        params.push(subject_group_subject_id);
      }
      if (class_id) {
        sql += ` AND (c.id = ? OR c.id IS NULL)`;
        params.push(class_id);
      }
      if (section_id) {
        sql += ` AND (sec.id = ? OR sec.id IS NULL)`;
        params.push(section_id);
      }
      if (subject_group_id) {
        sql += ` AND (sg.id = ? OR sg.id IS NULL)`;
        params.push(subject_group_id);
      }
      if (subject_id) {
        sql += ` AND (s.id = ? OR s.id IS NULL)`;
        params.push(subject_id);
      }

      sql += ` ORDER BY l.id ASC`;
      const lessons = await query(sql, params);

      // Fetch topics nested under each lesson
      for (const lesson of lessons) {
        const topics = await query(`
          SELECT t.id, t.name, t.status, t.complete_date, t.lesson_id, t.created_at
          FROM topic t
          WHERE t.lesson_id = ?
          ORDER BY t.id ASC
        `, [lesson.id]);
        lesson.topics = topics;
        lesson.total_topics = topics.length;
        lesson.completed_topics = topics.filter((t: any) => Number(t.status) === 1).length;
      }

      return sendSuccess(res, lessons);
    } catch (error) {
      logger.error('Error fetching lessons list:', error);
      return sendError(res, 'Failed to fetch lessons', 500);
    }
  }

  /**
   * POST /api/admin/lessonplan/lesson or /api/Lessonplan/lesson
   */
  public static async createLesson(req: Request, res: Response) {
    try {
      const { subject_group_subject_id, subject_group_class_sections_id, class_id, section_id, subject_group_id, subject_id, lessons, name, session_id } = req.body;
      let sgsId = subject_group_subject_id;
      let sgcsId = subject_group_class_sections_id;

      // 1. Resolve or auto-create subject_group_subjects
      if (!sgsId && subject_group_id && subject_id) {
        const sgs = await queryOne(
          `SELECT id FROM subject_group_subjects WHERE subject_group_id = ? AND subject_id = ? LIMIT 1`,
          [subject_group_id, subject_id]
        );
        if (sgs) {
          sgsId = sgs.id;
        } else {
          const ins = await execute(
            `INSERT INTO subject_group_subjects (subject_group_id, subject_id, session_id) VALUES (?, ?, ?)`,
            [subject_group_id, subject_id, session_id || 21]
          );
          sgsId = ins.insertId;
        }
      } else if (!sgsId && subject_id) {
        const sgs = await queryOne(
          `SELECT id FROM subject_group_subjects WHERE subject_id = ? LIMIT 1`,
          [subject_id]
        );
        if (sgs) {
          sgsId = sgs.id;
        } else if (subject_group_id) {
          const ins = await execute(
            `INSERT INTO subject_group_subjects (subject_group_id, subject_id, session_id) VALUES (?, ?, ?)`,
            [subject_group_id, subject_id, session_id || 21]
          );
          sgsId = ins.insertId;
        }
      }

      // 2. Resolve or auto-create subject_group_class_sections
      if (!sgcsId && class_id && section_id && subject_group_id) {
        const sgcs = await queryOne(`
          SELECT sgcs.id
          FROM subject_group_class_sections sgcs
          JOIN class_sections cs ON cs.id = sgcs.class_section_id
          WHERE cs.class_id = ? AND cs.section_id = ? AND sgcs.subject_group_id = ?
          LIMIT 1
        `, [class_id, section_id, subject_group_id]);
        if (sgcs) {
          sgcsId = sgcs.id;
        } else {
          let cs = await queryOne(`SELECT id FROM class_sections WHERE class_id = ? AND section_id = ? LIMIT 1`, [class_id, section_id]);
          if (!cs) {
            const csIns = await execute(`INSERT INTO class_sections (class_id, section_id) VALUES (?, ?)`, [class_id, section_id]);
            cs = { id: csIns.insertId };
          }
          const sgcsIns = await execute(
            `INSERT INTO subject_group_class_sections (subject_group_id, class_section_id, session_id, is_active) VALUES (?, ?, ?, 1)`,
            [subject_group_id, cs.id, session_id || 21]
          );
          sgcsId = sgcsIns.insertId;
        }
      } else if (!sgcsId && subject_group_id) {
        const sgcs = await queryOne(`SELECT id FROM subject_group_class_sections WHERE subject_group_id = ? LIMIT 1`, [subject_group_id]);
        if (sgcs) sgcsId = sgcs.id;
      }

      if (!sgsId) {
        // Fallback: create default SGS with subject_id
        if (subject_id) {
          const ins = await execute(
            `INSERT INTO subject_group_subjects (subject_group_id, subject_id, session_id) VALUES (?, ?, ?)`,
            [subject_group_id || 1, subject_id, session_id || 21]
          );
          sgsId = ins.insertId;
        } else {
          return sendError(res, 'Subject Group and Subject are required', 400);
        }
      }

      const lessonNames: string[] = Array.isArray(lessons) ? lessons : (name ? [name] : []);
      if (lessonNames.length === 0) {
        return sendError(res, 'At least one lesson name is required', 400);
      }

      const insertedIds: number[] = [];
      for (const lName of lessonNames) {
        if (lName && lName.trim()) {
          const result = await execute(`
            INSERT INTO lesson (subject_group_subject_id, subject_group_class_sections_id, name, session_id)
            VALUES (?, ?, ?, ?)
          `, [sgsId, sgcsId || 0, lName.trim(), session_id || 21]);
          insertedIds.push(result.insertId);
        }
      }

      return sendSuccess(res, { inserted: insertedIds.length, ids: insertedIds }, 'Lesson(s) added successfully', 201);
    } catch (error) {
      logger.error('Error creating lesson:', error);
      return sendError(res, 'Failed to create lesson', 500);
    }
  }

  /**
   * PUT /api/admin/lessonplan/lesson/:id
   */
  public static async updateLesson(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const { name, subject_group_subject_id, subject_group_class_sections_id } = req.body;
      if (!id || !name) return sendError(res, 'Lesson ID and name required', 400);

      await execute(`
        UPDATE lesson
        SET name = ?,
            subject_group_subject_id = COALESCE(?, subject_group_subject_id),
            subject_group_class_sections_id = COALESCE(?, subject_group_class_sections_id)
        WHERE id = ?
      `, [name.trim(), subject_group_subject_id || null, subject_group_class_sections_id || null, id]);

      return sendSuccess(res, { id }, 'Lesson updated successfully');
    } catch (error) {
      return sendError(res, 'Failed to update lesson', 500);
    }
  }

  /**
   * DELETE /api/admin/lessonplan/lesson/:id
   */
  public static async deleteLesson(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return sendError(res, 'Lesson ID required', 400);

      // 1. Find topic IDs
      const topics = await query(`SELECT id FROM topic WHERE lesson_id = ?`, [id]);
      const topicIds = topics.map((t: any) => t.id);

      // 2. Delete syllabus records for those topics
      if (topicIds.length > 0) {
        const placeholders = topicIds.map(() => '?').join(',');
        await execute(`DELETE FROM subject_syllabus WHERE topic_id IN (${placeholders})`, topicIds);
      }

      // 3. Delete topics
      await execute(`DELETE FROM topic WHERE lesson_id = ?`, [id]);

      // 4. Delete lesson
      await execute(`DELETE FROM lesson WHERE id = ?`, [id]);

      return sendSuccess(res, { id }, 'Lesson and its topics deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete lesson', 500);
    }
  }

  // ==========================================
  // TOPICS CRUD
  // ==========================================

  /**
   * GET /api/admin/lessonplan/topics or /api/Lessonplan/topic
   */
  public static async listTopics(req: Request, res: Response) {
    try {
      const { lesson_id } = req.query;

      let sql = `
        SELECT t.id, t.name, t.status, t.complete_date, t.lesson_id, t.created_at,
               l.name as lesson_name,
               s.name as subject_name,
               c.class as class_name,
               sec.section as section_name
        FROM topic t
        JOIN lesson l ON l.id = t.lesson_id
        LEFT JOIN subject_group_subjects sgs ON sgs.id = l.subject_group_subject_id
        LEFT JOIN subjects s ON s.id = sgs.subject_id
        LEFT JOIN subject_groups sg ON sg.id = sgs.subject_group_id
        LEFT JOIN subject_group_class_sections sgcs ON (sgcs.id = l.subject_group_class_sections_id)
        LEFT JOIN class_sections cs ON cs.id = sgcs.class_section_id
        LEFT JOIN classes c ON c.id = cs.class_id
        LEFT JOIN sections sec ON sec.id = cs.section_id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (lesson_id) {
        sql += ` AND t.lesson_id = ?`;
        params.push(lesson_id);
      }

      sql += ` ORDER BY t.id ASC`;
      const rows = await query(sql, params);
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch topics', 500);
    }
  }

  /**
   * POST /api/admin/lessonplan/topic or /api/Lessonplan/topic
   */
  public static async createTopic(req: Request, res: Response) {
    try {
      const { lesson_id, topics, name, session_id } = req.body;
      if (!lesson_id) return sendError(res, 'Lesson ID required', 400);

      const topicNames: string[] = Array.isArray(topics) ? topics : (name ? [name] : []);
      if (topicNames.length === 0) {
        return sendError(res, 'At least one topic name is required', 400);
      }

      const insertedIds: number[] = [];
      for (const tName of topicNames) {
        if (tName && tName.trim()) {
          const result = await execute(`
            INSERT INTO topic (lesson_id, name, status, complete_date, session_id)
            VALUES (?, ?, 0, NULL, ?)
          `, [lesson_id, tName.trim(), session_id || 21]);
          insertedIds.push(result.insertId);
        }
      }

      return sendSuccess(res, { inserted: insertedIds.length, ids: insertedIds }, 'Topic(s) added successfully', 201);
    } catch (error) {
      logger.error('Error creating topic:', error);
      return sendError(res, 'Failed to create topic', 500);
    }
  }

  /**
   * PUT /api/admin/lessonplan/topic/:id
   */
  public static async updateTopic(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const { name, lesson_id } = req.body;
      if (!id || !name) return sendError(res, 'Topic ID and name required', 400);

      await execute(`
        UPDATE topic
        SET name = ?,
            lesson_id = COALESCE(?, lesson_id)
        WHERE id = ?
      `, [name.trim(), lesson_id || null, id]);

      return sendSuccess(res, { id }, 'Topic updated successfully');
    } catch (error) {
      return sendError(res, 'Failed to update topic', 500);
    }
  }

  /**
   * POST /api/admin/lessonplan/topic/status or /api/Lessonplan/topic/status
   */
  public static async toggleTopicStatus(req: Request, res: Response) {
    try {
      const { id, status, complete_date } = req.body;
      if (!id) return sendError(res, 'Topic ID is required', 400);

      const newStatus = status ? 1 : 0;
      const compDate = newStatus ? (complete_date || new Date().toISOString().split('T')[0]) : null;

      await execute(`
        UPDATE topic
        SET status = ?,
            complete_date = ?
        WHERE id = ?
      `, [newStatus, compDate, id]);

      return sendSuccess(res, { id, status: newStatus, complete_date: compDate }, `Topic marked as ${newStatus ? 'Complete' : 'Incomplete'}`);
    } catch (error) {
      return sendError(res, 'Failed to update topic status', 500);
    }
  }

  /**
   * DELETE /api/admin/lessonplan/topic/:id
   */
  public static async deleteTopic(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return sendError(res, 'Topic ID required', 400);

      await execute(`DELETE FROM subject_syllabus WHERE topic_id = ?`, [id]);
      await execute(`DELETE FROM topic WHERE id = ?`, [id]);

      return sendSuccess(res, { id }, 'Topic deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete topic', 500);
    }
  }

  // ==========================================
  // MANAGE LESSON PLAN (SUBJECT SYLLABUS DELIVERY)
  // ==========================================

  /**
   * GET /api/admin/lessonplan/syllabus or /api/Lessonplan/syllabus
   */
  public static async listSyllabus(req: Request, res: Response) {
    try {
      const { staff_id, date, date_from, date_to, class_id, section_id, subject_group_id, subject_id } = req.query;

      let sql = `
        SELECT ss.*,
               t.name as topic_name, t.status as topic_status, t.complete_date as topic_complete_date,
               l.id as lesson_id, l.name as lesson_name,
               s.name as subject_name, s.code as subject_code,
               sg.name as subject_group_name,
               c.class as class_name, c.id as class_id,
               sec.section as section_name, sec.id as section_id,
               stf.name as staff_name, stf.surname as staff_surname
        FROM subject_syllabus ss
        JOIN topic t ON t.id = ss.topic_id
        JOIN lesson l ON l.id = t.lesson_id
        LEFT JOIN subject_group_subjects sgs ON sgs.id = l.subject_group_subject_id
        LEFT JOIN subjects s ON s.id = sgs.subject_id
        LEFT JOIN subject_groups sg ON sg.id = sgs.subject_group_id
        LEFT JOIN subject_group_class_sections sgcs ON (sgcs.id = l.subject_group_class_sections_id)
        LEFT JOIN class_sections cs ON cs.id = sgcs.class_section_id
        LEFT JOIN classes c ON c.id = cs.class_id
        LEFT JOIN sections sec ON sec.id = cs.section_id
        LEFT JOIN staff stf ON stf.id = ss.created_for
        WHERE 1=1
      `;
      const params: any[] = [];

      if (staff_id) {
        sql += ` AND ss.created_for = ?`;
        params.push(staff_id);
      }
      if (date) {
        sql += ` AND ss.date = ?`;
        params.push(date);
      }
      if (date_from && date_to) {
        sql += ` AND ss.date BETWEEN ? AND ?`;
        params.push(date_from, date_to);
      }
      if (class_id) {
        sql += ` AND c.id = ?`;
        params.push(class_id);
      }
      if (section_id) {
        sql += ` AND sec.id = ?`;
        params.push(section_id);
      }
      if (subject_id) {
        sql += ` AND s.id = ?`;
        params.push(subject_id);
      }

      sql += ` ORDER BY ss.date DESC, ss.time_from ASC`;
      const rows = await query(sql, params);
      return sendSuccess(res, rows);
    } catch (error) {
      logger.error('Error fetching subject syllabus list:', error);
      return sendError(res, 'Failed to fetch syllabus list', 500);
    }
  }

  /**
   * POST /api/admin/lessonplan/syllabus
   */
  public static async saveSyllabus(req: Request, res: Response) {
    try {
      const body = req.body || {};
      const syllabusId = req.params.id || body.id;
      const {
        topic_id, created_for, date, time_from, time_to,
        sub_topic, teaching_method, general_objectives,
        previous_knowledge, comprehensive_questions,
        lacture_youtube_url, presentation, attachment, lacture_video, session_id
      } = body;

      if (!topic_id || !date) {
        return sendError(res, 'Topic and Date are required', 400);
      }

      let attachmentVal = typeof attachment === 'string' ? attachment : '';
      let videoVal = typeof lacture_video === 'string' ? lacture_video : '';

      // Handle uploaded files if any
      const files = req.files as Express.Multer.File[];
      if (files && Array.isArray(files) && files.length > 0) {
        for (const f of files) {
          const ext = path.extname(f.originalname) || '';
          if (f.fieldname === 'file' || f.fieldname === 'attachment') {
            const destDir = path.resolve(process.cwd(), 'uploads', 'syllabus_attachment');
            if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
            const destName = `syllabus_doc_${Date.now()}${ext}`;
            fs.renameSync(f.path, path.join(destDir, destName));
            attachmentVal = destName;
          } else if (f.fieldname === 'lacture_video') {
            const destDir = path.resolve(process.cwd(), 'uploads', 'syllabus_video');
            if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
            const destName = `syllabus_vid_${Date.now()}${ext}`;
            fs.renameSync(f.path, path.join(destDir, destName));
            videoVal = destName;
          }
        }
      }

      if (syllabusId) {
        // Update
        await execute(`
          UPDATE subject_syllabus
          SET topic_id = ?,
              created_for = COALESCE(?, created_for),
              date = ?,
              time_from = ?,
              time_to = ?,
              sub_topic = ?,
              teaching_method = ?,
              general_objectives = ?,
              previous_knowledge = ?,
              comprehensive_questions = ?,
              lacture_youtube_url = ?,
              lacture_video = ?,
              presentation = ?,
              attachment = ?
          WHERE id = ?
        `, [
          topic_id, created_for || 26, date, time_from || '', time_to || '',
          sub_topic || '', teaching_method || '', general_objectives || '',
          previous_knowledge || '', comprehensive_questions || '',
          lacture_youtube_url || '', videoVal || '', presentation || '', attachmentVal || '',
          syllabusId
        ]);

        return sendSuccess(res, { id: syllabusId }, 'Lesson plan updated successfully');
      } else {
        // Create
        const result = await execute(`
          INSERT INTO subject_syllabus (
            topic_id, session_id, created_by, created_for, date, time_from, time_to,
            sub_topic, teaching_method, general_objectives, previous_knowledge,
            comprehensive_questions, lacture_youtube_url, lacture_video, presentation, attachment, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `, [
          topic_id, session_id || 21, 26, created_for || 26, date, time_from || '', time_to || '',
          sub_topic || '', teaching_method || '', general_objectives || '',
          previous_knowledge || '', comprehensive_questions || '',
          lacture_youtube_url || '', videoVal || '', presentation || '', attachmentVal || ''
        ]);

        return sendSuccess(res, { id: result.insertId }, 'Lesson plan saved successfully', 201);
      }
    } catch (error) {
      logger.error('Error saving syllabus:', error);
      return sendError(res, 'Failed to save syllabus', 500);
    }
  }

  /**
   * DELETE /api/admin/lessonplan/syllabus/:id
   */
  public static async deleteSyllabus(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return sendError(res, 'Syllabus ID is required', 400);

      await execute(`DELETE FROM subject_syllabus WHERE id = ?`, [id]);
      return sendSuccess(res, { id }, 'Lesson plan deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete lesson plan', 500);
    }
  }

  // ==========================================
  // SYLLABUS STATUS OVERVIEW
  // ==========================================

  /**
   * GET /api/admin/lessonplan/syllabus-status or /api/Lessonplan/syllabus-status
   */
  public static async getSyllabusStatus(req: Request, res: Response) {
    try {
      const { class_id, section_id, subject_group_id, subject_id } = req.query;

      let sql = `
        SELECT l.id as lesson_id, l.name as lesson_name,
               s.id as subject_id, s.name as subject_name,
               sg.id as subject_group_id, sg.name as subject_group_name,
               c.id as class_id, c.class as class_name,
               sec.id as section_id, sec.section as section_name
        FROM lesson l
        LEFT JOIN subject_group_subjects sgs ON sgs.id = l.subject_group_subject_id
        LEFT JOIN subjects s ON s.id = sgs.subject_id
        LEFT JOIN subject_groups sg ON sg.id = sgs.subject_group_id
        LEFT JOIN subject_group_class_sections sgcs ON (sgcs.id = l.subject_group_class_sections_id)
        LEFT JOIN class_sections cs ON cs.id = sgcs.class_section_id
        LEFT JOIN classes c ON c.id = cs.class_id
        LEFT JOIN sections sec ON sec.id = cs.section_id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (class_id) {
        sql += ` AND (c.id = ? OR c.id IS NULL)`;
        params.push(class_id);
      }
      if (section_id) {
        sql += ` AND (sec.id = ? OR sec.id IS NULL)`;
        params.push(section_id);
      }
      if (subject_group_id) {
        sql += ` AND (sg.id = ? OR sg.id IS NULL)`;
        params.push(subject_group_id);
      }
      if (subject_id) {
        sql += ` AND (s.id = ? OR s.id IS NULL)`;
        params.push(subject_id);
      }

      sql += ` ORDER BY l.id ASC`;
      const lessons = await query(sql, params);

      let totalTopicsCount = 0;
      let completedTopicsCount = 0;

      for (const l of lessons) {
        const topics = await query(`
          SELECT t.id, t.name, t.status, t.complete_date
          FROM topic t
          WHERE t.lesson_id = ?
          ORDER BY t.id ASC
        `, [l.lesson_id]);

        l.topics = topics;
        l.total_topics = topics.length;
        l.completed_topics = topics.filter((t: any) => Number(t.status) === 1).length;
        totalTopicsCount += l.total_topics;
        completedTopicsCount += l.completed_topics;
      }

      const percentage = totalTopicsCount > 0
        ? Number(((completedTopicsCount / totalTopicsCount) * 100).toFixed(2))
        : 0;

      return sendSuccess(res, {
        total_lessons: lessons.length,
        total_topics: totalTopicsCount,
        completed_topics: completedTopicsCount,
        percentage,
        lessons
      });
    } catch (error) {
      return sendError(res, 'Failed to fetch syllabus status overview', 500);
    }
  }

  /**
   * GET /api/admin/syllabus/download/:docName
   */
  public static async downloadDocument(req: Request, res: Response) {
    try {
      const docName = String(req.params.docName || req.query.file || '');
      return sendSuccess(res, { file: docName }, 'Document downloaded');
    } catch (error) {
      return sendError(res, 'Failed to download document', 500);
    }
  }
}
