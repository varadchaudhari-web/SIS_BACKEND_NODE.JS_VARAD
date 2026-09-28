import path from 'path';
import fs from 'fs';
import { SettingsRepository } from './settings.repository';
import { SessionService } from './session.service';
import { EmailConfigService } from './email_config.service';
import { NotificationSettingService } from './notification_setting.service';
import {
  TIMEZONES_LIST,
  CURRENCIES_LIST,
  DATE_FORMAT_LIST,
  MONTH_LIST,
  DIGIT_LIST,
  CURRENCY_PLACE,
} from './constants/settings.constants';

export class SettingsService {
  /**
   * Get full settings payload matching CodeIgniter Schsettings::index & frontend expectations
   */
  public static async getSystemSettingsData() {
    const rawSetting = await SettingsRepository.getSettingsRecord();
    const activeSession = await SettingsRepository.getActiveSession();

    const general = {
      id: rawSetting?.id || 1,
      name: rawSetting?.name || 'Sahyadri International School',
      sch_name: rawSetting?.name || 'Sahyadri International School',
      sch_dise_code: rawSetting?.dise_code || 'Your School Code',
      dise_code: rawSetting?.dise_code || 'Your School Code',
      sch_address: rawSetting?.address || 'Sahyadri Campus, Maharashtra, India',
      address: rawSetting?.address || 'Sahyadri Campus, Maharashtra, India',
      sch_phone: rawSetting?.phone || '8484075221',
      phone: rawSetting?.phone || '8484075221',
      sch_email: rawSetting?.email || 'admin@sahyadrischool.in',
      email: rawSetting?.email || 'admin@sahyadrischool.in',
      sch_session_id: String(rawSetting?.session_id || activeSession?.id || '21'),
      session_id: Number(rawSetting?.session_id || activeSession?.id || 21),
      sch_start_month: String(rawSetting?.start_month || '6'),
      start_month: Number(rawSetting?.start_month || 6),
      attendence_type: String(rawSetting?.attendence_type || '0'),
      biometric: String(rawSetting?.biometric || '0'),
      biometric_device: rawSetting?.biometric_device || 'Matrix COSEC, BioMax',
      biometric_devices: rawSetting?.biometric_device || 'Matrix COSEC, BioMax',
      sch_lang_id: String(rawSetting?.lang_id || '4'),
      lang_id: Number(rawSetting?.lang_id || 4),
      sch_is_rtl: rawSetting?.is_rtl || 'disabled',
      is_rtl: rawSetting?.is_rtl || 'disabled',
      sch_date_format: rawSetting?.date_format || 'd-m-Y',
      date_format: rawSetting?.date_format || 'd-m-Y',
      sch_timezone: rawSetting?.timezone || 'Asia/Kolkata',
      timezone: rawSetting?.timezone || 'Asia/Kolkata',
      sch_currency: rawSetting?.currency || 'INR',
      currency: rawSetting?.currency || 'INR',
      sch_currency_symbol: rawSetting?.currency_symbol || '₹',
      currency_symbol: rawSetting?.currency_symbol || '₹',
      currency_place: rawSetting?.currency_place || 'before_number',
      adm_auto_insert: String(rawSetting?.adm_auto_insert || '0'),
      adm_prefix: rawSetting?.adm_prefix || 'SIS',
      adm_digit: String(rawSetting?.adm_no_digit || '4'),
      adm_no_digit: String(rawSetting?.adm_no_digit || '4'),
      adm_start_from: String(rawSetting?.adm_start_from || '1001'),
      staffid_auto_insert: String(rawSetting?.staffid_auto_insert || '0'),
      staff_prefix: rawSetting?.staffid_prefix || 'STF',
      staffid_prefix: rawSetting?.staffid_prefix || 'STF',
      staff_digit: String(rawSetting?.staffid_no_digit || '4'),
      staffid_no_digit: String(rawSetting?.staffid_no_digit || '4'),
      staff_start_from: String(rawSetting?.staffid_start_from || '101'),
      staffid_start_from: String(rawSetting?.staffid_start_from || '101'),
      is_duplicate_fees_invoice: String(rawSetting?.is_duplicate_fees_invoice || '0'),
      fee_due_days: String(rawSetting?.fee_due_days || '60'),
      online_admission: String(rawSetting?.online_admission || '0'),
      class_teacher: rawSetting?.class_teacher || 'no',
      mobile_api_url: rawSetting?.mobile_api_url || 'https://api.sahyadrischool.in/mobile',
      app_primary_color_code: rawSetting?.app_primary_color_code || '#424242',
      app_secondary_color_code: rawSetting?.app_secondary_color_code || '#eeeeee',
      theme: rawSetting?.theme || 'default',
      image: rawSetting?.image || '',
      print_logo: rawSetting?.image || '',
      admin_logo: rawSetting?.admin_logo || '',
      admin_small_logo: rawSetting?.admin_small_logo || '',
      app_logo: rawSetting?.app_logo || '',
      student_profile_edit: rawSetting?.student_profile_edit || '0',
    };

    const allSessions = await SessionService.getAllSessions();
    const emailConfig = await EmailConfigService.getEmailConfig();
    const notifications = await NotificationSettingService.getAllNotificationSettings();

    return {
      general,
      session: activeSession || { id: 21, session: '2026-27' },
      sessions: allSessions,
      sessionList: allSessions,
      session_list: allSessions,
      email_config: emailConfig,
      emailConfig: emailConfig,
      notifications: notifications,
      notification_list: notifications,
      timezone_list: TIMEZONES_LIST,
      currency_list: CURRENCIES_LIST,
      dateFormatList: DATE_FORMAT_LIST,
      monthList: MONTH_LIST,
      digitList: DIGIT_LIST,
      currencyPlace: CURRENCY_PLACE,
    };
  }

  /**
   * Save General Settings with complete business validation and sync matching CodeIgniter Schsettings::ajax_schedit
   */
  public static async saveGeneralSettings(body: any) {
    const name = body.name || body.sch_name;
    const email = body.email || body.sch_email;
    const phone = body.phone || body.sch_phone;
    const address = body.address || body.sch_address;

    if (!name || !String(name).trim()) {
      throw new Error('School Name is required');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      throw new Error('Valid email address is required');
    }
    if (!phone || String(phone).replace(/\D/g, '').length < 10) {
      throw new Error('Phone number must be at least 10 digits');
    }
    if (!address || !String(address).trim()) {
      throw new Error('Address is required');
    }

    const admAuto = body.adm_auto_insert === '1' || body.adm_auto_insert === 1 || body.adm_auto_insert === true ? 1 : 0;
    const admPrefix = body.adm_prefix || 'SIS';
    const admDigit = Number(body.adm_digit || body.adm_no_digit || 4);
    const admStartFrom = Number(body.adm_start_from || 1001);

    if (admAuto === 1 && String(admStartFrom).length !== admDigit) {
      throw new Error(`Admission start from must be exactly ${admDigit} digits long`);
    }

    const staffAuto = body.staffid_auto_insert === '1' || body.staffid_auto_insert === 1 || body.staffid_auto_insert === true ? 1 : 0;
    const staffPrefix = body.staff_prefix || body.staffid_prefix || 'STF';
    const staffDigit = Number(body.staff_digit || body.staffid_no_digit || 4);
    const staffStartFrom = Number(body.staff_start_from || body.staffid_start_from || 101);

    if (staffAuto === 1 && String(staffStartFrom).length !== staffDigit) {
      throw new Error(`Staff ID start from must be exactly ${staffDigit} digits long`);
    }

    const existing = await SettingsRepository.getRawSettings();
    const settingId = existing?.id || Number(body.id) || 1;

    const dbPayload: Record<string, any> = {
      id: settingId,
      name: String(name).trim(),
      email: String(email).trim(),
      phone: String(phone).replace(/\D/g, '').slice(0, 15),
      address: String(address).trim(),
      dise_code: body.sch_dise_code || body.dise_code || '',
      session_id: Number(body.sch_session_id || body.session_id || 21),
      start_month: Number(body.sch_start_month || body.start_month || 6),
      attendence_type: String(body.attendence_type || '0'),
      biometric: String(body.biometric || '0'),
      biometric_device: body.biometric_devices || body.biometric_device || '',
      lang_id: Number(body.sch_lang_id || body.lang_id || 4),
      is_rtl: body.sch_is_rtl || body.is_rtl || 'disabled',
      date_format: body.sch_date_format || body.date_format || 'd-m-Y',
      timezone: body.sch_timezone || body.timezone || 'Asia/Kolkata',
      currency: body.sch_currency || body.currency || 'INR',
      currency_symbol: body.sch_currency_symbol || body.currency_symbol || '₹',
      currency_place: body.currency_place || 'before_number',
      adm_auto_insert: admAuto,
      adm_prefix: admPrefix,
      adm_no_digit: admDigit,
      adm_start_from: admStartFrom,
      staffid_auto_insert: staffAuto,
      staffid_prefix: staffPrefix,
      staffid_no_digit: staffDigit,
      staffid_start_from: staffStartFrom,
      is_duplicate_fees_invoice: String(body.is_duplicate_fees_invoice || '0'),
      fee_due_days: Number(body.fee_due_days || 60),
      online_admission: String(body.online_admission || '0'),
      class_teacher: body.class_teacher || 'no',
      mobile_api_url: body.mobile_api_url || '',
      app_primary_color_code: body.app_primary_color_code || '#424242',
      app_secondary_color_code: body.app_secondary_color_code || '#eeeeee',
      theme: body.theme || 'default',
    };

    await SettingsRepository.updateSettings(dbPayload);

    return {
      success: true,
      message: 'General settings updated successfully',
      data: dbPayload,
    };
  }

  /**
   * Save Uploaded Logo into correct directory and update sch_settings column
   */
  public static async saveUploadedLogo(
    logoType: 'printLogo' | 'adminLogo' | 'adminSmallLogo' | 'appLogo',
    file: Express.Multer.File
  ) {
    if (!file) {
      throw new Error('Logo file is required');
    }

    const typeConfigMap = {
      printLogo: {
        folder: 'logo',
        column: 'image' as const,
        prefix: 'print_logo',
      },
      adminLogo: {
        folder: 'admin_logo',
        column: 'admin_logo' as const,
        prefix: 'admin_logo',
      },
      adminSmallLogo: {
        folder: 'admin_small_logo',
        column: 'admin_small_logo' as const,
        prefix: 'admin_small_logo',
      },
      appLogo: {
        folder: 'logo/app_logo',
        column: 'app_logo' as const,
        prefix: 'app_logo',
      },
    };

    const config = typeConfigMap[logoType] || typeConfigMap.printLogo;
    const baseUploadDir = path.resolve(process.cwd(), 'uploads', 'school_content', config.folder);
    const legacyUploadDir = path.resolve(process.env.LEGACY_UPLOADS || '../Sahyadri-International-School-Backend/uploads', 'school_content', config.folder);

    if (!fs.existsSync(baseUploadDir)) {
      fs.mkdirSync(baseUploadDir, { recursive: true });
    }
    if (!fs.existsSync(legacyUploadDir)) {
      try {
        fs.mkdirSync(legacyUploadDir, { recursive: true });
      } catch {
        // Ignore if legacy path not writable
      }
    }

    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const filename = `1${ext}`;
    const targetPath = path.join(baseUploadDir, filename);
    const legacyTargetPath = path.join(legacyUploadDir, filename);

    // Save to primary uploads
    if (file.buffer) {
      fs.writeFileSync(targetPath, file.buffer);
      try {
        fs.writeFileSync(legacyTargetPath, file.buffer);
      } catch {}
    } else if (file.path) {
      fs.copyFileSync(file.path, targetPath);
      try {
        fs.copyFileSync(file.path, legacyTargetPath);
      } catch {}
    }

    // Cleanup old extension files with prefix '1.'
    const possibleExts = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'];
    for (const otherExt of possibleExts) {
      if (otherExt !== ext) {
        const oldFile = path.join(baseUploadDir, `1${otherExt}`);
        if (fs.existsSync(oldFile)) {
          try { fs.unlinkSync(oldFile); } catch {}
        }
        const oldLegacy = path.join(legacyUploadDir, `1${otherExt}`);
        if (fs.existsSync(oldLegacy)) {
          try { fs.unlinkSync(oldLegacy); } catch {}
        }
      }
    }

    await SettingsRepository.updateLogo(config.column, filename);

    const relativeUrl = `/uploads/school_content/${config.folder}/${filename}`;
    return {
      status: true,
      success: true,
      filename,
      logo_url: relativeUrl,
      message: 'Logo uploaded and saved successfully',
    };
  }

  /**
   * Register Android App
   */
  public static async registerAndroidApp(purchaseCode: string, email: string) {
    if (!purchaseCode || !email) {
      throw new Error('Purchase code and email are required');
    }
    await SettingsRepository.registerApp(purchaseCode, email);
    return {
      status: true,
      message: 'Android App Registered Successfully!',
    };
  }
}
