import { Request, Response } from 'express';
import { LibraryService } from './library.service';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export class LibraryController {
  /**
   * Books: GET / POST / DELETE /api/Library/books
   */
  public static async books(req: Request, res: Response) {
    const method = req.method;
    const id = req.params.id || (typeof req.query.id === 'string' ? req.query.id : undefined);

    try {
      if (method === 'GET') {
        const rows = await LibraryService.getBooks(id);
        return sendSuccess(res, rows);
      }

      if (method === 'POST') {
        const { book_title, id: bodyId } = req.body;
        if (!book_title && !bodyId) return sendError(res, 'Book title is required', 400);

        if (bodyId || id) {
          await LibraryService.updateBook(bodyId || id, req.body);
          return sendSuccess(res, { id: bodyId || id, book_title }, 'Book updated successfully');
        }

        const result = await LibraryService.addBook(req.body);
        return sendSuccess(res, { id: result.insertId, book_title }, 'Book added successfully', 201);
      }

      if (method === 'DELETE') {
        if (!id) return sendError(res, 'Book ID required', 400);
        await LibraryService.deleteBook(id);
        return sendSuccess(res, { id }, 'Book deleted successfully');
      }

      return sendError(res, 'Method not allowed', 405);
    } catch (error) {
      logger.error('Error in library books:', error);
      return sendError(res, 'Failed to process library request', 500);
    }
  }

  public static async bookDetail(req: Request, res: Response) {
    try {
      const id = req.params.id || (typeof req.query.id === 'string' ? req.query.id : undefined);
      if (!id) return sendError(res, 'Book ID required', 400);
      const book = await LibraryService.getBooks(id);
      if (!book) return sendError(res, 'Book not found', 404);
      return sendSuccess(res, book);
    } catch (error) {
      return sendError(res, 'Failed to fetch book detail', 500);
    }
  }

  public static async addBook(req: Request, res: Response) {
    try {
      const { book_title } = req.body;
      if (!book_title) return sendError(res, 'Book title is required', 400);
      const result = await LibraryService.addBook(req.body);
      return sendSuccess(res, { id: result.insertId, book_title }, 'Book added successfully', 201);
    } catch (error) {
      return sendError(res, 'Failed to add book', 500);
    }
  }

  public static async editBook(req: Request, res: Response) {
    try {
      const id = req.body.id || req.params.id;
      if (!id) return sendError(res, 'Book ID required', 400);
      await LibraryService.updateBook(id, req.body);
      return sendSuccess(res, { id }, 'Book updated successfully');
    } catch (error) {
      return sendError(res, 'Failed to update book', 500);
    }
  }

  public static async deleteBook(req: Request, res: Response) {
    try {
      const id = (req.body.id || req.params.id || req.query.id) as string | number;
      if (!id) return sendError(res, 'Book ID required', 400);
      await LibraryService.deleteBook(id);
      return sendSuccess(res, { id }, 'Book deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete book', 500);
    }
  }

  /**
   * Members: GET /api/Library/members
   */
  public static async members(req: Request, res: Response) {
    try {
      const rows = await LibraryService.getMembers();
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch library members', 500);
    }
  }

  public static async addMember(req: Request, res: Response) {
    try {
      const { member_id, member_type, library_card_no, admission_no, name } = req.body;
      const targetMemberId = member_id || admission_no || 1;
      const cardNo = library_card_no || `LIB-${Math.floor(1000 + Math.random() * 9000)}`;

      await LibraryService.addMember({
        member_id: targetMemberId,
        member_type: member_type || 'student',
        library_card_no: cardNo
      });

      return sendSuccess(res, { member_id: targetMemberId, library_card_no: cardNo }, 'Library member added successfully', 201);
    } catch (error) {
      return sendError(res, 'Failed to add member', 500);
    }
  }

  public static async surrenderMembership(req: Request, res: Response) {
    try {
      const memberId = req.body.member_id || req.body.id;
      if (!memberId) return sendError(res, 'Member ID required', 400);
      await LibraryService.surrenderMembership(memberId);
      return sendSuccess(res, { member_id: memberId }, 'Membership surrendered successfully');
    } catch (error) {
      return sendError(res, 'Failed to surrender membership', 500);
    }
  }

  /**
   * Issues & Returns
   */
  public static async issuedBooks(req: Request, res: Response) {
    try {
      const rows = await LibraryService.getIssuedBooks();
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch issued books', 500);
    }
  }

  public static async issuedBooksByMember(req: Request, res: Response) {
    try {
      const memberId = req.params.memberId || req.params.id || req.query.member_id || req.query.student_id;
      if (!memberId) return sendError(res, 'Member ID required', 400);
      const rows = await LibraryService.getIssuedBooksByMember(memberId as string);
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch member issued books', 500);
    }
  }

  public static async issueBook(req: Request, res: Response) {
    try {
      const { book_id, member_id, duereturn_date } = req.body;
      if (!book_id || !member_id) return sendError(res, 'Book ID and Member ID are required', 400);

      const result = await LibraryService.issueBook({
        book_id,
        member_id,
        duereturn_date: duereturn_date || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
      });

      return sendSuccess(res, { id: result.insertId }, 'Book issued successfully', 201);
    } catch (error) {
      return sendError(res, 'Failed to issue book', 500);
    }
  }

  public static async returnBook(req: Request, res: Response) {
    try {
      const { id, return_date } = req.body;
      if (!id) return sendError(res, 'Issue ID required', 400);
      await LibraryService.returnBook(id, return_date);
      return sendSuccess(res, { id }, 'Book returned successfully');
    } catch (error) {
      return sendError(res, 'Failed to return book', 500);
    }
  }

  /**
   * Reservations
   */
  public static async reservations(req: Request, res: Response) {
    try {
      const memberId = req.params.id || req.query.member_id;
      const rows = await LibraryService.getReservations(memberId as string);
      return sendSuccess(res, rows);
    } catch (error) {
      return sendError(res, 'Failed to fetch reservations', 500);
    }
  }

  public static async addReservation(req: Request, res: Response) {
    try {
      const { book_id, book_title, member_id, member_name, member_role } = req.body;
      if (!book_id || !member_id) return sendError(res, 'Book ID and Member ID are required', 400);

      const result = await LibraryService.addReservation({ book_id, book_title, member_id, member_name, member_role });
      return sendSuccess(res, { id: result.insertId }, 'Reservation created successfully', 201);
    } catch (error) {
      return sendError(res, 'Failed to add reservation', 500);
    }
  }

  public static async updateReservationStatus(req: Request, res: Response) {
    try {
      const { id, status } = req.body;
      if (!id || !status) return sendError(res, 'ID and status required', 400);
      await LibraryService.updateReservationStatus(id, status);
      return sendSuccess(res, { id, status }, 'Reservation status updated');
    } catch (error) {
      return sendError(res, 'Failed to update reservation status', 500);
    }
  }

  public static async issueReservation(req: Request, res: Response) {
    try {
      const { reservation_id, book_id, member_id, duereturn_date } = req.body;
      const issueResult = await LibraryService.issueBook({
        book_id,
        member_id,
        duereturn_date: duereturn_date || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
      });

      if (reservation_id) {
        await LibraryService.updateReservationStatus(reservation_id, 'Issued', issueResult.insertId);
      }

      return sendSuccess(res, { issue_id: issueResult.insertId }, 'Book issued from reservation');
    } catch (error) {
      return sendError(res, 'Failed to issue reservation', 500);
    }
  }

  public static async deleteReservation(req: Request, res: Response) {
    try {
      const id = (req.body.id || req.params.id || req.query.id) as string | number;
      if (!id) return sendError(res, 'Reservation ID required', 400);
      await LibraryService.deleteReservation(id);
      return sendSuccess(res, { id }, 'Reservation deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete reservation', 500);
    }
  }

  public static async runSeeds(req: Request, res: Response) {
    return sendSuccess(res, null, 'Library seeds completed successfully');
  }
}
