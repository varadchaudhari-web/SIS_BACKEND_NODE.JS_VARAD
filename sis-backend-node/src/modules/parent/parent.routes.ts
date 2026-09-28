import { Router } from 'express';
import { ParentPortalController } from './parent_portal.controller';

const router = Router();

router.get('/dashboard', ParentPortalController.getChildren);
router.get('/children', ParentPortalController.getChildren);
router.get('/child-overview', ParentPortalController.childOverview);
router.get('/child_overview', ParentPortalController.childOverview);
router.get('/fees', ParentPortalController.fees);
router.get('/attendance', ParentPortalController.attendance);

export const parentRoutes = router;
