import { Router } from 'express';
import { AttendanceController } from './attendance.controller';
import { LessonPlanController } from '../lessonplan/lessonplan.controller';

const router = Router();

// Attendance Mode & Dropdowns
router.get('/mode', AttendanceController.getAttendanceMode);
router.get('/dropdowns', LessonPlanController.getDropdowns);

// Subject Timetable Periods for Period-Wise Attendance
router.get('/subjects', AttendanceController.getSubjectsForAttendance);
router.get('/period', AttendanceController.getPeriodAttendance);
router.post('/period', AttendanceController.savePeriodAttendance);

// Standard Day-Wise Student Attendance
router.get('/student_attendance', AttendanceController.getStudentAttendance);
router.get('/by_date', AttendanceController.getStudentAttendance);
router.get('/by-date', AttendanceController.getAttendanceByDate);
router.get('/by-student/:studentId', AttendanceController.getByStudent);
router.get('/by-student', AttendanceController.getByStudent);
router.get('/by_student/:studentId', AttendanceController.getByStudent);
router.get('/by_student', AttendanceController.getByStudent);
router.post('/student_attendance', AttendanceController.saveStudentAttendance);
router.post('/save', AttendanceController.saveStudentAttendance);

// Staff Attendance
router.get('/staff_attendance', AttendanceController.getStaffAttendance);

// Student Leave Applications
router.get('/approve-leave', AttendanceController.getApproveLeaves);
router.post('/approve-leave', AttendanceController.applyLeave);
router.put('/approve-leave', AttendanceController.updateLeave);
router.delete('/approve-leave', AttendanceController.deleteLeave);
router.post('/approve-leave/status', AttendanceController.updateLeaveStatus);
router.all('/approve_leave', AttendanceController.approveLeave);

// Root routes
router.get('/', AttendanceController.getStudentAttendance);
router.post('/', AttendanceController.saveStudentAttendance);

export const attendanceRoutes = router;
