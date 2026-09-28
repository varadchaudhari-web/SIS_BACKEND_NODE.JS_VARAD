import { Router } from 'express';
import { FrontOfficeController } from './frontoffice.controller';

const router = Router();

// Admission Enquiries
router.all('/admission-enquiries', FrontOfficeController.admissionEnquiries);
router.all('/admission-enquiries/:id', FrontOfficeController.admissionEnquiries);
router.all('/admission_enquiries', FrontOfficeController.admissionEnquiries);
router.all('/admission_enquiries/:id', FrontOfficeController.admissionEnquiries);

// Visitors Book
router.all('/visitors', FrontOfficeController.visitors);
router.all('/visitors/:id', FrontOfficeController.visitors);
router.all('/visitor_book', FrontOfficeController.visitors);
router.all('/visitor_book/:id', FrontOfficeController.visitors);
router.all('/visitor-book', FrontOfficeController.visitors);
router.all('/visitor-book/:id', FrontOfficeController.visitors);

// Phone Call Logs
router.all('/phone-calls', FrontOfficeController.phoneCalls);
router.all('/phone-calls/:id', FrontOfficeController.phoneCalls);
router.all('/phone_calls', FrontOfficeController.phoneCalls);
router.all('/phone_calls/:id', FrontOfficeController.phoneCalls);
router.all('/phone-call-logs', FrontOfficeController.phoneCalls);
router.all('/phone-call-logs/:id', FrontOfficeController.phoneCalls);
router.all('/phone_call_logs', FrontOfficeController.phoneCalls);
router.all('/phone_call_logs/:id', FrontOfficeController.phoneCalls);

// Postal Dispatch
router.all('/postal-dispatch', FrontOfficeController.postalDispatch);
router.all('/postal-dispatch/:id', FrontOfficeController.postalDispatch);
router.all('/postal_dispatch', FrontOfficeController.postalDispatch);
router.all('/postal_dispatch/:id', FrontOfficeController.postalDispatch);

// Postal Receive
router.all('/postal-receive', FrontOfficeController.postalReceive);
router.all('/postal-receive/:id', FrontOfficeController.postalReceive);
router.all('/postal_receive', FrontOfficeController.postalReceive);
router.all('/postal_receive/:id', FrontOfficeController.postalReceive);

// Postal General / Dispatch-Receive
router.all('/dispatch-receive', FrontOfficeController.postalDispatch);
router.all('/dispatch-receive/:id', FrontOfficeController.postalDispatch);
router.all('/dispatch_receive', FrontOfficeController.postalDispatch);
router.all('/dispatch_receive/:id', FrontOfficeController.postalDispatch);

// Complaints
router.all('/complaints', FrontOfficeController.complaints);
router.all('/complaints/:id', FrontOfficeController.complaints);
router.all('/complaint', FrontOfficeController.complaints);
router.all('/complaint/:id', FrontOfficeController.complaints);

// Setup endpoints
router.get('/setup', FrontOfficeController.setup);
router.all('/setup/purpose', FrontOfficeController.purpose);
router.all('/setup/purpose/:id', FrontOfficeController.purpose);
router.all('/setup/visitors_purpose', FrontOfficeController.purpose);
router.all('/setup/visitors_purpose/:id', FrontOfficeController.purpose);

router.all('/setup/complaint-types', FrontOfficeController.complaintTypes);
router.all('/setup/complaint-types/:id', FrontOfficeController.complaintTypes);
router.all('/setup/complaint_type', FrontOfficeController.complaintTypes);
router.all('/setup/complaint_type/:id', FrontOfficeController.complaintTypes);

router.all('/setup/sources', FrontOfficeController.sources);
router.all('/setup/sources/:id', FrontOfficeController.sources);
router.all('/setup/source', FrontOfficeController.sources);
router.all('/setup/source/:id', FrontOfficeController.sources);

router.all('/setup/references', FrontOfficeController.references);
router.all('/setup/references/:id', FrontOfficeController.references);
router.all('/setup/reference', FrontOfficeController.references);
router.all('/setup/reference/:id', FrontOfficeController.references);

export const frontOfficeRoutes = router;
