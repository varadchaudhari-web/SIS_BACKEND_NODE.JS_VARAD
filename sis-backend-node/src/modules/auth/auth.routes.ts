import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

// Login endpoints (handles case variations)
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/profile', authenticate, AuthController.getProfile);
router.get('/user_details', authenticate, AuthController.getProfile);

export const authRoutes = router;
