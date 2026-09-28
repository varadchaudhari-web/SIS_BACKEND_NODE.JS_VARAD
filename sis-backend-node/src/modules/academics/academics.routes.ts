import { Router } from 'express';
import { AcademicsController } from './academics.controller';

const router = Router();

// Academics Routes
router.get('/stats', AcademicsController.stats);
router.get('/teachers', AcademicsController.teachers);
router.get('/timetables', AcademicsController.timetables);
router.post('/timetable_save', AcademicsController.saveTimetable);
router.delete('/timetable_save', AcademicsController.deleteTimetablePeriod);
router.all('/classes', AcademicsController.classes);
router.all('/classes/:id', AcademicsController.classes);
router.all('/sections', AcademicsController.sections);
router.all('/sections/:id', AcademicsController.sections);
router.all('/subjects', AcademicsController.subjects);
router.all('/subjects/:id', AcademicsController.subjects);
router.all('/subject_groups', AcademicsController.subjectGroups);
router.all('/subject_groups/:id', AcademicsController.subjectGroups);
router.all('/subject-groups', AcademicsController.subjectGroups);
router.all('/subject-groups/:id', AcademicsController.subjectGroups);
router.all('/class_teachers', AcademicsController.classTeachers);
router.delete('/class_teachers/:classId/:sectionId', AcademicsController.classTeachers);
router.all('/session', AcademicsController.sessions);
router.all('/sessions', AcademicsController.sessions);
router.post('/promote', AcademicsController.promote);

export const academicsRoutes = router;
