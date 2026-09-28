import { Router } from 'express';
import { ExamsController } from './exams.controller';
import { OnlineExamController } from './online_exam.controller';
import { CompetitiveExamController } from './competitive_exam.controller';
import { upload } from '../../middlewares/upload.middleware';

const router = Router();

// ==========================================
// 1. EXAM GROUPS
// ==========================================
router.get('/groups', ExamsController.groups);
router.get('/exam_group', ExamsController.groups);
router.get('/pipeline', ExamsController.getDashboardPipeline);
router.get('/dashboard-pipeline', ExamsController.getDashboardPipeline);
router.get('/consolidated-results', ExamsController.getConsolidatedResults);
router.post('/groups', ExamsController.createGroup);
router.put('/groups/:id', ExamsController.updateGroup);
router.delete('/groups/:id', ExamsController.deleteGroup);

// ==========================================
// 2. GROUP EXAMS (EXAMS IN GROUP)
// ==========================================
router.get('/list', ExamsController.listExams);
router.post('/save', ExamsController.saveExam);
router.put('/detail/:id', ExamsController.updateExam);
router.put('/save/:id', ExamsController.updateExam);
router.delete('/detail/:id', ExamsController.deleteExam);
router.post('/publish', ExamsController.publishExam);

// ==========================================
// 3. EXAM SUBJECTS
// ==========================================
router.get('/subjects/:examId', ExamsController.getExamSubjects);
router.post('/subjects', ExamsController.saveExamSubjects);
router.delete('/subjects/:id', ExamsController.deleteExamSubject);

// ==========================================
// 4. EXAM STUDENTS ASSIGNMENT
// ==========================================
router.get('/students', ExamsController.getExamStudents);
router.post('/students', ExamsController.saveExamStudents);
router.post('/students/assign-class', ExamsController.assignClassStudents);
router.delete('/students', ExamsController.deleteExamStudent);
router.post('/generate-rollno', ExamsController.generateRollNumbers);
router.post('/generate_rollno', ExamsController.generateRollNumbers);
router.post('/students/generate-roll-no', ExamsController.generateRollNumbers);

// ==========================================
// 5. EXAM SCHEDULES & MARKS
// ==========================================
router.get('/schedules', ExamsController.schedules);
router.get('/schedule', ExamsController.schedules);
router.post('/schedules', ExamsController.createSchedule);
router.delete('/schedules/:id', ExamsController.deleteSchedule);
router.all('/marks', ExamsController.marks);
router.post('/print-admit-cards', ExamsController.printAdmitCards);
router.post('/print-marksheets', ExamsController.printMarksheets);
router.get('/teacher-remarks', ExamsController.getTeacherRemarks);
router.post('/teacher-remarks', ExamsController.saveTeacherRemarks);
router.get('/attendance-sheet', ExamsController.getAttendanceSheet);

// ==========================================
// 6. ADMIT CARD TEMPLATES
// ==========================================
router.get('/templates/admit', ExamsController.getAdmitTemplates);
router.get('/templates/admit/:id', ExamsController.getAdmitTemplates);
router.post('/templates/admit', upload.any(), ExamsController.createAdmitTemplate);
router.put('/templates/admit/:id', upload.any(), ExamsController.updateAdmitTemplate);
router.post('/templates/admit/:id', upload.any(), ExamsController.updateAdmitTemplate);
router.delete('/templates/admit/:id', ExamsController.deleteAdmitTemplate);

// ==========================================
// 7. MARKSHEET TEMPLATES
// ==========================================
router.get('/templates/marksheet', ExamsController.getMarksheetTemplates);
router.get('/templates/marksheet/:id', ExamsController.getMarksheetTemplates);
router.post('/templates/marksheet', upload.any(), ExamsController.createMarksheetTemplate);
router.put('/templates/marksheet/:id', upload.any(), ExamsController.updateMarksheetTemplate);
router.post('/templates/marksheet/:id', upload.any(), ExamsController.updateMarksheetTemplate);
router.delete('/templates/marksheet/:id', ExamsController.deleteMarksheetTemplate);

// ==========================================
// 8. GRADES & METADATA
// ==========================================
router.get('/grades/meta', ExamsController.getGradesMeta);
router.get('/exam-types', ExamsController.getExamTypes);
router.get('/grades', ExamsController.grades);
router.post('/grades', ExamsController.createGrade);
router.put('/grades/:id', ExamsController.updateGrade);
router.delete('/grades/:id', ExamsController.deleteGrade);

// ==========================================
// 9. RESULTS & CONNECTIONS
// ==========================================
router.get('/results', ExamsController.getExamResults);
router.get('/connections/:examGroupId', ExamsController.getConnectedExams);
router.post('/connections', ExamsController.saveConnectedExams);
router.get('/student/:studentId/schedule', ExamsController.studentExamSchedule);
router.get('/student/:studentId/results', ExamsController.studentExamResults);
router.get('/student/:studentId', ExamsController.studentExams);
router.get('/student', ExamsController.studentExams);
router.get('/student_exams', ExamsController.studentExams);
router.get('/student_schedule', ExamsController.studentExamSchedule);
router.get('/student_results', ExamsController.studentExamResults);

// ==========================================
// 10. ONLINE EXAMS & QUESTION BANK
// ==========================================
router.get('/', (req, res, next) => {
  if (req.baseUrl.includes('question') || req.baseUrl.includes('Question')) {
    return OnlineExamController.questionBank(req, res);
  }
  if (req.baseUrl.includes('onlineexam') || req.baseUrl.includes('Onlineexam') || req.baseUrl.includes('online-exam')) {
    return OnlineExamController.list(req, res);
  }
  next();
});

router.post('/', (req, res, next) => {
  if (req.baseUrl.includes('question') || req.baseUrl.includes('Question')) {
    return OnlineExamController.addQuestion(req, res);
  }
  if (req.baseUrl.includes('onlineexam') || req.baseUrl.includes('Onlineexam') || req.baseUrl.includes('online-exam')) {
    return OnlineExamController.create(req, res);
  }
  next();
});

router.get('/online-exams', OnlineExamController.list);
router.post('/online-exams', OnlineExamController.create);
router.put('/online-exams/:id', OnlineExamController.update);
router.delete('/online-exams/:id', OnlineExamController.delete);
router.post('/online-exams/publish', OnlineExamController.publishResult);

router.get('/online-exams/:id/questions', OnlineExamController.getExamQuestions);
router.post('/online-exams/questions/assign', OnlineExamController.assignQuestions);
router.delete('/online-exams/questions/:examQuestionId', OnlineExamController.removeQuestion);

router.get('/online-exams/:id/students', OnlineExamController.getExamStudents);
router.post('/online-exams/students/assign-class', OnlineExamController.assignClassStudents);
router.get('/online-exams/:id/results', OnlineExamController.getExamResults);

// Student & Parent Taking & Result Endpoints
router.get('/online-exams/student/take/:examId', OnlineExamController.getExamForStudent);
router.post('/online-exams/student/submit', OnlineExamController.submitStudentExam);
router.get('/online-exams/student/exams', OnlineExamController.studentAssignedExams);

// Legacy PHP / Alias Routes
router.get('/onlineexam', OnlineExamController.list);
router.post('/onlineexam', OnlineExamController.create);
router.put('/onlineexam/:id', OnlineExamController.update);
router.delete('/onlineexam/:id', OnlineExamController.delete);
router.get('/onlineexam/student', OnlineExamController.studentAssignedExams);
router.get('/onlineexam/:id', OnlineExamController.detail);
router.get('/student/onlineexam', OnlineExamController.studentAssignedExams);

// Question Bank Routes
router.get('/questions', OnlineExamController.questionBank);
router.get('/question_bank', OnlineExamController.questionBank);
router.post('/questions', OnlineExamController.addQuestion);
router.put('/questions/:id', OnlineExamController.updateQuestion);
router.delete('/questions/:id', OnlineExamController.deleteQuestion);

// ==========================================
// 11. COMPETITIVE EXAMS
// ==========================================
router.get('/competitive/list', CompetitiveExamController.list);
router.get('/competitive/registrations', CompetitiveExamController.registrations);

export const examsRoutes = router;
export const onlineExamRoutes = router;
