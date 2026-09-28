import { Router } from 'express';
import { CalendarController } from './calendar.controller';

const router = Router();

// Standard REST endpoints
router.get('/events', CalendarController.getEvents);
router.post('/events', CalendarController.saveEvent);
router.get('/events/:id', CalendarController.getEventById);
router.put('/events/:id', CalendarController.saveEvent);
router.delete('/events/:id', CalendarController.deleteEvent);
router.post('/toggle-status', CalendarController.toggleStatus);

// Legacy Admin endpoints
router.get('/getevents', CalendarController.getEvents);
router.post('/saveevent', CalendarController.saveEvent);
router.post('/updateevent', CalendarController.saveEvent);
router.get('/view_event/:id', CalendarController.getEventById);
router.post('/delete_event/:id', CalendarController.deleteEvent);
router.post('/addtodo', CalendarController.saveEvent);
router.get('/gettaskbyid/:id', CalendarController.getEventById);
router.post('/markcomplete/:id', CalendarController.toggleStatus);

export const calendarRoutes = router;
