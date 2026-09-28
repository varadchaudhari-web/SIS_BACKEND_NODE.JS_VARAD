import { Router } from 'express';
import { LessonPlanController } from './lessonplan.controller';
import { upload } from '../../middlewares/upload.middleware';

const router = Router();

// Dropdowns & Mappings
router.get('/dropdowns', LessonPlanController.getDropdowns);
router.get('/subject-group-subject', LessonPlanController.getSubjectGroupSubjectId);
router.get('/subject-groups-with-subjects', LessonPlanController.getSubjectGroupsWithSubjects);
router.get('/week-dates', LessonPlanController.getWeekDates);

// Lessons & Topics CRUD
router.get('/lessons', LessonPlanController.listLessons);
router.post('/lessons', LessonPlanController.createLesson);
router.put('/lessons/:id', LessonPlanController.updateLesson);
router.delete('/lessons/:id', LessonPlanController.deleteLesson);

router.get('/lesson', LessonPlanController.listLessons);
router.post('/lesson', LessonPlanController.createLesson);
router.put('/lesson/:id', LessonPlanController.updateLesson);
router.delete('/lesson/:id', LessonPlanController.deleteLesson);

router.get('/topics', LessonPlanController.listTopics);
router.post('/topics', LessonPlanController.createTopic);
router.put('/topics/:id', LessonPlanController.updateTopic);
router.post('/topics/status', LessonPlanController.toggleTopicStatus);
router.delete('/topics/:id', LessonPlanController.deleteTopic);

router.get('/topic', LessonPlanController.listTopics);
router.post('/topic', LessonPlanController.createTopic);
router.put('/topic/:id', LessonPlanController.updateTopic);
router.post('/topic/status', LessonPlanController.toggleTopicStatus);
router.delete('/topic/:id', LessonPlanController.deleteTopic);


// Manage Lesson Plan (Subject Syllabus Delivery)
router.get('/syllabus', LessonPlanController.listSyllabus);
router.post('/syllabus', upload.any(), LessonPlanController.saveSyllabus);
router.post('/syllabus/:id', upload.any(), LessonPlanController.saveSyllabus);
router.put('/syllabus/:id', upload.any(), LessonPlanController.saveSyllabus);
router.delete('/syllabus/:id', LessonPlanController.deleteSyllabus);

// Syllabus Status Overview
router.get('/syllabus-status', LessonPlanController.getSyllabusStatus);
router.get('/status', LessonPlanController.getSyllabusStatus);

// Downloads
router.get('/download', LessonPlanController.downloadDocument);
router.get('/download/:docName', LessonPlanController.downloadDocument);
router.get('/video-download/:videoName', LessonPlanController.downloadDocument);

// Legacy root dispatch
router.get('/', LessonPlanController.listSyllabus);
router.get('/index', LessonPlanController.listSyllabus);

export const lessonPlanRoutes = router;
