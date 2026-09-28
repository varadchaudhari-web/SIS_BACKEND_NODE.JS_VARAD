import { Router } from 'express';
import { HRController } from './hr.controller';
import { upload } from '../../middlewares/upload.middleware';

const router = Router();

// Staff Document Download
router.get('/download_document', HRController.downloadDocument);

// Staff Core
router.get('/staff_list', HRController.getStaffList);
router.get('/staff', HRController.getStaffList);
router.post('/staff', upload.any(), HRController.saveStaff);
router.get('/staff/:id', HRController.getStaffById);
router.delete('/staff/:id', HRController.deleteStaff);

// Staff Status & ID
router.get('/disabled', HRController.getDisabledStaff);
router.post('/disable_staff', HRController.disableStaff);
router.post('/enable_staff', HRController.enableStaff);
router.get('/next_staff_id', HRController.getNextStaffId);

// Staff Profile Assets & Password
router.post('/upload_staff_photo', upload.single('file'), HRController.uploadStaffPhoto);
router.post('/upload_document', upload.single('document'), HRController.uploadDocument);
router.post('/delete_document', HRController.deleteDocument);
router.post('/change_password/:id', HRController.changePassword);
router.post('/change_password', HRController.changePassword);

// Staff Credentials & Payslip Communication
router.post('/send_credentials', HRController.sendCredentials);
router.post('/send-credentials', HRController.sendCredentials);
router.post('/send_payslip', HRController.sendPayslip);
router.post('/send-payslip', HRController.sendPayslip);

// Attendance
router.get('/attendance', HRController.getAttendance);
router.post('/attendance', HRController.saveAttendance);
router.get('/attendance_types', HRController.getAttendanceTypes);

// Payroll
router.get('/payroll', HRController.getPayroll);
router.post('/payroll', HRController.createPayroll);
router.post('/payroll_pay', HRController.payPayroll);
router.delete('/payroll_delete/:id', HRController.deletePayroll);

// Leaves
router.get('/leave', HRController.getLeaves);
router.post('/leave', HRController.saveLeave);
router.delete('/leave/:id', HRController.deleteLeave);
router.post('/leave_status', HRController.updateLeaveStatus);

// Leave Types
router.get('/leavetypes', HRController.getLeaveTypes);
router.post('/leavetypes', HRController.saveLeaveType);
router.delete('/leavetypes/:id', HRController.deleteLeaveType);
router.post('/delete_leavetype', HRController.deleteLeaveType);

// Departments
router.get('/departments', HRController.getDepartments);
router.post('/departments', HRController.saveDepartment);
router.delete('/departments/:id', HRController.deleteDepartment);

// Designations
router.get('/designations', HRController.getDesignations);
router.post('/designations', HRController.saveDesignation);
router.delete('/designations/:id', HRController.deleteDesignation);

// Roles
router.get('/roles', HRController.getRoles);

// Ratings
router.get('/ratings', HRController.getRatings);
router.post('/ratings', HRController.saveRating);
router.post('/ratings_approve', HRController.approveRating);
router.delete('/ratings/:id', HRController.deleteRating);

// Timeline
router.get('/timeline', HRController.getStaffTimeline);
router.post('/timeline', upload.single('document'), HRController.addStaffTimeline);
router.delete('/timeline', HRController.deleteStaffTimeline);

export const hrRoutes = router;
