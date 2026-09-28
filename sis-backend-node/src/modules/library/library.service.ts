import { LibraryRepository } from './library.repository';

export class LibraryService {
  static async getBooks(id?: any) {
    return await LibraryRepository.getBooks(id);
  }

  static async addBook(data: any) {
    return await LibraryRepository.addBook(data);
  }

  static async updateBook(id: any, data: any) {
    return await LibraryRepository.updateBook(id, data);
  }

  static async deleteBook(id: any) {
    return await LibraryRepository.deleteBook(id);
  }

  static async getMembers() {
    return await LibraryRepository.getMembers();
  }

  static async addMember(data: any) {
    return await LibraryRepository.addMember(data);
  }

  static async surrenderMembership(memberId: any) {
    return await LibraryRepository.surrenderMembership(memberId);
  }

  static async getIssuedBooks() {
    return await LibraryRepository.getIssuedBooks();
  }

  static async getIssuedBooksByMember(memberId: any) {
    return await LibraryRepository.getIssuedBooksByMember(memberId);
  }

  static async issueBook(data: any) {
    return await LibraryRepository.issueBook(data);
  }

  static async returnBook(id: any, returnDate?: string) {
    return await LibraryRepository.returnBook(id, returnDate);
  }

  static async getReservations(memberId?: any) {
    return await LibraryRepository.getReservations(memberId);
  }

  static async addReservation(data: any) {
    return await LibraryRepository.addReservation(data);
  }

  static async updateReservationStatus(id: any, status: string, issueId?: number) {
    return await LibraryRepository.updateReservationStatus(id, status, issueId);
  }

  static async deleteReservation(id: any) {
    return await LibraryRepository.deleteReservation(id);
  }
}
