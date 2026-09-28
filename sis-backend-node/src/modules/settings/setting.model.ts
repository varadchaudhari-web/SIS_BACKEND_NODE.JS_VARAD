import { query, queryOne, execute, transaction } from '../../config/database';
import { logger } from '../../utils/logger';

export class SettingModel {
  private static _cached_get: any = null;
  private static _cached_setting: any = null;
  private static _cached_current_session: any = null;

  /**
   * Clears internal memory cache
   */
  public static clearCache() {
    this._cached_get = null;
    this._cached_setting = null;
    this._cached_current_session = null;
  }

  /**
   * SELECT VERSION()
   */
  public static async getMysqlVersion(): Promise<{ version: string } | null> {
    return await queryOne<{ version: string }>('SELECT VERSION() as version');
  }

  /**
   * SELECT @@sql_mode or equivalent
   */
  public static async getSqlMode(): Promise<{ mode: string } | null> {
    try {
      return await queryOne<{ mode: string }>('SHOW sql_mode');
    } catch {
      return { mode: 'STANDARD' };
    }
  }

  /**
   * Get Settings by ID or All Settings with sessions and languages joined
   */
  public static async get(id: number | string | null = null): Promise<any> {
    if (id === null && this._cached_get !== null) {
      return this._cached_get;
    }

    let sql = `
      SELECT sch_settings.id, sch_settings.lang_id, sch_settings.languages, sch_settings.class_teacher,
             sch_settings.is_rtl, sch_settings.cron_secret_key, sch_settings.timezone,
             sch_settings.name, sch_settings.email, sch_settings.biometric, sch_settings.biometric_device,
             sch_settings.time_format, sch_settings.phone, languages.language, sch_settings.attendence_type,
             sch_settings.address, sch_settings.dise_code, sch_settings.date_format, sch_settings.currency,
             sch_settings.currency_symbol, sch_settings.currency_place, sch_settings.start_month,
             sch_settings.session_id, sch_settings.fee_due_days, sch_settings.image, sch_settings.theme,
             sessions.session, sch_settings.online_admission, sch_settings.is_duplicate_fees_invoice,
             sch_settings.is_student_house, sch_settings.is_blood_group, sch_settings.admin_logo,
             sch_settings.admin_small_logo, sch_settings.mobile_api_url, sch_settings.app_primary_color_code,
             sch_settings.app_secondary_color_code, sch_settings.app_logo, sch_settings.student_profile_edit
      FROM sch_settings
      LEFT JOIN sessions ON sessions.id = sch_settings.session_id
      LEFT JOIN languages ON languages.id = sch_settings.lang_id
    `;
    const params: any[] = [];

    if (id !== null) {
      sql += ` WHERE sch_settings.id = ?`;
      params.push(Number(id) || id);
      const row = await queryOne(sql, params);
      return row;
    } else {
      sql += ` ORDER BY sch_settings.id ASC`;
      const result = await query(sql, params);

      if (Array.isArray(result) && result.length > 0 && result[0]) {
        result[0].current_session = {
          session_id: result[0].session_id ?? 1,
          session: result[0].session ?? '2026-27',
        };
      } else {
        const fallback = [
          {
            id: 1,
            session_id: 1,
            session: '2026-27',
            lang_id: 1,
            language: 'English',
            current_session: { session_id: 1, session: '2026-27' },
          },
        ];
        this._cached_get = fallback;
        return fallback;
      }

      this._cached_get = result;
      return result;
    }
  }

  /**
   * Get language ID for student user
   */
  public static async get_studentlang(userId: number | string) {
    return await queryOne(`SELECT lang_id FROM users WHERE user_id = ?`, [Number(userId) || userId]);
  }

  /**
   * Get language ID for parent user
   */
  public static async get_parentlang(id: number | string) {
    return await queryOne(`SELECT lang_id FROM users WHERE id = ?`, [Number(id) || id]);
  }

  /**
   * Get language ID for staff
   */
  public static async get_stafflang(staffId: number | string) {
    return await queryOne(`SELECT lang_id FROM staff WHERE id = ?`, [Number(staffId) || staffId]);
  }

  /**
   * Get School Detail
   */
  public static async getSchoolDetail(id: number | string | null = null) {
    let sql = `
      SELECT sch_settings.id, sch_settings.lang_id, sch_settings.is_rtl, sch_settings.timezone,
             sch_settings.name, sch_settings.email, sch_settings.biometric, sch_settings.biometric_device,
             sch_settings.phone, languages.language, sch_settings.address, sch_settings.dise_code,
             sch_settings.date_format, sch_settings.currency, sch_settings.currency_symbol,
             sch_settings.start_month, sch_settings.session_id, sch_settings.image, sch_settings.theme,
             sessions.session
      FROM sch_settings
      LEFT JOIN sessions ON sessions.id = sch_settings.session_id
      LEFT JOIN languages ON languages.id = sch_settings.lang_id
    `;
    const params: any[] = [];
    if (id !== null) {
      sql += ` WHERE sch_settings.id = ?`;
      params.push(Number(id) || id);
    }
    sql += ` ORDER BY sch_settings.id ASC LIMIT 1`;
    return await queryOne(sql, params);
  }

  /**
   * Get full Setting object (all field mappings from CodeIgniter Setting_model::getSetting)
   */
  public static async getSetting(): Promise<any> {
    if (this._cached_setting !== null) {
      return this._cached_setting;
    }

    const sql = `
      SELECT sch_settings.id, sch_settings.attendence_type, sch_settings.lang_id, sch_settings.is_rtl as is_rtl,
             sch_settings.fee_due_days, sch_settings.class_teacher, sch_settings.cron_secret_key, sch_settings.timezone,
             sch_settings.name, sch_settings.email, sch_settings.biometric, sch_settings.biometric_device,
             sch_settings.phone, sch_settings.adm_prefix, sch_settings.adm_start_from, languages.language,
             sch_settings.adm_no_digit, sch_settings.adm_update_status, sch_settings.adm_auto_insert,
             sch_settings.staffid_prefix, sch_settings.staffid_start_from, sch_settings.staffid_auto_insert,
             sch_settings.staffid_no_digit, sch_settings.staffid_update_status, sch_settings.address,
             sch_settings.dise_code, sch_settings.date_format, sch_settings.currency, sch_settings.currency_place,
             sch_settings.currency_symbol, sch_settings.start_month, sch_settings.session_id, sch_settings.image,
             sch_settings.theme, sessions.session, sch_settings.online_admission, sch_settings.is_duplicate_fees_invoice,
             sch_settings.is_student_house, sch_settings.is_blood_group, sch_settings.roll_no, sch_settings.lastname,
             sch_settings.category, sch_settings.cast, sch_settings.religion, sch_settings.mobile_no,
             sch_settings.student_email, sch_settings.admission_date, sch_settings.student_photo,
             sch_settings.student_height, sch_settings.student_weight, sch_settings.measurement_date,
             sch_settings.father_name, sch_settings.father_phone, sch_settings.father_occupation,
             sch_settings.father_pic, sch_settings.mother_name, sch_settings.mother_phone,
             sch_settings.mother_occupation, sch_settings.mother_pic, sch_settings.guardian_relation,
             sch_settings.guardian_email, sch_settings.guardian_pic, sch_settings.guardian_address,
             sch_settings.current_address, sch_settings.permanent_address, sch_settings.route_list,
             sch_settings.hostel_id, sch_settings.bank_account_no, sch_settings.national_identification_no,
             sch_settings.local_identification_no, sch_settings.rte, sch_settings.previous_school_details,
             sch_settings.student_note, sch_settings.upload_documents, sch_settings.staff_designation,
             sch_settings.staff_department, sch_settings.staff_last_name, sch_settings.staff_father_name,
             sch_settings.staff_mother_name, sch_settings.staff_date_of_joining, sch_settings.staff_phone,
             sch_settings.staff_emergency_contact, sch_settings.staff_marital_status, sch_settings.staff_photo,
             sch_settings.staff_current_address, sch_settings.staff_permanent_address, sch_settings.staff_qualification,
             sch_settings.staff_work_experience, sch_settings.staff_note, sch_settings.staff_epf_no,
             sch_settings.staff_basic_salary, sch_settings.staff_contract_type, sch_settings.staff_work_shift,
             sch_settings.staff_work_location, sch_settings.staff_leaves, sch_settings.staff_account_details,
             sch_settings.staff_social_media, sch_settings.staff_upload_documents, sch_settings.admin_logo,
             sch_settings.admin_small_logo, sch_settings.mobile_api_url, sch_settings.app_primary_color_code,
             sch_settings.app_secondary_color_code, sch_settings.app_logo, languages.short_code as language_code,
             sch_settings.student_profile_edit
      FROM sch_settings
      LEFT JOIN sessions ON sessions.id = sch_settings.session_id
      LEFT JOIN languages ON languages.id = sch_settings.lang_id
      ORDER BY sch_settings.id ASC
      LIMIT 1
    `;
    const res = await queryOne(sql);
    this._cached_setting = res;
    return res;
  }

  /**
   * Delete / Remove settings record
   */
  public static async remove(id: number | string): Promise<boolean> {
    this.clearCache();
    const res = await execute(`DELETE FROM sch_settings WHERE id = ?`, [Number(id) || id]);
    return (res.affectedRows ?? 0) > 0;
  }

  /**
   * Add or Update sch_settings matching CodeIgniter add() with admin staff email synchronization
   */
  public static async add(data: Record<string, any>): Promise<number> {
    this.clearCache();

    return await transaction(async (conn) => {
      let insertId = 0;

      if (data.id) {
        const id = Number(data.id);
        const newEmail = data.email ? String(data.email).trim() : '';

        if (newEmail) {
          const oldSetting = await queryOne(`SELECT email FROM sch_settings WHERE id = ?`, [id]);
          const oldEmail = oldSetting?.email ? String(oldSetting.email).trim() : '';

          if (oldEmail && oldEmail.toLowerCase() !== newEmail.toLowerCase()) {
            await conn.execute(`UPDATE staff SET email = ? WHERE email = ?`, [newEmail, oldEmail]);
          }

          await conn.execute(`
            UPDATE staff
            SET email = ?
            WHERE id IN (
              SELECT s.id FROM staff s
              LEFT JOIN staff_roles sr ON sr.staff_id = s.id
              LEFT JOIN roles r ON r.id = sr.role_id
              WHERE (r.id = 7 OR LOWER(r.name) = 'super admin' OR s.id = 9)
              AND s.is_active = 1
            )
          `, [newEmail]);
        }

        const fields = Object.keys(data).filter((k) => k !== 'id');
        if (fields.length > 0) {
          const setClauses = fields.map((f) => `${f} = ?`).join(', ');
          const values = fields.map((f) => data[f]);
          values.push(id);
          await conn.execute(`UPDATE sch_settings SET ${setClauses} WHERE id = ?`, values);
        }

        if (data.session_id) {
          const sessId = Number(data.session_id);
          await conn.execute(`UPDATE sessions SET is_active = 'no'`);
          await conn.execute(`UPDATE sessions SET is_active = 'yes' WHERE id = ?`, [sessId]);
        }
        insertId = id;
      } else {
        const fields = Object.keys(data);
        const placeholders = fields.map(() => '?').join(', ');
        const values = fields.map((f) => data[f]);
        const res = await conn.execute(
          `INSERT INTO sch_settings (${fields.join(', ')}) VALUES (${placeholders})`,
          values
        );
        insertId = res[0].insertId || 0;

        if (data.session_id) {
          const sessId = Number(data.session_id);
          await conn.execute(`UPDATE sessions SET is_active = 'no'`);
          await conn.execute(`UPDATE sessions SET is_active = 'yes' WHERE id = ?`, [sessId]);
        }

        if (data.email) {
          const newEmail = String(data.email).trim();
          await conn.execute(`
            UPDATE staff
            SET email = ?
            WHERE id IN (
              SELECT s.id FROM staff s
              LEFT JOIN staff_roles sr ON sr.staff_id = s.id
              LEFT JOIN roles r ON r.id = sr.role_id
              WHERE (r.id = 7 OR LOWER(r.name) = 'super admin' OR s.id = 9)
              AND s.is_active = 1
            )
          `, [newEmail]);
        }
      }

      return insertId;
    });
  }

  /**
   * Get Current Session ID
   */
  public static async getCurrentSession(): Promise<number> {
    if (this._cached_current_session !== null) {
      return this._cached_current_session;
    }
    const res = await this.get();
    if (Array.isArray(res) && res.length > 0 && res[0].session_id) {
      this._cached_current_session = Number(res[0].session_id);
    } else {
      this._cached_current_session = 1;
    }
    return this._cached_current_session;
  }

  /**
   * Get Online Admission Status
   */
  public static async getOnlineAdmissionStatus(): Promise<boolean> {
    const res = await this.get();
    if (Array.isArray(res) && res.length > 0 && (res[0].online_admission === 1 || res[0].online_admission === '1' || res[0].online_admission === true)) {
      return true;
    }
    return false;
  }

  /**
   * Get Current Session Name
   */
  public static async getCurrentSessionName(): Promise<string> {
    const res = await this.get();
    return res?.[0]?.session || '2026-27';
  }

  /**
   * Get Current School Name
   */
  public static async getCurrentSchoolName(): Promise<string> {
    const res = await this.get();
    return res?.[0]?.name || 'Sahyadri International School';
  }

  /**
   * Get Start Month
   */
  public static async getStartMonth(): Promise<number> {
    const res = await this.get();
    return Number(res?.[0]?.start_month || 1);
  }

  /**
   * Get Current Session Data
   */
  public static async getCurrentSessiondata(): Promise<any> {
    const res = await this.get();
    return res?.[0] || null;
  }

  /**
   * Get Currency
   */
  public static async getCurrency(): Promise<string> {
    const res = await this.get();
    return res?.[0]?.currency || 'INR';
  }

  /**
   * Get Currency Symbol
   */
  public static async getCurrencySymbol(): Promise<string> {
    const res = await this.get();
    return res?.[0]?.currency_symbol || '₹';
  }

  /**
   * Get Date Y-m-d
   */
  public static getDateYmd(): string {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }

  /**
   * Get Date d-m-Y
   */
  public static getDateDmy(): string {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  /**
   * Update cron secret key
   */
  public static async add_cronsecretkey(data: { cron_secret_key: string }, id: number | string) {
    this.clearCache();
    return await execute(`UPDATE sch_settings SET cron_secret_key = ? WHERE id = ?`, [data.cron_secret_key, Number(id) || id]);
  }

  /**
   * Get Language
   */
  public static async getLanguage(langId: number | string = 1) {
    return await queryOne(`SELECT language, short_code FROM languages WHERE id = ?`, [Number(langId) || langId]);
  }

  /**
   * Get Admin logo
   */
  public static async getAdminlogo(): Promise<string> {
    const row = await queryOne(`SELECT admin_logo FROM sch_settings LIMIT 1`);
    return row?.admin_logo || '';
  }

  /**
   * Get Admin small logo
   */
  public static async getAdminsmalllogo(): Promise<string> {
    const row = await queryOne(`SELECT admin_small_logo FROM sch_settings LIMIT 1`);
    return row?.admin_small_logo || '';
  }

  /**
   * Get App Name
   */
  public static async get_appname(): Promise<string> {
    const row = await queryOne(`SELECT name FROM sch_settings LIMIT 1`);
    return row?.name || 'Sahyadri International School';
  }

  /**
   * Check Print Header Image
   */
  public static async check_haederimage(type: string): Promise<number> {
    const check = await queryOne(`SELECT header_image FROM print_headerfooter WHERE print_type = ?`, [type]);
    return check && check.header_image ? 1 : 0;
  }

  /**
   * Add / Update Print Header Footer
   */
  public static async add_printheader(data: { print_type: string; header_image?: string; footer_content?: string }) {
    const existing = await queryOne(`SELECT id FROM print_headerfooter WHERE print_type = ?`, [data.print_type]);
    if (existing) {
      return await execute(
        `UPDATE print_headerfooter SET header_image = COALESCE(?, header_image), footer_content = COALESCE(?, footer_content) WHERE print_type = ?`,
        [data.header_image || null, data.footer_content || null, data.print_type]
      );
    } else {
      return await execute(
        `INSERT INTO print_headerfooter (print_type, header_image, footer_content) VALUES (?, ?, ?)`,
        [data.print_type, data.header_image || '', data.footer_content || '']
      );
    }
  }

  /**
   * Get All Print Headers
   */
  public static async get_printheader() {
    return await query(`SELECT * FROM print_headerfooter`);
  }

  /**
   * Get Receipt Header
   */
  public static async get_receiptheader(): Promise<string> {
    const row = await queryOne(`SELECT header_image FROM print_headerfooter WHERE print_type = 'student_receipt'`);
    return row?.header_image || '';
  }

  /**
   * Unlink Receipt Header
   */
  public static async unlink_receiptheader(): Promise<string> {
    const row = await queryOne(`SELECT header_image FROM print_headerfooter WHERE print_type = 'student_receipt'`);
    return row?.header_image || '';
  }

  /**
   * Get Receipt Footer
   */
  public static async get_receiptfooter(): Promise<string> {
    const row = await queryOne(`SELECT footer_content FROM print_headerfooter WHERE print_type = 'student_receipt'`);
    return row?.footer_content || '';
  }

  /**
   * Get Payslip Header
   */
  public static async get_payslipheader(): Promise<string> {
    const row = await queryOne(`SELECT header_image FROM print_headerfooter WHERE print_type = 'staff_payslip'`);
    return row?.header_image || '';
  }

  /**
   * Unlink Payslip Header
   */
  public static async unlink_payslipheader(): Promise<string> {
    const row = await queryOne(`SELECT header_image FROM print_headerfooter WHERE print_type = 'staff_payslip'`);
    return row?.header_image || '';
  }

  /**
   * Get Payslip Footer
   */
  public static async get_payslipfooter(): Promise<string> {
    const row = await queryOne(`SELECT footer_content FROM print_headerfooter WHERE print_type = 'staff_payslip'`);
    return row?.footer_content || '';
  }
}
