import { Router } from 'express';
import { SettingsController } from './settings.controller';

const router = Router();

// REST endpoints for Academic Sessions
router.get('/', SettingsController.getSessions);
router.post('/', SettingsController.saveSession);
router.get('/:id', SettingsController.getSessionById);
router.put('/:id', (req, res, next) => {
  req.body.id = req.params.id;
  SettingsController.saveSession(req, res);
});
router.delete('/:id', (req, res, next) => {
  req.params.id = req.params.id;
  SettingsController.deleteSession(req, res);
});
router.delete('/', SettingsController.deleteSession);

// CodeIgniter legacy routes
router.get('/index', SettingsController.getSessions);
router.post('/create', SettingsController.saveSession);
router.post('/edit/:id', (req, res, next) => {
  req.body.id = req.params.id;
  SettingsController.saveSession(req, res);
});
router.all('/delete/:id', (req, res, next) => {
  req.params.id = req.params.id;
  SettingsController.deleteSession(req, res);
});

export const sessionRoutes = router;
