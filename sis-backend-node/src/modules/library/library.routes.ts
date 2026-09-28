import { Router } from 'express';
import { LibraryController } from './library.controller';

const router = Router();

// 1. Issues & Returns (specific book paths first)
router.get('/books/issued', LibraryController.issuedBooks);
router.get('/books/issued/member/:memberId', LibraryController.issuedBooksByMember);
router.get('/books/issued/member', LibraryController.issuedBooksByMember);
router.get('/issue_return/member/:memberId', LibraryController.issuedBooksByMember);
router.post('/books/issue', LibraryController.issueBook);
router.post('/books/return', LibraryController.returnBook);

// 2. Books CRUD
router.all('/books', LibraryController.books);
router.get('/books/detail/:id', LibraryController.bookDetail);
router.post('/books/add', LibraryController.addBook);
router.post('/books/edit', LibraryController.editBook);
router.post('/books/delete', LibraryController.deleteBook);
router.delete('/books/:id', LibraryController.deleteBook);
router.get('/books/:id', LibraryController.bookDetail);

// 3. Members
router.get('/members', LibraryController.members);
router.post('/members/add', LibraryController.addMember);
router.post('/members/add_manual', LibraryController.addMember);
router.post('/members/surrender', LibraryController.surrenderMembership);

// 4. Reservations
router.get('/reservations', LibraryController.reservations);
router.get('/reservations/member/:id', LibraryController.reservations);
router.post('/reservations/add', LibraryController.addReservation);
router.post('/reservations/update_status', LibraryController.updateReservationStatus);
router.post('/reservations/issue', LibraryController.issueReservation);
router.post('/reservations/delete', LibraryController.deleteReservation);
router.delete('/reservations/:id', LibraryController.deleteReservation);

// 5. Seeds & Root
router.post('/run_seeds', LibraryController.runSeeds);
router.all('/', LibraryController.books);

export const libraryRoutes = router;
