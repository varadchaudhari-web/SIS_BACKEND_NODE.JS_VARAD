import { query, queryOne, execute, transaction } from '../../config/database';

export interface NotificationSettingRecord {
  id?: number | string;
  type: string;
  is_mail?: string | number;
  is_sms?: string | number;
  is_notification?: number;
  display_notification?: number;
  display_sms?: number;
  template: string;
  subject?: string;
  template_id?: string;
  variables?: string;
  created_at?: Date | string;
}

export class NotificationSettingModel {
  /**
   * Get notification settings record by ID or list all
   * 1:1 match with CodeIgniter Notificationsetting_model::get()
   */
  public static async get(id: number | string | null = null): Promise<NotificationSettingRecord | NotificationSettingRecord[] | null> {
    if (id !== null) {
      return await queryOne<NotificationSettingRecord>(`SELECT * FROM notification_setting WHERE id = ?`, [Number(id) || id]);
    }
    return await query<NotificationSettingRecord>(`SELECT * FROM notification_setting ORDER BY id ASC`);
  }

  /**
   * Get notification setting by type (e.g. 'student_admission')
   */
  public static async getByType(type: string): Promise<NotificationSettingRecord | null> {
    return await queryOne<NotificationSettingRecord>(`SELECT * FROM notification_setting WHERE type = ? LIMIT 1`, [type]);
  }

  /**
   * Update single notification setting
   * 1:1 match with CodeIgniter Notificationsetting_model::update()
   */
  public static async update(data: { id: number | string; template?: string; is_mail?: string; is_sms?: string; is_notification?: number }): Promise<boolean> {
    const id = Number(data.id);
    const updates: string[] = [];
    const values: any[] = [];

    if (data.template !== undefined) {
      updates.push(`template = ?`);
      values.push(data.template);
    }
    if (data.is_mail !== undefined) {
      updates.push(`is_mail = ?`);
      values.push(String(data.is_mail));
    }
    if (data.is_sms !== undefined) {
      updates.push(`is_sms = ?`);
      values.push(String(data.is_sms));
    }
    if (data.is_notification !== undefined) {
      updates.push(`is_notification = ?`);
      values.push(Number(data.is_notification));
    }

    if (updates.length === 0) return true;

    values.push(id);
    const res = await execute(`UPDATE notification_setting SET ${updates.join(', ')} WHERE id = ?`, values);
    return (res.affectedRows ?? 0) > 0;
  }

  /**
   * Update batch notification settings
   * 1:1 match with CodeIgniter Notificationsetting_model::updatebatch()
   */
  public static async updateBatch(
    items: Array<{ id: number | string; is_mail?: any; is_sms?: any; is_notification?: any; template?: string }>
  ): Promise<boolean> {
    if (!items || items.length === 0) return true;

    return await transaction(async (conn) => {
      for (const item of items) {
        const id = Number(item.id);
        const isMail = String(item.is_mail) === '1' || item.is_mail === 1 || item.is_mail === true ? '1' : '0';
        const isSms = String(item.is_sms) === '1' || item.is_sms === 1 || item.is_sms === true ? '1' : '0';
        const isNotification = String(item.is_notification) === '1' || item.is_notification === 1 || item.is_notification === true ? 1 : 0;

        if (item.template !== undefined && item.template.trim()) {
          await conn.execute(
            `UPDATE notification_setting 
             SET is_mail = ?, is_sms = ?, is_notification = ?, template = ? 
             WHERE id = ?`,
            [isMail, isSms, isNotification, item.template, id]
          );
        } else {
          await conn.execute(
            `UPDATE notification_setting 
             SET is_mail = ?, is_sms = ?, is_notification = ? 
             WHERE id = ?`,
            [isMail, isSms, isNotification, id]
          );
        }
      }
      return true;
    });
  }

  /**
   * Add or update by type
   * 1:1 match with CodeIgniter Notificationsetting_model::add()
   */
  public static async add(data: Partial<NotificationSettingRecord>): Promise<number> {
    const type = data.type || '';
    const id = data.id ? Number(data.id) : null;

    if (id) {
      const existing = await queryOne<NotificationSettingRecord>(`SELECT id FROM notification_setting WHERE id = ?`, [id]);
      if (existing) {
        await this.update({ ...data, id, is_mail: data.is_mail !== undefined ? String(data.is_mail) : undefined, is_sms: data.is_sms !== undefined ? String(data.is_sms) : undefined });
        return id;
      }
    }

    if (type) {
      const existing = await queryOne<NotificationSettingRecord>(`SELECT id FROM notification_setting WHERE type = ?`, [type]);
      if (existing && existing.id) {
        await this.update({ ...data, id: existing.id, is_mail: data.is_mail !== undefined ? String(data.is_mail) : undefined, is_sms: data.is_sms !== undefined ? String(data.is_sms) : undefined });
        return Number(existing.id);
      } else {
        const res = await execute(
          `INSERT INTO notification_setting (type, is_mail, is_sms, is_notification, display_notification, display_sms, template, variables) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            type,
            data.is_mail ? String(data.is_mail) : '0',
            data.is_sms ? String(data.is_sms) : '0',
            data.is_notification ? Number(data.is_notification) : 0,
            data.display_notification ?? 0,
            data.display_sms ?? 1,
            data.template || '',
            data.variables || '',
          ]
        );
        return res.insertId || 0;
      }
    }

    return 0;
  }
}
