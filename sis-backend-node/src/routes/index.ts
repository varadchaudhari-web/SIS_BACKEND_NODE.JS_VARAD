import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.routes';
import { hrRoutes } from '../modules/hr/hr.routes';
import { collectionsRoutes } from '../modules/collections/collections.routes';
import { academicsRoutes } from '../modules/academics/academics.routes';
import { studentRoutes } from '../modules/students/student.routes';
import { parentRoutes } from '../modules/parent/parent.routes';
import { attendanceRoutes } from '../modules/attendance/attendance.routes';
import { homeworkRoutes } from '../modules/homework/homework.routes';
import { lessonPlanRoutes } from '../modules/lessonplan/lessonplan.routes';
import { feesRoutes, incomeRouter, expenseRouter } from '../modules/fees/fees.routes';
import { examsRoutes } from '../modules/exams/exams.routes';
import { hostelRoutes } from '../modules/hostel/hostel.routes';
import { sportsRoutes } from '../modules/sports/sports.routes';
import { libraryRoutes } from '../modules/library/library.routes';
import { inventoryRoutes } from '../modules/inventory/inventory.routes';
import { transportRoutes } from '../modules/transport/transport.routes';
import { frontOfficeRoutes } from '../modules/frontoffice/frontoffice.routes';
import { communicateRoutes } from '../modules/communicate/communicate.routes';
import { inboxRoutes } from '../modules/communicate/inbox.routes';
import { cmsRoutes } from '../modules/cms/cms.routes';
import { certificateRoutes, idCardRoutes } from '../modules/certificate/certificate.routes';
import { settingsRoutes, usersRoutes } from '../modules/settings/settings.routes';
import { sessionRoutes } from '../modules/settings/session.routes';
import { calendarRoutes } from '../modules/calendar/calendar.routes';
import { downloadCenterRoutes } from '../modules/downloadcenter/downloadcenter.routes';
import { alumniRoutes } from '../modules/alumni/alumni.routes';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: true, message: 'Sahyadri SIS Node.js TypeScript API is Healthy 🚀' });
});

// Phase 1 & 2: Auth, HR, Collections, Academics, Students, Parents, Attendance, Homework, Lesson Plan
router.use('/Auth', authRoutes);
router.use('/auth', authRoutes);

router.use('/HumanResource', hrRoutes);
router.use('/humanresource', hrRoutes);
router.use('/human-resource', hrRoutes);
router.use('/hr', hrRoutes);

router.use('/collections', collectionsRoutes);
router.use('/Collections', collectionsRoutes);

router.use('/Academics', academicsRoutes);
router.use('/academics', academicsRoutes);

router.use('/student-information', studentRoutes);
router.use('/studentinformation', studentRoutes);
router.use('/student', studentRoutes);
router.use('/StudentPortal', studentRoutes);
router.use('/studentportal', studentRoutes);

router.use('/ParentPortal', parentRoutes);
router.use('/parentportal', parentRoutes);
router.use('/parent', parentRoutes);

router.use('/Attendance', attendanceRoutes);
router.use('/attendance', attendanceRoutes);

router.use('/Homework', homeworkRoutes);
router.use('/homework', homeworkRoutes);

router.use('/Lessonplan', lessonPlanRoutes);
router.use('/lessonplan', lessonPlanRoutes);
router.use('/admin/lessonplan', lessonPlanRoutes);

// Phase 3 & 4: Fees, Finance, Exams
router.use('/FeesManagement', feesRoutes);
router.use('/feesmanagement', feesRoutes);
router.use('/fees-management', feesRoutes);
router.use('/fees-mgt', feesRoutes);
router.use('/fees', feesRoutes);
router.use('/Income', incomeRouter);
router.use('/income', incomeRouter);
router.use('/Expense', expenseRouter);
router.use('/expense', expenseRouter);

router.use('/Exams', examsRoutes);
router.use('/exams', examsRoutes);
router.use('/Onlineexam', examsRoutes);
router.use('/onlineexam', examsRoutes);
router.use('/admin/onlineexam', examsRoutes);
router.use('/Question', examsRoutes);
router.use('/question', examsRoutes);
router.use('/admin/question', examsRoutes);

// Phase 5: Operations, Hostel, Sports, Library, Inventory, Transport
router.use('/Hostel', hostelRoutes);
router.use('/hostel', hostelRoutes);
router.use('/sports', sportsRoutes);
router.use('/Sports', sportsRoutes);
router.use('/Library', libraryRoutes);
router.use('/library', libraryRoutes);
router.use('/Inventory', inventoryRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/Transport', transportRoutes);
router.use('/transport', transportRoutes);

// Phase 6 & 7: Front Office, Communicate, CMS, Certificates, Settings, Calendar, Download Center, Alumni
router.use('/FrontOffice', frontOfficeRoutes);
router.use('/frontoffice', frontOfficeRoutes);
router.use('/front_office', frontOfficeRoutes);

router.use('/Communicate', communicateRoutes);
router.use('/communicate', communicateRoutes);
router.use('/inbox-messages', inboxRoutes);
router.use('/inbox_messages', inboxRoutes);

router.use('/Cms', cmsRoutes);
router.use('/cms', cmsRoutes);
router.use('/frontcms', cmsRoutes);

router.use('/Certificate', certificateRoutes);
router.use('/certificate', certificateRoutes);
router.use('/Idcard', idCardRoutes);
router.use('/idcard', idCardRoutes);

router.use('/SystemSettings', settingsRoutes);
router.use('/system-settings', settingsRoutes);
router.use('/systemsettings', settingsRoutes);
router.use('/schsettings', settingsRoutes);
router.use('/admin/schsettings', settingsRoutes);
router.use('/Sessions', sessionRoutes);
router.use('/sessions', sessionRoutes);
router.use('/session', sessionRoutes);
router.use('/admin/sessions', sessionRoutes);
router.use('/emailconfig', settingsRoutes);
router.use('/admin/emailconfig', settingsRoutes);
router.use('/admin/notification', settingsRoutes);
router.use('/Reports', settingsRoutes);
router.use('/reports', settingsRoutes);

router.use('/Users', usersRoutes);
router.use('/users', usersRoutes);

router.use('/calendar', calendarRoutes);
router.use('/admin/calendar', calendarRoutes);
router.use('/user/calendar', calendarRoutes);

router.use('/download-center', downloadCenterRoutes);
router.use('/downloadcenter', downloadCenterRoutes);
router.use('/alumni', alumniRoutes);
router.use('/Alumni', alumniRoutes);

import { HostelController } from '../modules/hostel/hostel.controller';
import { StudentInformationController } from '../modules/students/student_information.controller';
import { SettingsController } from '../modules/settings/settings.controller';

// Direct top-level aliases for frontend API calls
router.all('/rooms', HostelController.rooms);
router.all('/rooms/:id', HostelController.rooms);
router.all('/roomtypes', HostelController.roomTypes);
router.all('/roomtypes/:id', HostelController.roomTypes);
router.all('/hostels', HostelController.hostels);
router.all('/hostels/:id', HostelController.hostels);
router.all('/student-categories', StudentInformationController.studentCategories);
router.all('/student-categories/:id', StudentInformationController.studentCategories);
router.all('/student_categories', StudentInformationController.studentCategories);
router.all('/student-houses', StudentInformationController.studentHouses);
router.all('/student-houses/:id', StudentInformationController.studentHouses);
router.all('/student_houses', StudentInformationController.studentHouses);
router.get('/transport-routes', StudentInformationController.transportRoutes);
router.get('/transport_routes', StudentInformationController.transportRoutes);

export const apiRouter = router;
