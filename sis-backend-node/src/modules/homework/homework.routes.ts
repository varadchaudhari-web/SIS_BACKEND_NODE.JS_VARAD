import { Router } from 'express';
import { HomeworkController } from './homework.controller';

const router = Router();

router.get('/dropdowns', HomeworkController.dropdowns);
router.get('/', HomeworkController.list);
router.get('/index', HomeworkController.list);
router.post('/add', HomeworkController.add);
router.post('/', HomeworkController.add);
router.post('/edit', HomeworkController.edit);
router.post('/delete', HomeworkController.delete);
router.delete('/delete/:id', HomeworkController.delete);
router.delete('/:id', HomeworkController.delete);

router.post('/submit_assignment', HomeworkController.submitAssignment);
router.get('/submissions', HomeworkController.getSubmissions);
router.post('/evaluate', HomeworkController.evaluateHomework);
router.get('/evaluation_students', HomeworkController.getEvaluationStudents);
router.get('/student/:studentId', HomeworkController.getHomeworkByStudent);

export const homeworkRoutes = router;
