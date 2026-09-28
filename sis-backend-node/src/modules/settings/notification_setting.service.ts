import { NotificationSettingModel, NotificationSettingRecord } from './notification_setting.model';
import { logger } from '../../utils/logger';

export class NotificationSettingService {
  /**
   * Get all notification events configured in DB
   */
  public static async getAllNotificationSettings(): Promise<NotificationSettingRecord[]> {
    const list = await NotificationSettingModel.get();
    return (list as NotificationSettingRecord[]) || [];
  }

  /**
   * Get single notification event by ID or Type
   */
  public static async getNotificationById(id: number | string): Promise<NotificationSettingRecord | null> {
    const item = await NotificationSettingModel.get(id);
    return (item as NotificationSettingRecord) || null;
  }

  /**
   * Update Notification Settings (Batch or single)
   */
  public static async updateNotificationSettings(payload: any): Promise<{ status: boolean; message: string }> {
    const items = Array.isArray(payload) ? payload : (payload.ids ? this.parseLegacyForm(payload) : [payload]);

    if (!items || items.length === 0) {
      throw new Error('No notification settings data provided to update');
    }

    await NotificationSettingModel.updateBatch(items);

    return {
      status: true,
      message: 'Notification settings and templates updated successfully',
    };
  }

  /**
   * Save individual event Canva / HTML message template
   */
  public static async saveTemplate(id: number | string, template: string, type?: string): Promise<{ status: boolean; message: string }> {
    if (!id && !type) {
      throw new Error('Notification event ID or type is required');
    }

    if (id) {
      await NotificationSettingModel.update({ id, template });
    } else if (type) {
      await NotificationSettingModel.add({ type, template });
    }

    return {
      status: true,
      message: 'Notification message template updated successfully',
    };
  }

  /**
   * Helper to parse legacy CodeIgniter form post format
   */
  private static parseLegacyForm(postBody: any) {
    const ids = Array.isArray(postBody.ids) ? postBody.ids : [postBody.ids];
    return ids.map((id: any) => ({
      id,
      is_mail: postBody[`mail_${id}`] || '0',
      is_sms: postBody[`sms_${id}`] || '0',
      is_notification: postBody[`notification_${id}`] || '0',
    }));
  }
}
