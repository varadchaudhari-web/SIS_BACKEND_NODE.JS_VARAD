import { Router } from 'express';
import { CmsController } from './cms.controller';

const router = Router();

router.get('/pages', CmsController.pages);
router.get('/events', CmsController.events);
router.get('/gallery', CmsController.gallery);

export const cmsRoutes = router;
