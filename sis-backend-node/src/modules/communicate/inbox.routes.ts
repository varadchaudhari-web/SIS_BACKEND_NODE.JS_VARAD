import { Router } from 'express';
import { InboxController } from './inbox.controller';

const router = Router();

router.get('/', InboxController.getInboxMessages);
router.post('/', InboxController.createInboxMessage);
router.post('/:id', InboxController.handleInboxAction);

export const inboxRoutes = router;
