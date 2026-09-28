import { SessionModel, SessionRecord } from './session.model';
import { SettingModel } from './setting.model';

export class SessionService {
  /**
   * Get all academic sessions with active indicators
   */
  public static async getAllSessions(): Promise<SessionRecord[]> {
    return await SessionModel.getAllSession();
  }

  /**
   * Get single session by ID
   */
  public static async getSessionById(id: number | string): Promise<SessionRecord | null> {
    const res = await SessionModel.get(id);
    return (res as SessionRecord) || null;
  }

  /**
   * Save (Create or Update) Academic Session
   */
  public static async saveSession(payload: { id?: number | string; session: string; is_active?: string | boolean | number }) {
    if (!payload.session || !payload.session.trim()) {
      throw new Error('Academic session name is required (e.g. 2026-27)');
    }

    const sessionName = payload.session.trim();
    const sessionId = await SessionModel.add({
      id: payload.id,
      session: sessionName,
      is_active: payload.is_active,
    });

    const isUpdated = Boolean(payload.id);
    return {
      id: sessionId,
      session: sessionName,
      is_active: payload.is_active ? 'yes' : 'no',
      message: isUpdated ? 'Session updated successfully' : 'Session created successfully',
    };
  }

  /**
   * Delete Session safely
   */
  public static async deleteSession(id: number | string) {
    if (!id) {
      throw new Error('Session ID is required');
    }
    await SessionModel.remove(id);
    return {
      id,
      message: 'Session deleted successfully',
    };
  }

  /**
   * Get Student Academic Sessions
   */
  public static async getStudentSessions(studentId: number | string) {
    return await SessionModel.getStudentAcademicSession(studentId);
  }

  /**
   * Get Previous Academic Session
   */
  public static async getPreviousSession(sessionId: number | string) {
    return await SessionModel.getPreSession(sessionId);
  }
}
