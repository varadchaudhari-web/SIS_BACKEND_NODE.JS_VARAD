import { query, queryOne, execute, transaction } from '../../config/database';
import { SettingModel } from './setting.model';

export class SettingsRepository {
  /**
   * Get full setting record with session and language names
   */
  public static async getSettingsRecord(): Promise<any> {
    return await SettingModel.getSetting();
  }

  /**
   * Get raw sch_settings row
   */
  public static async getRawSettings(): Promise<any> {
    return await queryOne(`SELECT * FROM sch_settings ORDER BY id ASC LIMIT 1`);
  }

  /**
   * Save or update sch_settings
   */
  public static async updateSettings(data: Record<string, any>): Promise<number> {
    return await SettingModel.add(data);
  }

  /**
   * Update Super Admin email in staff table
   */
  public static async updateSuperAdminEmail(email: string): Promise<void> {
    await execute(`
      UPDATE staff
      SET email = ?
      WHERE id IN (
        SELECT s.id FROM staff s
        LEFT JOIN staff_roles sr ON sr.staff_id = s.id
        LEFT JOIN roles r ON r.id = sr.role_id
        WHERE (r.id = 7 OR LOWER(r.name) = 'super admin' OR s.id = 9)
        AND s.is_active = 1
      )
    `, [email]);
  }

  /**
   * Get active academic session
   */
  public static async getActiveSession(): Promise<any> {
    const active = await queryOne(`SELECT * FROM sessions WHERE is_active = 'yes' LIMIT 1`);
    if (active) return active;
    return await queryOne(`SELECT * FROM sessions ORDER BY id DESC LIMIT 1`);
  }

  /**
   * Get all academic sessions
   */
  public static async getAllSessions(): Promise<any[]> {
    return await query(`
      SELECT * FROM sessions
      ORDER BY CASE WHEN is_active = 'yes' THEN 0 ELSE 1 END, id DESC
    `);
  }

  /**
   * Get all languages
   */
  public static async getAllLanguages(): Promise<any[]> {
    return await query(`
      SELECT * FROM languages
      WHERE (is_deleted != 'yes' OR is_deleted IS NULL)
      ORDER BY language ASC
    `);
  }

  /**
   * Save Logo filename to specific sch_settings column
   */
  public static async updateLogo(column: 'image' | 'admin_logo' | 'admin_small_logo' | 'app_logo', filename: string): Promise<void> {
    SettingModel.clearCache();
    const existing = await queryOne(`SELECT id FROM sch_settings LIMIT 1`);
    const id = existing?.id || 1;
    await execute(`UPDATE sch_settings SET ${column} = ? WHERE id = ?`, [filename, id]);
  }

  /**
   * Store Android App registration metadata
   */
  public static async registerApp(purchaseCode: string, email: string): Promise<void> {
    SettingModel.clearCache();
    const existing = await queryOne(`SELECT id FROM sch_settings LIMIT 1`);
    const id = existing?.id || 1;
    await execute(
      `UPDATE sch_settings SET app_primary_color_code = COALESCE(app_primary_color_code, '#424242') WHERE id = ?`,
      [id]
    );
  }
}
