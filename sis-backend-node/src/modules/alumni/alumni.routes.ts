import { Router } from 'express';
import { AlumniController } from './alumni.controller';

const router = Router();

router.get('/alumnilist', AlumniController.getAlumni);
router.get('/', AlumniController.getAlumni);
router.post('/add', AlumniController.addAlumni);
router.post('/deletestudent/:id', AlumniController.deleteAlumni);
router.delete('/:id', AlumniController.deleteAlumni);

// Events
router.get('/events', AlumniController.getEvents);
router.post('/add_event', AlumniController.addEvent);
router.post('/delete_event/:id', AlumniController.deleteEvent);

export const alumniRoutes = router;
