import { Router } from 'express';
import multer from 'multer';
import { SettingsController } from './settings.controller';
import { NotificationSettingService } from './notification_setting.service';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const router = Router();

// General Settings
router.get('/', SettingsController.getSettings);
router.post('/general', SettingsController.updateGeneralSettings);
router.post('/register-app', SettingsController.registerAndroidApp);
router.post('/logo', upload.single('file'), SettingsController.uploadLogo);
router.get('/timezones', SettingsController.getTimezones);
router.get('/currencies', SettingsController.getCurrencies);

// CodeIgniter legacy aliases
router.post('/ajax_schedit', SettingsController.updateGeneralSettings);
router.post('/ajax_editlogo', upload.single('file'), (req, res, next) => {
  req.body.logo_type = 'printLogo';
  SettingsController.uploadLogo(req, res);
});
router.post('/ajax_editadmin_adminlogo', upload.single('file'), (req, res, next) => {
  req.body.logo_type = 'adminLogo';
  SettingsController.uploadLogo(req, res);
});
router.post('/ajax_editadmin_smalllogo', upload.single('file'), (req, res, next) => {
  req.body.logo_type = 'adminSmallLogo';
  SettingsController.uploadLogo(req, res);
});
router.post('/ajax_applogo', upload.single('file'), (req, res, next) => {
  req.body.logo_type = 'appLogo';
  SettingsController.uploadLogo(req, res);
});

// Sessions
router.get('/sessions', SettingsController.getSessions);
router.get('/session', SettingsController.getSessions);
router.get('/sessions/:id', SettingsController.getSessionById);
router.get('/session/:id', SettingsController.getSessionById);
router.post('/sessions', SettingsController.saveSession);
router.post('/session', SettingsController.saveSession);
router.put('/sessions/:id', (req, res, next) => { req.body.id = req.params.id; SettingsController.saveSession(req, res); });
router.put('/session/:id', (req, res, next) => { req.body.id = req.params.id; SettingsController.saveSession(req, res); });
router.delete('/sessions/:id', (req, res, next) => { req.params.id = req.params.id; SettingsController.deleteSession(req, res); });
router.delete('/session/:id', (req, res, next) => { req.params.id = req.params.id; SettingsController.deleteSession(req, res); });
router.delete('/sessions', SettingsController.deleteSession);
router.delete('/session', SettingsController.deleteSession);

// CodeIgniter legacy routes for Sessions
router.post('/sessions/create', SettingsController.saveSession);
router.post('/sessions/edit/:id', (req, res, next) => { req.body.id = req.params.id; SettingsController.saveSession(req, res); });
router.all('/sessions/delete/:id', (req, res, next) => { req.params.id = req.params.id; SettingsController.deleteSession(req, res); });

// Languages & Phrases (i18n)
router.get('/languages', SettingsController.getLanguages);
router.post('/languages', SettingsController.saveLanguage);
router.delete('/languages', SettingsController.deleteLanguage);
router.get('/language-phrases', SettingsController.getLanguagePhrases);

// Roles & Permissions
router.get('/roles-permissions', SettingsController.getRolesPermissions);
router.get('/roles-permissions/tree/:role_id', SettingsController.getRolePermissionTree);
router.post('/roles-permissions', SettingsController.saveRolePermissions);
router.post('/roles-permissions/assign', SettingsController.assignRolePermissions);
router.delete('/roles-permissions', SettingsController.deleteRole);

// Notices & Announcements
router.get('/notices', SettingsController.getNotices);
router.post('/notices', SettingsController.saveNotice);
router.delete('/notices', SettingsController.deleteNotice);

// Custom Fields
router.get('/custom-fields', SettingsController.getCustomFields);
router.post('/custom-fields', SettingsController.saveCustomField);
router.delete('/custom-fields', SettingsController.deleteCustomField);
router.post('/custom-fields-order', SettingsController.genericSettingsHandler);
router.post('/system-fields', SettingsController.genericSettingsHandler);

// Security
router.get('/security-access', SettingsController.getSecurityAccess);
router.post('/security-access', SettingsController.updateSecurityAccess);

// Email Configuration
router.get('/email', SettingsController.getEmailConfig);
router.post('/email', SettingsController.saveEmailConfig);
router.post('/email/test', SettingsController.testEmail);
router.post('/test_mail', SettingsController.testEmail);

// Notification Settings & Templates
router.get('/notifications', SettingsController.getNotifications);
router.post('/notifications', SettingsController.updateNotifications);
router.post('/notification', SettingsController.updateNotifications);
router.post('/notification-template', SettingsController.saveNotificationTemplate);
router.post('/savetemplate', SettingsController.saveNotificationTemplate);
router.post('/gettemplate', (req, res) => {
  const id = req.body.id;
  NotificationSettingService.getNotificationById(id)
    .then(record => res.json({ status: 1, record, template: record?.template || '' }))
    .catch(err => res.status(500).json({ status: 0, error: err.message }));
});

// Other Settings modules
router.post('/sms', SettingsController.genericSettingsHandler);
router.post('/sms/test', SettingsController.genericSettingsHandler);
router.post('/payment', SettingsController.genericSettingsHandler);
router.post('/print-header-footer', SettingsController.genericSettingsHandler);
router.post('/front-cms', SettingsController.genericSettingsHandler);
router.post('/modules', SettingsController.genericSettingsHandler);
router.get('/backup-restore', (req, res) => res.json({ status: true, data: [] }));
router.post('/backup-restore', SettingsController.genericSettingsHandler);
router.delete('/backup-restore', SettingsController.genericSettingsHandler);
router.get('/cron-key', (req, res) => res.json({ status: true, cron_key: 'sah_cron_secret_key_2026' }));
router.post('/cron-key', (req, res) => res.json({ status: true, cron_key: 'sah_cron_secret_key_2026', message: 'Regenerated' }));
router.post('/profile-update', SettingsController.genericSettingsHandler);
router.get('/system-update', (req, res) => res.json({ status: true, data: { current_version: '1.0.0', latest_version: '1.0.0', update_available: false } }));
router.post('/system-update', SettingsController.genericSettingsHandler);

// Reports endpoints
router.all('/finance', SettingsController.financeReport);
router.all('/attendance', SettingsController.attendanceReport);
router.get('/hr_summary', SettingsController.hrSummary);
router.get('/transport', SettingsController.transportSummary);
router.get('/transport_summary', SettingsController.transportSummary);
router.get('/dropdowns', SettingsController.dropdowns);

export const settingsRoutes = router;
export const usersRoutes = Router()
  .get('/', SettingsController.getUsers)
  .post('/changeStatus', SettingsController.changeUserStatus);
