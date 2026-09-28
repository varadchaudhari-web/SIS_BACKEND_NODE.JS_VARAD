import { Router } from 'express';
import { HostelController } from './hostel.controller';

const router = Router();

// 1. Hostels
router.all('/hostels', HostelController.hostels);
router.all('/hostels/:id', HostelController.hostels);
router.post('/delete_hostel', HostelController.deleteHostel);

// 2. Room Types
router.all('/roomtypes', HostelController.roomTypes);
router.all('/roomtypes/:id', HostelController.roomTypes);
router.post('/delete_roomtype', HostelController.deleteRoomType);

// 3. Rooms
router.all('/rooms', HostelController.rooms);
router.all('/rooms/:id', HostelController.rooms);
router.post('/delete_room', HostelController.deleteRoom);

// 4. Student Allocations / Details
router.get('/student_details', HostelController.studentDetails);
router.get('/student-details', HostelController.studentDetails);
router.post('/allocate', HostelController.allocateStudent);
router.post('/deallocate', HostelController.deallocateStudent);
router.post('/deallocate/:id', HostelController.deallocateStudent);

// 5. Fee Collection / Payments
router.all('/payments', HostelController.payments);
router.all('/payments/:id', HostelController.payments);

// 6. Dashboard Summary & Seeds
router.get('/dashboard_summary', HostelController.dashboardSummary);
router.post('/run_seeds', HostelController.runSeeds);

// 7. Leaves
router.get('/leaves', HostelController.leaves);
router.post('/leaves', HostelController.leaves);
router.post('/leaves/status', HostelController.updateLeaveStatus);

// 8. Visitors
router.get('/visitors', HostelController.visitors);
router.post('/visitors', HostelController.visitors);
router.post('/visitors/out', HostelController.visitorOut);

// 9. Maintenance
router.get('/maintenance', HostelController.maintenance);
router.post('/maintenance', HostelController.maintenance);
router.post('/maintenance/status', HostelController.maintenanceStatus);

// 10. Mess Menu
router.get('/mess_menu', HostelController.messMenu);
router.post('/mess_menu', HostelController.messMenu);

// 11. Attendance
router.get('/attendance', HostelController.attendance);
router.post('/attendance', HostelController.attendance);

// 12. Complaints
router.get('/complaints', HostelController.complaints);
router.post('/complaints', HostelController.complaints);
router.post('/complaints/resolve', HostelController.resolveComplaint);

export const hostelRoutes = router;
