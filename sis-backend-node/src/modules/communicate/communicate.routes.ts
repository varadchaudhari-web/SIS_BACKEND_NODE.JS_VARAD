import { Router } from 'express';
import { CommunicateController } from './communicate.controller';

const router = Router();

router.all('/notices', CommunicateController.notices);
router.all('/notices/:id', CommunicateController.notices);
router.all('/', CommunicateController.notices);
router.post('/send_sms', CommunicateController.sendSms);
router.post('/send_email', CommunicateController.sendEmail);

export const communicateRoutes = router;
