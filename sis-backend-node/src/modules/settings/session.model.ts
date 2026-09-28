import { query, queryOne, execute, transaction } from '../../config/database';
import { SettingModel } from './setting.model';
import { logger } from '../../utils/logger';

export interface SessionRecord {
  id: number;
  session: string;
  is_active?: string;
  isActive?: boolean;
  active?: number;
  created_at?: string | Date;
  updated_at?: string | Date | null;
}

export class SessionModel {
  /**
   * Get session by ID or list all sessions ordered by id
   * 1:1 match with CodeIgniter Session_model::get($id = null)
   */
  public static async get(id: number | string | null = null): Promise<SessionRecord | SessionRecord[] | null> {
    if (id !== null) {
      return await queryOne<SessionRecord>(`SELECT * FROM sessions WHERE id = ?`, [Number(id) || id]);
    } else {
      return await query<SessionRecord>(`SELECT * FROM sessions ORDER BY id ASC`);
    }
  }

  /**
   * Get all sessions with 'active' flag joined with sch_settings.session_id
   * 1:1 match with CodeIgniter Session_model::getAllSession()
   */
  public static async getAllSession(): Promise<SessionRecord[]> {
    const activeSetting = await queryOne(`SELECT session_id FROM sch_settings LIMIT 1`);
    const activeSessionId = activeSetting?.session_id || 21;

    const rows = await query<any>(`
      SELECT 
        sessions.id,
        sessions.session,
        CASE 
          WHEN sessions.id = ? THEN 'yes'
          WHEN sessions.is_active = 'yes' OR sessions.is_active = '1' THEN 'yes'
          ELSE 'no'
        END AS is_active,
        CASE 
          WHEN sessions.id = ? THEN true
          WHEN sessions.is_active = 'yes' OR sessions.is_active = '1' THEN true
          ELSE false
        END AS "isActive",
        CASE 
          WHEN sessions.id = ? THEN 1
          WHEN sessions.is_active = 'yes' OR sessions.is_active = '1' THEN 1
          ELSE 0
        END AS active,
        sessions.created_at,
        sessions.updated_at
      FROM sessions
      ORDER BY 
        CASE WHEN sessions.id = ? THEN 0 ELSE 1 END,
        sessions.id DESC
    `, [activeSessionId, activeSessionId, activeSessionId, activeSessionId]);

    return rows;
  }

  /**
   * Get previous session given a session ID
   * 1:1 match with CodeIgniter Session_model::getPreSession($session_id)
   */
  public static async getPreSession(sessionId: number | string): Promise<SessionRecord | null> {
    const id = Number(sessionId) || 0;
    return await queryOne<SessionRecord>(`
      SELECT * FROM sessions 
      WHERE id IN (
        SELECT MAX(id) FROM sessions WHERE id < ?
      )
    `, [id]);
  }

  /**
   * Get all sessions a student has been enrolled in
   * 1:1 match with CodeIgniter Session_model::getStudentAcademicSession($student_id)
   */
  public static async getStudentAcademicSession(studentId: number | string): Promise<SessionRecord[]> {
    return await query<SessionRecord>(`
      SELECT sessions.* 
      FROM sessions
      INNER JOIN student_session ON sessions.id = student_session.session_id
      WHERE student_session.student_id = ?
      GROUP BY sessions.id, student_session.session_id
      ORDER BY sessions.id ASC
    `, [Number(studentId) || studentId]);
  }

  /**
   * Add or Update session record
   * 1:1 match with CodeIgniter Session_model::add($data)
   */
  public static async add(data: { id?: number | string; session: string; is_active?: string | boolean | number }): Promise<number> {
    SettingModel.clearCache();

    const markActive = data.is_active === 'yes' || data.is_active === '1' || data.is_active === 1 || data.is_active === true;

    return await transaction(async (conn) => {
      let resultId = 0;

      if (data.id) {
        const id = Number(data.id);
        await conn.execute(`UPDATE sessions SET session = ?, updated_at = CURRENT_DATE WHERE id = ?`, [data.session, id]);

        if (markActive) {
          await conn.execute(`UPDATE sessions SET is_active = 'no'`);
          await conn.execute(`UPDATE sessions SET is_active = 'yes' WHERE id = ?`, [id]);
          await conn.execute(`UPDATE sch_settings SET session_id = ?`, [id]);
        }
        resultId = id;
      } else {
        const [res] = await conn.execute(
          `INSERT INTO sessions (session, is_active) VALUES (?, ?)`,
          [data.session, markActive ? 'yes' : 'no']
        );
        resultId = res.insertId || 0;

        if (markActive && resultId) {
          await conn.execute(`UPDATE sessions SET is_active = 'no' WHERE id != ?`, [resultId]);
          await conn.execute(`UPDATE sch_settings SET session_id = ?`, [resultId]);
        }
      }

      return resultId;
    });
  }

  /**
   * Remove a session safely
   * 1:1 match with CodeIgniter Session_model::remove($id)
   */
  public static async remove(id: number | string): Promise<boolean> {
    SettingModel.clearCache();
    const sessId = Number(id);

    const activeSetting = await queryOne(`SELECT session_id FROM sch_settings LIMIT 1`);
    if (sessId === Number(activeSetting?.session_id)) {
      throw new Error('Cannot delete the active academic session!');
    }

    const studentCount = await queryOne<{ count: string | number }>(
      `SELECT COUNT(*) as count FROM student_session WHERE session_id = ?`,
      [sessId]
    );
    if (studentCount && Number(studentCount.count) > 0) {
      throw new Error(`Cannot delete session: ${studentCount.count} students are linked to this academic session.`);
    }

    const res = await execute(`DELETE FROM sessions WHERE id = ?`, [sessId]);
    return (res.affectedRows ?? 0) > 0;
  }
}
