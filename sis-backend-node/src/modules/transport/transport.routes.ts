import { Router } from 'express';
import { TransportController } from './transport.controller';

const router = Router();

// Routes
router.all('/routes', TransportController.routes);
router.all('/routes/:id', TransportController.routes);
router.post('/delete_route', TransportController.deleteRoute);
router.post('/delete-route', TransportController.deleteRoute);

// Vehicles
router.all('/vehicles', TransportController.vehicles);
router.all('/vehicles/:id', TransportController.vehicles);
router.post('/delete_vehicle', TransportController.deleteVehicle);
router.post('/delete-vehicle', TransportController.deleteVehicle);

// Assignments
router.all('/assignments', TransportController.assignments);
router.all('/assignments/:id', TransportController.assignments);
router.post('/delete_assignment', TransportController.deleteAssignment);
router.post('/delete-assignment', TransportController.deleteAssignment);
router.delete('/assignments', TransportController.deleteAssignment);
router.delete('/assignments/:id', TransportController.deleteAssignment);
router.all('/student-transport', TransportController.assignments);

// Seeds
router.post('/run_seeds', TransportController.runSeeds);
router.all('/', TransportController.routes);

export const transportRoutes = router;
