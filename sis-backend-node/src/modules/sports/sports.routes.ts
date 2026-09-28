import { Router } from 'express';
import { SportsController } from './sports.controller';

const router = Router();

// Categories
router.all('/categories', SportsController.categories);
router.all('/categories/:id', SportsController.categories);

// Teams
router.all('/teams', SportsController.teams);
router.all('/teams/:id', SportsController.teams);

// Tournaments
router.all('/tournaments', SportsController.tournaments);
router.all('/tournaments/:id', SportsController.tournaments);

// Performance
router.all('/performance', SportsController.performance);
router.all('/performance/:id', SportsController.performance);

router.all('/', SportsController.categories);

export const sportsRoutes = router;
