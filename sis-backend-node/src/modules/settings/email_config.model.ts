import { query, queryOne, execute, transaction } from '../../config/database';

export interface EmailConfigRecord {
  id?: number | string;
  email_type: string;
  smtp_server?: string;
  smtp_port?: string | number;
  smtp_username?: string;
  smtp_password?: string;
  ssl_tls?: string;
  is_active?: string;
  created_at?: Date | string;
}

export class EmailConfigModel {
  /**
   * Get email config record
   * 1:1 match with CodeIgniter Emailconfig_model::get()
   */
  public static async get(id: number | string | null = null): Promise<EmailConfigRecord | null> {
    if (id !== null) {
      return await queryOne<EmailConfigRecord>(`SELECT * FROM email_config WHERE id = ?`, [Number(id) || id]);
    }
    return await queryOne<EmailConfigRecord>(`SELECT * FROM email_config ORDER BY id ASC LIMIT 1`);
  }

  /**
   * Get email config by email_type
   * 1:1 match with CodeIgniter Emailconfig_model::get_emailbytype()
   */
  public static async getEmailByType(emailType: string): Promise<EmailConfigRecord | null> {
    return await queryOne<EmailConfigRecord>(`SELECT * FROM email_config WHERE email_type = ? LIMIT 1`, [emailType]);
  }

  /**
   * Get active email config
   * 1:1 match with CodeIgniter Emailconfig_model::getActiveEmail()
   */
  public static async getActiveEmail(): Promise<EmailConfigRecord | null> {
    const active = await queryOne<EmailConfigRecord>(`SELECT * FROM email_config WHERE is_active = 'yes' LIMIT 1`);
    if (active) return active;
    return await this.get();
  }

  /**
   * Add or update email config
   * 1:1 match with CodeIgniter Emailconfig_model::add()
   */
  public static async add(data: Partial<EmailConfigRecord>): Promise<number> {
    return await transaction(async (conn) => {
      const existing = await queryOne<EmailConfigRecord>(`SELECT * FROM email_config ORDER BY id ASC LIMIT 1`);

      if (existing && existing.id) {
        await conn.execute(
          `UPDATE email_config 
           SET email_type = ?, smtp_server = ?, smtp_port = ?, smtp_username = ?, smtp_password = ?, ssl_tls = ?, is_active = ? 
           WHERE id = ?`,
          [
            data.email_type || existing.email_type || 'smtp',
            data.smtp_server ?? existing.smtp_server ?? '',
            data.smtp_port ? String(data.smtp_port) : (existing.smtp_port ?? '587'),
            data.smtp_username ?? existing.smtp_username ?? '',
            data.smtp_password ?? existing.smtp_password ?? '',
            data.ssl_tls ?? existing.ssl_tls ?? 'tls',
            data.is_active ?? existing.is_active ?? 'yes',
            existing.id,
          ]
        );
        return Number(existing.id);
      } else {
        const [res] = await conn.execute(
          `INSERT INTO email_config (email_type, smtp_server, smtp_port, smtp_username, smtp_password, ssl_tls, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            data.email_type || 'smtp',
            data.smtp_server || '',
            data.smtp_port ? String(data.smtp_port) : '587',
            data.smtp_username || '',
            data.smtp_password || '',
            data.ssl_tls || 'tls',
            data.is_active || 'yes',
          ]
        );
        return res.insertId || 0;
      }
    });
  }
}
