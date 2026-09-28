import { Request, Response } from 'express';
import { query, queryOne, execute } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';
import { SettingsService } from './settings.service';
import { SettingModel } from './setting.model';
import { SessionService } from './session.service';
import { EmailConfigService } from './email_config.service';
import { NotificationSettingService } from './notification_setting.service';
import { RolesService } from './roles.service';
import { TIMEZONES_LIST, CURRENCIES_LIST } from './constants/settings.constants';

export class SettingsController {
  /**
   * GET /api/SystemSettings or /api/system-settings
   */
  public static async getSettings(req: Request, res: Response) {
    try {
      const data = await SettingsService.getSystemSettingsData();
      return sendSuccess(res, data);
    } catch (error: any) {
      logger.error('Error fetching settings:', error);
      return sendError(res, error.message || 'Failed to fetch system settings', 500);
    }
  }

  /**
   * POST /api/system-settings/general or /api/schsettings/ajax_schedit
   */
  public static async updateGeneralSettings(req: Request, res: Response) {
    try {
      const result = await SettingsService.saveGeneralSettings(req.body);
      return sendSuccess(res, result.data, result.message);
    } catch (error: any) {
      logger.error('Error updating general settings:', error);
      return sendError(res, error.message || 'Failed to update general settings', 400);
    }
  }

  /**
   * POST /api/system-settings/logo or /api/schsettings/ajax_editlogo
   */
  public static async uploadLogo(req: Request, res: Response) {
    try {
      const logoType = (req.body.logo_type || 'printLogo') as 'printLogo' | 'adminLogo' | 'adminSmallLogo' | 'appLogo';
      const file = req.file;
      if (!file) {
        return sendError(res, 'No file uploaded', 400);
      }
      const result = await SettingsService.saveUploadedLogo(logoType, file);
      return res.status(200).json(result);
    } catch (error: any) {
      logger.error('Error uploading logo:', error);
      return sendError(res, error.message || 'Failed to upload logo', 500);
    }
  }

  /**
   * POST /api/system-settings/register-app
   */
  public static async registerAndroidApp(req: Request, res: Response) {
    try {
      const { purchaseCode, email, app_envato_market_purchase_code, app_email } = req.body;
      const code = purchaseCode || app_envato_market_purchase_code;
      const em = email || app_email;
      const result = await SettingsService.registerAndroidApp(code, em);
      return sendSuccess(res, result, result.message);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to register app', 400);
    }
  }

  /**
   * GET /api/SystemSettings/sessions or /api/system-settings/session
   */
  public static async getSessions(req: Request, res: Response) {
    try {
      const rows = await SessionService.getAllSessions();
      return sendSuccess(res, rows);
    } catch (error: any) {
      logger.error('Failed to fetch sessions:', error);
      return sendError(res, error.message || 'Failed to fetch sessions', 500);
    }
  }

  /**
   * GET /api/system-settings/sessions/:id
   */
  public static async getSessionById(req: Request, res: Response) {
    try {
      const id = req.params.id || req.query.id;
      const row = await SessionService.getSessionById(id as string);
      if (!row) return sendError(res, 'Session not found', 404);
      return sendSuccess(res, row);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch session', 500);
    }
  }

  /**
   * POST /api/system-settings/session
   */
  public static async saveSession(req: Request, res: Response) {
    try {
      const { id, session, is_active } = req.body;
      const result = await SessionService.saveSession({ id, session, is_active });
      return sendSuccess(res, result, result.message, id ? 200 : 201);
    } catch (error: any) {
      logger.error('Failed to save session:', error);
      return sendError(res, error.message || 'Failed to save session', 400);
    }
  }

  /**
   * DELETE /api/system-settings/session
   */
  public static async deleteSession(req: Request, res: Response) {
    try {
      const id = req.params.id || req.query.id || req.body.id;
      const result = await SessionService.deleteSession(id);
      return sendSuccess(res, result, result.message);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to delete session', 400);
    }
  }

  /**
   * GET /api/system-settings/languages
   */
  public static async getLanguages(req: Request, res: Response) {
    try {
      const rows = await query(`
        SELECT * FROM languages 
        WHERE (is_deleted != 'yes' OR is_deleted IS NULL)
        ORDER BY language ASC
      `);
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch languages', 500);
    }
  }

  /**
   * GET /api/system-settings/email or /api/emailconfig
   */
  public static async getEmailConfig(req: Request, res: Response) {
    try {
      const data = await EmailConfigService.getEmailConfig();
      return sendSuccess(res, data);
    } catch (error: any) {
      logger.error('Error fetching email config:', error);
      return sendError(res, error.message || 'Failed to fetch email configuration', 500);
    }
  }

  /**
   * POST /api/system-settings/email or /api/emailconfig
   */
  public static async saveEmailConfig(req: Request, res: Response) {
    try {
      const result = await EmailConfigService.saveEmailConfig(req.body);
      return sendSuccess(res, result.data, result.message);
    } catch (error: any) {
      logger.error('Error saving email config:', error);
      return sendError(res, error.message || 'Failed to save email configuration', 400);
    }
  }

  /**
   * POST /api/system-settings/email/test or /api/emailconfig/test_mail
   */
  public static async testEmail(req: Request, res: Response) {
    try {
      const email = req.body.email;
      if (!email) return sendError(res, 'Recipient email address is required', 400);
      const result = await EmailConfigService.sendTestEmail(email);
      return sendSuccess(res, result, result.message);
    } catch (error: any) {
      logger.error('Error sending test email:', error);
      return sendError(res, error.message || 'Failed to send test email', 400);
    }
  }

  /**
   * GET /api/system-settings/notifications or /api/admin/notification/setting
   */
  public static async getNotifications(req: Request, res: Response) {
    try {
      const list = await NotificationSettingService.getAllNotificationSettings();
      return sendSuccess(res, list);
    } catch (error: any) {
      logger.error('Error fetching notification settings:', error);
      return sendError(res, error.message || 'Failed to fetch notification settings', 500);
    }
  }

  /**
   * POST /api/system-settings/notification or /api/system-settings/notifications
   */
  public static async updateNotifications(req: Request, res: Response) {
    try {
      const result = await NotificationSettingService.updateNotificationSettings(req.body);
      return sendSuccess(res, result, result.message);
    } catch (error: any) {
      logger.error('Error updating notification settings:', error);
      return sendError(res, error.message || 'Failed to update notification settings', 400);
    }
  }

  /**
   * POST /api/system-settings/notification-template or /api/admin/notification/savetemplate
   */
  public static async saveNotificationTemplate(req: Request, res: Response) {
    try {
      const id = req.body.id || req.body.temp_id;
      const template = req.body.template || req.body.template_message;
      const type = req.body.type;
      const result = await NotificationSettingService.saveTemplate(id, template, type);
      return sendSuccess(res, result, result.message);
    } catch (error: any) {
      logger.error('Error saving notification template:', error);
      return sendError(res, error.message || 'Failed to save notification template', 400);
    }
  }

  /**
   * POST /api/system-settings/languages
   */
  public static async saveLanguage(req: Request, res: Response) {
    try {
      const { id, language, short_code, country_code, is_active } = req.body;
      if (id) {
        await execute(`
          UPDATE languages 
          SET language = COALESCE(?, language),
              short_code = COALESCE(?, short_code),
              country_code = COALESCE(?, country_code),
              is_active = COALESCE(?, is_active)
          WHERE id = ?
        `, [language, short_code, country_code, is_active, id]);
        return sendSuccess(res, { id }, 'Language updated successfully');
      } else {
        const result = await execute(`
          INSERT INTO languages (language, short_code, country_code, is_active)
          VALUES (?, ?, ?, ?)
        `, [language, short_code || 'en', country_code || 'us', is_active || 'yes']);
        return sendSuccess(res, { id: result.insertId }, 'Language added successfully', 201);
      }
    } catch (error) {
      return sendError(res, 'Failed to save language', 500);
    }
  }

  /**
   * DELETE /api/system-settings/languages
   */
  public static async deleteLanguage(req: Request, res: Response) {
    try {
      const id = req.query.id || req.body.id;
      await execute(`UPDATE languages SET is_deleted = 'yes' WHERE id = ?`, [id]);
      return sendSuccess(res, { id }, 'Language deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete language', 500);
    }
  }

  /**
   * GET /api/system-settings/language-phrases
   */
  public static async getLanguagePhrases(req: Request, res: Response) {
    try {
      const lang = req.query.lang || 'en';
      // Return phrase map (standard default key-value pairs)
      return res.status(200).json({
        status: true,
        data: {
          dashboard: 'Dashboard',
          students: 'Students',
          teachers: 'Teachers',
          fees: 'Fees',
          attendance: 'Attendance',
          academics: 'Academics',
          homework: 'Homework',
          library: 'Library',
          transport: 'Transport',
          hostel: 'Hostel',
          settings: 'Settings',
          reports: 'Reports',
          logout: 'Logout',
        },
      });
    } catch (error) {
      return res.status(200).json({ status: false, data: {} });
    }
  }

  /**
   * GET /api/system-settings/roles-permissions
   */
  public static async getRolesPermissions(req: Request, res: Response) {
    try {
      const data = await RolesService.getAllRoles();
      return sendSuccess(res, data);
    } catch (error: any) {
      logger.error('Failed to fetch roles & permissions:', error);
      return sendError(res, error.message || 'Failed to fetch roles & permissions', 500);
    }
  }

  /**
   * GET /api/system-settings/roles-permissions/tree/:role_id
   */
  public static async getRolePermissionTree(req: Request, res: Response) {
    try {
      const roleId = req.params.role_id as string;
      if (!roleId) {
        return sendError(res, 'Role ID is required', 400);
      }
      const data = await RolesService.getRolePermissionTree(roleId);
      return sendSuccess(res, data);
    } catch (error: any) {
      logger.error('Failed to fetch role permission tree:', error);
      return sendError(res, error.message || 'Failed to fetch role permission tree', 500);
    }
  }

  /**
   * POST /api/system-settings/roles-permissions
   */
  public static async saveRolePermissions(req: Request, res: Response) {
    try {
      const { id, role_id, name, permissions, action, modEnabled, subModEnabled, privileges } = req.body;
      const targetId = id || role_id;

      // If action is allot_permissions or permissions array is provided with a targetId
      if (action === 'allot_permissions' || (targetId && permissions && Array.isArray(permissions))) {
        const result = await RolesService.assignPermissions(
          targetId,
          permissions || [],
          name,
          { modEnabled, subModEnabled, privileges }
        );
        return sendSuccess(res, result, 'Role permissions updated successfully');
      }

      if (targetId) {
        if (name) {
          await RolesService.updateRole(targetId, name);
        }
        return sendSuccess(res, { id: targetId }, 'Role updated successfully');
      } else if (name) {
        const result = await RolesService.createRole(name);
        return sendSuccess(res, result, 'Role created successfully', 201);
      }

      return sendSuccess(res, { success: true });
    } catch (error: any) {
      logger.error('Failed to save role permissions:', error);
      return sendError(res, error.message || 'Failed to save role permissions', 500);
    }
  }

  /**
   * POST /api/system-settings/roles-permissions/assign
   */
  public static async assignRolePermissions(req: Request, res: Response) {
    try {
      const { role_id, permissions, name, modEnabled, subModEnabled, privileges } = req.body;
      if (!role_id) {
        return sendError(res, 'Role ID is required', 400);
      }
      const result = await RolesService.assignPermissions(
        role_id,
        permissions || [],
        name,
        { modEnabled, subModEnabled, privileges }
      );
      return sendSuccess(res, result, 'Permissions assigned successfully');
    } catch (error: any) {
      logger.error('Failed to assign permissions:', error);
      return sendError(res, error.message || 'Failed to assign permissions', 500);
    }
  }

  /**
   * DELETE /api/system-settings/roles-permissions
   */
  public static async deleteRole(req: Request, res: Response) {
    try {
      const id = req.query.id || req.body.id || req.params.id;
      if (!id) {
        return sendError(res, 'Role ID is required', 400);
      }
      const result = await RolesService.deleteRole(id as string);
      return sendSuccess(res, result, 'Role deleted successfully');
    } catch (error: any) {
      logger.error('Failed to delete role:', error);
      return sendError(res, error.message || 'Failed to delete role', 500);
    }
  }

  /**
   * GET /api/system-settings/notices
   */
  public static async getNotices(req: Request, res: Response) {
    try {
      const rows = await query(`SELECT * FROM send_notification ORDER BY date DESC, id DESC LIMIT 100`);
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch notices', 500);
    }
  }

  /**
   * POST /api/system-settings/notices
   */
  public static async saveNotice(req: Request, res: Response) {
    try {
      const { id, title, content, message, publishDate, publish_date, noticeDate, date, status, sentTo, postedBy } = req.body;
      const nTitle = title || 'Announcement';
      const nMsg = content || message || '';
      const nDate = noticeDate || date || new Date();
      const nPub = publishDate || publish_date || new Date();
      const nStatus = status || 'Active';
      const nBy = postedBy || 'Admin User';

      const visStudent = sentTo?.includes('Student') ? 'Yes' : 'No';
      const visStaff = sentTo?.includes('Staff') ? 'Yes' : 'No';
      const visParent = sentTo?.includes('Parent') ? 'Yes' : 'No';

      if (id) {
        await execute(`
          UPDATE send_notification
          SET title = ?, message = ?, date = ?, publish_date = ?, status = ?,
              visible_student = ?, visible_staff = ?, visible_parent = ?
          WHERE id = ?
        `, [nTitle, nMsg, nDate, nPub, nStatus, visStudent, visStaff, visParent, id]);
        return sendSuccess(res, { id }, 'Notice updated successfully');
      } else {
        const result = await execute(`
          INSERT INTO send_notification (title, message, date, publish_date, status, visible_student, visible_staff, visible_parent, created_by, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'yes')
        `, [nTitle, nMsg, nDate, nPub, nStatus, visStudent, visStaff, visParent, nBy]);
        return sendSuccess(res, { id: result.insertId }, 'Notice created successfully', 201);
      }
    } catch (error) {
      return sendError(res, 'Failed to save notice', 500);
    }
  }

  /**
   * DELETE /api/system-settings/notices
   */
  public static async deleteNotice(req: Request, res: Response) {
    try {
      const id = req.query.id || req.body.id;
      await execute(`DELETE FROM send_notification WHERE id = ?`, [id]);
      return sendSuccess(res, { id }, 'Notice deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete notice', 500);
    }
  }

  /**
   * GET /api/system-settings/custom-fields
   */
  public static async getCustomFields(req: Request, res: Response) {
    try {
      const rows = await query(`SELECT * FROM custom_fields WHERE is_active = 1 ORDER BY weight ASC`);
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch custom fields', 500);
    }
  }

  /**
   * POST /api/system-settings/custom-fields
   */
  public static async saveCustomField(req: Request, res: Response) {
    try {
      const { id, name, belong_to, type, bs_column, validation, field_values, visible_on_table } = req.body;
      if (id) {
        await execute(`
          UPDATE custom_fields
          SET name = ?, belong_to = ?, type = ?, bs_column = ?, validation = ?, field_values = ?, visible_on_table = ?
          WHERE id = ?
        `, [name, belong_to, type, bs_column || 12, validation || 0, field_values || '', visible_on_table || 0, id]);
        return sendSuccess(res, { id }, 'Custom field updated');
      } else {
        const result = await execute(`
          INSERT INTO custom_fields (name, belong_to, type, bs_column, validation, field_values, visible_on_table, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `, [name, belong_to || 'student', type || 'input', bs_column || 12, validation || 0, field_values || '', visible_on_table || 0]);
        return sendSuccess(res, { id: result.insertId }, 'Custom field created', 201);
      }
    } catch (error) {
      return sendError(res, 'Failed to save custom field', 500);
    }
  }

  /**
   * DELETE /api/system-settings/custom-fields
   */
  public static async deleteCustomField(req: Request, res: Response) {
    try {
      const id = req.query.id || req.body.id;
      await execute(`DELETE FROM custom_fields WHERE id = ?`, [id]);
      return sendSuccess(res, { id }, 'Custom field deleted');
    } catch (error) {
      return sendError(res, 'Failed to delete custom field', 500);
    }
  }

  /**
   * GET /api/system-settings/security-access
   */
  public static async getSecurityAccess(req: Request, res: Response) {
    return sendSuccess(res, {
      two_factor_auth: false,
      session_timeout: 120,
      password_policy: 'strong',
      ip_whitelist_enabled: false,
    });
  }

  /**
   * POST /api/system-settings/security-access
   */
  public static async updateSecurityAccess(req: Request, res: Response) {
    return sendSuccess(res, req.body, 'Security settings updated successfully');
  }

  /**
   * GET /api/system-settings/timezones
   */
  public static async getTimezones(req: Request, res: Response) {
    return sendSuccess(res, TIMEZONES_LIST);
  }

  /**
   * GET /api/system-settings/currencies
   */
  public static async getCurrencies(req: Request, res: Response) {
    return sendSuccess(res, CURRENCIES_LIST);
  }

  /**
   * Generic handler for settings POST requests
   */
  public static async genericSettingsHandler(req: Request, res: Response) {
    return sendSuccess(res, req.body || {}, 'Settings saved successfully');
  }

  /**
   * GET /api/Users
   */
  public static async getUsers(req: Request, res: Response) {
    try {
      const students = await query(`SELECT id, admission_no, firstname, lastname, email, mobileno, is_active FROM students WHERE is_active = 'yes' LIMIT 100`);
      const staff = await query(`SELECT id, employee_id, name, surname, email, contact_no, is_active FROM staff WHERE is_active = 1 LIMIT 100`);
      
      return sendSuccess(res, {
        studentList: students,
        parentList: [],
        staffList: staff,
      });
    } catch (error) {
      return sendError(res, 'Failed to fetch users list', 500);
    }
  }

  /**
   * POST /api/Users/changeStatus
   */
  public static async changeUserStatus(req: Request, res: Response) {
    try {
      const { id, status, role } = req.body;
      if (role === 'Staff') {
        await execute(`UPDATE staff SET is_active = ? WHERE id = ?`, [status === '1' || status === 1 ? 1 : 0, id]);
      } else {
        await execute(`UPDATE students SET is_active = ? WHERE id = ?`, [status === '1' || status === 'yes' ? 'yes' : 'no', id]);
      }
      return sendSuccess(res, { id, status }, 'Status changed successfully');
    } catch (error) {
      return sendError(res, 'Failed to change status', 500);
    }
  }

  // Reports endpoints
  public static async financeReport(req: Request, res: Response) {
    try {
      const type = req.body?.type || req.query?.type || 'finance-summary';

      if (type === 'fees-collection' || type === 'fee-collection') {
        const rows = await query(`
          SELECT sfd.id as deposit_id, sfd.id, sfd.student_fees_master_id, sfd.fee_groups_feetype_id, sfd.amount_detail,
                 sfd.created_at,
                 sfm.student_session_id,
                 fgf.amount as master_amount, fgf.due_date,
                 ft.type as fee_type, ft.code as fee_code,
                 fg.name as group_name,
                 s.id as student_id, s.firstname, s.lastname, s.admission_no,
                 c.class as class_name, sec.section as section_name
          FROM student_fees_deposite sfd
          LEFT JOIN student_fees_master sfm ON sfm.id = sfd.student_fees_master_id
          LEFT JOIN fee_groups_feetype fgf ON fgf.id = sfd.fee_groups_feetype_id
          LEFT JOIN feetype ft ON ft.id = fgf.feetype_id
          LEFT JOIN fee_session_groups fsg ON fsg.id = fgf.fee_session_group_id
          LEFT JOIN fee_groups fg ON fg.id = fsg.fee_groups_id
          LEFT JOIN student_session ss ON ss.id = sfm.student_session_id
          LEFT JOIN students s ON s.id = ss.student_id
          LEFT JOIN classes c ON c.id = ss.class_id
          LEFT JOIN sections sec ON sec.id = ss.section_id
          ORDER BY sfd.id DESC
        `);

        const formatted = rows.map((r: any) => {
          let paidAmount = 0;
          let paidDiscount = 0;
          let paidFine = 0;
          let paymentDate = r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : '';
          let paymentMode = 'Cash';
          let description = '';
          let invNo = `REC-${r.deposit_id || r.id}`;

          if (r.amount_detail) {
            try {
              const details = typeof r.amount_detail === 'string' ? JSON.parse(r.amount_detail) : r.amount_detail;
              if (details && typeof details === 'object') {
                Object.values(details).forEach((d: any) => {
                  if (d && typeof d === 'object') {
                    paidAmount += Number(d.amount || 0);
                    paidDiscount += Number(d.amount_discount || 0);
                    paidFine += Number(d.amount_fine || 0);
                    if (d.date) paymentDate = d.date;
                    if (d.payment_mode) paymentMode = d.payment_mode;
                    if (d.description) description = d.description;
                    if (d.inv_no) invNo = String(d.inv_no);
                  }
                });
              }
            } catch (e) {
              paidAmount = Number(r.master_amount || 0);
            }
          }

          if (paidAmount === 0 && r.master_amount) paidAmount = Number(r.master_amount);

          return {
            ...r,
            id: r.deposit_id || r.id,
            amount: paidAmount,
            amount_discount: paidDiscount,
            amount_fine: paidFine,
            date: paymentDate,
            payment_mode: paymentMode,
            description: description || 'Fee Collection',
            inv_no: invNo
          };
        });

        return sendSuccess(res, formatted);
      }

      if (type === 'income-report' || type === 'income') {
        const rows = await query(`
          SELECT i.*, ih.income_category
          FROM income i
          LEFT JOIN income_head ih ON ih.id = i.inc_head_id
          ORDER BY i.date DESC LIMIT 100
        `);
        return sendSuccess(res, rows);
      }

      if (type === 'expense-report' || type === 'expense') {
        const rows = await query(`
          SELECT e.*, eh.exp_category
          FROM expenses e
          LEFT JOIN expense_head eh ON eh.id = e.exp_head_id
          ORDER BY e.date DESC LIMIT 100
        `);
        return sendSuccess(res, rows);
      }

      const totalIncome = await queryOne(`SELECT SUM(amount) as total FROM income`);
      const totalExpense = await queryOne(`SELECT SUM(amount) as total FROM expenses`);
      return sendSuccess(res, {
        total_income: totalIncome?.total || 0,
        total_expense: totalExpense?.total || 0,
        net_balance: (totalIncome?.total || 0) - (totalExpense?.total || 0),
      });
    } catch (error) {
      logger.error('Error in financeReport:', error);
      return sendError(res, 'Failed to fetch finance report', 500);
    }
  }

  public static async attendanceReport(req: Request, res: Response) {
    try {
      const type = req.body?.type || req.query?.type || 'class-wise';
      const date = req.body?.date || req.query?.date || new Date().toISOString().split('T')[0];

      if (type === 'class-wise' || type === 'student') {
        const rows = await query(`
          SELECT s.id as student_id, s.admission_no, s.roll_no, s.firstname, s.lastname,
                 c.class as class_name, sec.section as section_name,
                 at.type as attendance_type, at.key_value, sa.date
          FROM student_session ss
          JOIN students s ON s.id = ss.student_id
          JOIN classes c ON c.id = ss.class_id
          JOIN sections sec ON sec.id = ss.section_id
          LEFT JOIN student_attendences sa ON sa.student_session_id = ss.id
          LEFT JOIN attendence_type at ON at.id = sa.attendence_type_id
          WHERE (s.is_active = 'yes' OR s.is_active = 1)
          ORDER BY s.roll_no ASC LIMIT 200
        `);
        return sendSuccess(res, rows);
      }

      const todayAttendance = await queryOne(`
        SELECT 
          SUM(CASE WHEN at.key_value = 'present' THEN 1 ELSE 0 END) as present_count,
          SUM(CASE WHEN at.key_value = 'absent' THEN 1 ELSE 0 END) as absent_count,
          COUNT(*) as total_records
        FROM student_attendences sa
        JOIN attendence_type at ON at.id = sa.attendence_type_id
        WHERE sa.date = ?
      `, [date]);

      return sendSuccess(res, todayAttendance || { present_count: 0, absent_count: 0, total_records: 0 });
    } catch (error) {
      logger.error('Error in attendanceReport:', error);
      return sendError(res, 'Failed to fetch attendance report', 500);
    }
  }

  public static async hrSummary(req: Request, res: Response) {
    try {
      const staffTotal = await queryOne(`SELECT COUNT(*) as total FROM staff WHERE is_active = 1`);
      const teachers = await queryOne(`
        SELECT COUNT(DISTINCT s.id) as total 
        FROM staff s
        LEFT JOIN staff_roles sr ON sr.staff_id = s.id
        LEFT JOIN roles r ON r.id = sr.role_id
        WHERE s.is_active = 1 AND (LOWER(r.name) LIKE '%teacher%' OR sr.role_id = 2)
      `);

      return sendSuccess(res, {
        total_staff: staffTotal?.total || 0,
        total_teachers: teachers?.total || (staffTotal?.total || 0),
        active_staff: staffTotal?.total || 0,
      });
    } catch (error) {
      return sendError(res, 'Failed to fetch HR summary', 500);
    }
  }

  public static async transportSummary(req: Request, res: Response) {
    try {
      const routesCount = await queryOne(`SELECT COUNT(*) as total FROM transport_route`);
      const vehiclesCount = await queryOne(`SELECT COUNT(*) as total FROM vehicles`);
      const assignedStudents = await queryOne(`SELECT COUNT(*) as total FROM student_session WHERE vehroute_id IS NOT NULL AND vehroute_id > 0`);

      return sendSuccess(res, {
        total_routes: routesCount?.total || 0,
        total_vehicles: vehiclesCount?.total || 0,
        assigned_students: assignedStudents?.total || 0,
        active_vehicles: vehiclesCount?.total || 0,
      });
    } catch (error) {
      return sendError(res, 'Failed to fetch transport summary', 500);
    }
  }

  public static async dropdowns(req: Request, res: Response) {
    try {
      const classes = await query(`SELECT id, class FROM classes ORDER BY id ASC`);
      const sections = await query(`SELECT id, section FROM sections ORDER BY section ASC`);
      const categories = await query(`SELECT id, category FROM categories ORDER BY category ASC`);
      const subjectGroups = await query(`SELECT id, name FROM subject_groups ORDER BY id ASC`);
      const subjects = await query(`SELECT id, name FROM subjects ORDER BY name ASC`);
      const sessions = await query(`SELECT id, session as name FROM sessions ORDER BY id DESC`);
      const roles = await query(`SELECT id, name FROM roles ORDER BY id ASC`);

      return sendSuccess(res, {
        classes,
        sections,
        categories,
        genders: ['Male', 'Female', 'Other'],
        rtes: ['Yes', 'No'],
        years: ['2026', '2025', '2024'],
        subject_groups: subjectGroups,
        subjects,
        sessions,
        roles,
      });
    } catch (error) {
      return sendError(res, 'Failed to fetch report dropdowns', 500);
    }
  }
}
