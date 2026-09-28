import { query, queryOne, execute } from '../../config/database';

export class LibraryRepository {
  // Books
  static async getBooks(id?: any) {
    if (id) {
      const book = await queryOne(`SELECT * FROM books WHERE id = ?`, [id]);
      if (book) {
        const issues = await queryOne(`SELECT COUNT(*) as total_issue FROM book_issues WHERE book_id = ? AND is_returned = 0`, [id]);
        const totalIssue = issues ? issues.total_issue : 0;
        book.total_issue = totalIssue;
        book.available_qty = Math.max(0, (book.qty || 0) - totalIssue);
      }
      return book;
    }
    return await query(`
      SELECT b.*,
             (SELECT COUNT(*) FROM book_issues bi WHERE bi.book_id = b.id AND bi.is_returned = 0) as total_issue,
             (b.qty - (SELECT COUNT(*) FROM book_issues bi WHERE bi.book_id = b.id AND bi.is_returned = 0)) as available_qty
      FROM books b
      ORDER BY b.id DESC
    `);
  }

  static async addBook(data: any) {
    return await execute(`
      INSERT INTO books (book_title, book_no, isbn_no, subject, rack_no, publish, author, qty, perunitcost, postdate, description, available, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'yes', 'yes')
    `, [
      data.book_title,
      data.book_no || '',
      data.isbn_no || '',
      data.subject || '',
      data.rack_no || '',
      data.publish || data.publisher || '',
      data.author || '',
      data.qty || 1,
      data.perunitcost || 0,
      data.postdate || new Date().toISOString().split('T')[0],
      data.description || ''
    ]);
  }

  static async updateBook(id: any, data: any) {
    return await execute(`
      UPDATE books
      SET book_title = COALESCE(?, book_title),
          book_no = COALESCE(?, book_no),
          isbn_no = COALESCE(?, isbn_no),
          subject = COALESCE(?, subject),
          rack_no = COALESCE(?, rack_no),
          publish = COALESCE(?, publish),
          author = COALESCE(?, author),
          qty = COALESCE(?, qty),
          perunitcost = COALESCE(?, perunitcost),
          description = COALESCE(?, description)
      WHERE id = ?
    `, [
      data.book_title,
      data.book_no,
      data.isbn_no,
      data.subject,
      data.rack_no,
      data.publish || data.publisher,
      data.author,
      data.qty,
      data.perunitcost,
      data.description,
      id
    ]);
  }

  static async deleteBook(id: any) {
    return await execute(`DELETE FROM books WHERE id = ?`, [id]);
  }

  // Members
  static async getMembers() {
    return await query(`
      SELECT lm.id as lib_member_id, lm.library_card_no, lm.member_type, lm.member_id,
             s.admission_no, s.firstname, s.lastname, s.guardian_phone,
             stf.name as teacher_name, stf.email as teacher_email, stf.contact_no as teacher_phone
      FROM libarary_members lm
      LEFT JOIN students s ON s.id = lm.member_id AND (lm.member_type = 'student' OR lm.member_type = 'Student')
      LEFT JOIN staff stf ON stf.id = lm.member_id AND (lm.member_type = 'teacher' OR lm.member_type = 'staff' OR lm.member_type = 'Staff')
      WHERE lm.is_active = 'yes' OR lm.is_active = 1
      ORDER BY lm.id DESC
    `);
  }

  static async addMember(data: { member_id: number | string; member_type: string; library_card_no: string }) {
    return await execute(`
      INSERT INTO libarary_members (member_id, member_type, library_card_no, is_active)
      VALUES (?, ?, ?, 'yes')
      ON DUPLICATE KEY UPDATE library_card_no = VALUES(library_card_no), is_active = 'yes'
    `, [data.member_id, data.member_type || 'student', data.library_card_no]);
  }

  static async surrenderMembership(memberId: number | string) {
    return await execute(`
      UPDATE libarary_members SET is_active = 'no' WHERE id = ? OR member_id = ?
    `, [memberId, memberId]);
  }

  // Issues & Returns
  static async getIssuedBooks() {
    return await query(`
      SELECT bi.*, b.book_title, b.book_no, b.author, b.subject, b.publish,
             lm.library_card_no, lm.member_type,
             COALESCE(s.firstname, stf.name) as fname,
             COALESCE(s.lastname, stf.surname) as lname
      FROM book_issues bi
      JOIN books b ON b.id = bi.book_id
      LEFT JOIN libarary_members lm ON lm.id = bi.member_id
      LEFT JOIN students s ON s.id = lm.member_id AND lm.member_type = 'student'
      LEFT JOIN staff stf ON stf.id = lm.member_id AND (lm.member_type = 'teacher' OR lm.member_type = 'staff')
      ORDER BY bi.id DESC
    `);
  }

  static async getIssuedBooksByMember(memberId: number | string) {
    return await query(`
      SELECT bi.*, b.book_title, b.book_no, b.author, b.subject, b.publish,
             lm.library_card_no
      FROM book_issues bi
      JOIN books b ON b.id = bi.book_id
      LEFT JOIN libarary_members lm ON lm.id = bi.member_id
      WHERE lm.member_id = ? OR bi.member_id = ? OR lm.id = ?
      ORDER BY bi.id DESC
    `, [memberId, memberId, memberId]);
  }

  static async issueBook(data: { book_id: number | string; member_id: number | string; duereturn_date: string; issue_date?: string }) {
    return await execute(`
      INSERT INTO book_issues (book_id, member_id, issue_date, duereturn_date, is_returned, is_active)
      VALUES (?, ?, ?, ?, 0, 'yes')
    `, [data.book_id, data.member_id, data.issue_date || new Date().toISOString().split('T')[0], data.duereturn_date]);
  }

  static async returnBook(id: number | string, returnDate?: string) {
    return await execute(`
      UPDATE book_issues
      SET is_returned = 1, return_date = ?
      WHERE id = ?
    `, [returnDate || new Date().toISOString().split('T')[0], id]);
  }

  // Reservations
  static async getReservations(memberId?: number | string) {
    if (memberId) {
      return await query(`SELECT * FROM book_reservations WHERE member_id = ? ORDER BY id DESC`, [memberId]);
    }
    return await query(`SELECT * FROM book_reservations ORDER BY id DESC`);
  }

  static async addReservation(data: { book_id: number | string; book_title?: string; member_id: number | string; member_name?: string; member_role?: string }) {
    return await execute(`
      INSERT INTO book_reservations (book_id, book_title, member_id, member_name, member_role, reservation_date, status)
      VALUES (?, ?, ?, ?, ?, CURDATE(), 'Pending')
    `, [data.book_id, data.book_title || '', data.member_id, data.member_name || '', data.member_role || 'Student']);
  }

  static async updateReservationStatus(id: number | string, status: string, issueId?: number) {
    return await execute(`
      UPDATE book_reservations SET status = ?, issue_id = COALESCE(?, issue_id) WHERE id = ?
    `, [status, issueId || null, id]);
  }

  static async deleteReservation(id: number | string) {
    return await execute(`DELETE FROM book_reservations WHERE id = ?`, [id]);
  }
}
