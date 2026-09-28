import { Router } from 'express';
import { StudentInformationController } from './student_information.controller';
import { StudentPortalController } from './student_portal.controller';
import { OnlineExamController } from '../exams/online_exam.controller';
import { upload } from '../../middlewares/upload.middleware';

const router = Router();

// Student Details & Admission
router.get('/student-details', StudentInformationController.getStudentDetails);
router.get('/student_details', StudentInformationController.getStudentDetails);
router.post('/student-details', upload.any(), StudentInformationController.studentAdmission);
router.get('/student-details/:id', StudentInformationController.getStudentById);
router.post('/student-details/:id', upload.any(), StudentInformationController.updateStudent);
router.put('/student-details/:id', upload.any(), StudentInformationController.updateStudent);
router.delete('/student-details/:id', StudentInformationController.deleteStudent);
router.get('/student/:id', StudentInformationController.getStudentById);
router.post('/student/:id', upload.any(), StudentInformationController.updateStudent);
router.put('/student/:id', upload.any(), StudentInformationController.updateStudent);
router.get('/student_details/:id', StudentInformationController.getStudentById);
router.post('/student_details/:id', upload.any(), StudentInformationController.updateStudent);
router.put('/student_details/:id', upload.any(), StudentInformationController.updateStudent);
router.post('/student-admission', upload.any(), StudentInformationController.studentAdmission);
router.post('/admission', upload.any(), StudentInformationController.studentAdmission);

// Disabled Students
router.get('/disabled-students', StudentInformationController.getDisabledStudents);
router.get('/disabled_students', StudentInformationController.getDisabledStudents);
router.all('/disabled-students/disable/:id', StudentInformationController.toggleStudentStatus);
router.all('/disabled-students/enable/:id', StudentInformationController.toggleStudentStatus);
router.get('/disable_reasons', StudentInformationController.getDisableReasons);

// Multi-class, Categories, Houses, Transport, Hostels, Sections
router.all('/multi-class-student', StudentInformationController.multiClassStudent);
router.all('/multi-class-student/:id', StudentInformationController.multiClassStudent);

router.all('/student-categories', StudentInformationController.studentCategories);
router.all('/student-categories/:id', StudentInformationController.studentCategories);
router.all('/student_categories', StudentInformationController.studentCategories);

router.all('/student-houses', StudentInformationController.studentHouses);
router.all('/student-houses/:id', StudentInformationController.studentHouses);
router.all('/student_houses', StudentInformationController.studentHouses);

router.get('/transport-routes', StudentInformationController.transportRoutes);
router.get('/hostels', StudentInformationController.hostels);
router.get('/hostel-rooms/:hostelId', StudentInformationController.hostelRooms);
router.get('/sections', StudentInformationController.sections);

// Online Admission
router.all('/online-admission', StudentInformationController.onlineAdmission);
router.all('/online-admission/:id', StudentInformationController.onlineAdmission);

// Credentials & Forgot password
router.post('/send-credentials', StudentInformationController.sendCredentials);
router.post('/send-forgot-password', StudentInformationController.sendCredentials);

// Student Locker Documents
router.post('/documents', upload.single('file'), StudentInformationController.uploadDocument);
router.get('/documents', StudentInformationController.getDocuments);

// Student Portal (Logged in student routes)
router.get('/profile', StudentPortalController.profile);
router.get('/timetable', StudentPortalController.timetable);
router.get('/lesson_plan', StudentPortalController.lessonPlan);
router.get('/syllabus_status', StudentPortalController.syllabusStatus);
router.get('/homework', StudentPortalController.homework);
router.get('/attendance', StudentPortalController.attendance);
router.all('/apply_leave', StudentPortalController.applyLeave);
router.get('/fees', StudentPortalController.fees);
router.get('/notices', StudentPortalController.notices);
router.get('/library', StudentPortalController.library);
router.get('/transport', StudentPortalController.transport);
router.get('/hostel', StudentPortalController.hostel);
router.get('/onlineexam', OnlineExamController.studentAssignedExams);

export const studentRoutes = router;
