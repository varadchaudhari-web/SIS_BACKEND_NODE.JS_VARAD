import { Request, Response } from 'express';
import { queryOne, query } from '../../config/database';
import { AuthService } from '../../services/auth.service';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export class AuthController {
  /**
   * Universal Login Handler (Staff, Admin, Student, Parent)
   * POST /api/Auth/login or POST /api/auth/login
   */
  public static async login(req: Request, res: Response) {
    try {
      const username = (req.body.username || req.body.email || '').trim();
      const password = req.body.password || '';

      if (!username || !password) {
        return sendError(res, 'Username/Email and Password are required', 400);
      }

      // 1. Check if user is in `staff` table
      const staffUser = await queryOne(
        `SELECT s.id, s.name, s.surname, s.email, s.password, s.is_active, s.lang_id,
                r.id as role_id, r.name as role_name
         FROM staff s
         LEFT JOIN staff_roles sr ON sr.staff_id = s.id
         LEFT JOIN roles r ON r.id = sr.role_id
         WHERE (s.email = ? OR s.contact_no = ?) 
         LIMIT 1`,
        [username, username]
      );

      if (staffUser) {
        if (staffUser.is_active === 0 || staffUser.is_active === '0' || staffUser.is_active === 'no') {
          return sendError(res, 'Your account is disabled. Please contact the administrator.', 403);
        }

        const isMatch = await AuthService.verifyPassword(password, staffUser.password);
        if (isMatch) {
          const roleName = (staffUser.role_name || 'admin').toLowerCase();

          const fullName = [staffUser.name, staffUser.surname].filter(Boolean).join(' ');
          const token = AuthService.generateToken({
            id: staffUser.id,
            username: fullName,
            email: staffUser.email,
            role: roleName,
            staffId: staffUser.id,
          });

          return res.status(200).json({
            status: true,
            success: true,
            message: 'Login successful',
            data: {
              token,
              user: {
                id: staffUser.id,
                username: fullName,
                email: staffUser.email,
                roles: { [roleName]: staffUser.id },
                language: {
                  lang_id: staffUser.lang_id || 1,
                  language: 'English',
                },
              },
            },
          });
        }
      }

      // 2. Check `users` table for Student or Parent
      const userRow = await queryOne(
        `SELECT id, username, password, user_id, role, is_active 
         FROM users 
         WHERE username = ? 
         LIMIT 1`,
        [username]
      );

      if (userRow) {
        if (userRow.is_active === 0 || userRow.is_active === '0' || userRow.is_active === 'no') {
          return sendError(res, 'Your account is disabled. Please contact the administrator.', 403);
        }

        const isMatch = await AuthService.verifyPassword(password, userRow.password);
        if (isMatch) {
          if (userRow.role === 'student') {
            const studentInfo = await queryOne(
              `SELECT id, firstname, lastname, email, gender, lang_id 
               FROM students 
               WHERE id = ? 
               LIMIT 1`,
              [userRow.user_id]
            );

            const fullName = studentInfo ? [studentInfo.firstname, studentInfo.lastname].filter(Boolean).join(' ') : userRow.username;
            const token = AuthService.generateToken({
              id: userRow.id,
              userId: userRow.id,
              username: fullName,
              email: studentInfo?.email || userRow.username,
              role: 'student',
              studentId: userRow.user_id,
            });

            return res.status(200).json({
              status: true,
              success: true,
              message: 'Login successful',
              data: {
                token,
                user: {
                  id: userRow.id,
                  username: fullName,
                  email: studentInfo?.email || userRow.username,
                  roles: { student: userRow.user_id },
                  language: { lang_id: studentInfo?.lang_id || 1, language: 'English' },
                  gender: studentInfo?.gender || '',
                },
              },
            });
          } else if (userRow.role === 'parent') {
            const parentInfo = await queryOne(
              `SELECT id, guardian_name, guardian_email, guardian_phone, lang_id 
               FROM students 
               WHERE parent_id = ? OR id = ? 
               LIMIT 1`,
              [userRow.user_id, userRow.user_id]
            );

            const guardianName = parentInfo?.guardian_name || userRow.username;
            const token = AuthService.generateToken({
              id: userRow.id,
              userId: userRow.id,
              username: guardianName,
              email: parentInfo?.guardian_email || userRow.username,
              role: 'parent',
              parentId: userRow.id,
            });

            return res.status(200).json({
              status: true,
              success: true,
              message: 'Login successful',
              data: {
                token,
                user: {
                  id: userRow.id,
                  username: guardianName,
                  email: parentInfo?.guardian_email || userRow.username,
                  roles: { parent: userRow.id },
                  language: { lang_id: parentInfo?.lang_id || 1, language: 'English' },
                },
              },
            });
          }
        }
      }

      // 3. Fallback search directly in `students` table by admission_no, email, roll_no, mobileno
      const studentDirect = await queryOne(
        `SELECT s.id, s.firstname, s.lastname, s.email, s.admission_no, s.roll_no, s.mobileno, s.is_active, s.gender,
                u.id as u_id, u.username as u_username, u.password as u_password, u.is_active as u_active
         FROM students s
         LEFT JOIN users u ON u.user_id = s.id AND u.role = 'student'
         WHERE s.admission_no = ? OR s.email = ? OR s.roll_no = ? OR s.mobileno = ?
         LIMIT 1`,
        [username, username, username, username]
      );

      if (studentDirect) {
        if (studentDirect.is_active === 'no' || studentDirect.u_active === 'no') {
          return sendError(res, 'Your account is disabled. Please contact the administrator.', 403);
        }

        let isMatch = false;
        if (studentDirect.u_password) {
          isMatch = await AuthService.verifyPassword(password, studentDirect.u_password);
        }

        if (isMatch) {
          const fullName = [studentDirect.firstname, studentDirect.lastname].filter(Boolean).join(' ');
          const token = AuthService.generateToken({
            id: studentDirect.u_id || studentDirect.id,
            username: fullName,
            email: studentDirect.email || username,
            role: 'student',
            studentId: studentDirect.id,
          });

          return res.status(200).json({
            status: true,
            success: true,
            message: 'Login successful',
            data: {
              token,
              user: {
                id: studentDirect.u_id || studentDirect.id,
                username: fullName,
                email: studentDirect.email || username,
                roles: { student: studentDirect.id },
                language: { lang_id: 1, language: 'English' },
                gender: studentDirect.gender,
              },
            },
          });
        }
      }

      return sendError(res, 'Invalid username or password', 401);
    } catch (error) {
      logger.error('Error in AuthController.login:', error);
      return sendError(res, 'Internal authentication error', 500);
    }
  }

  /**
   * Logout Handler
   * POST /api/Auth/logout
   */
  public static async logout(req: Request, res: Response) {
    return sendSuccess(res, { message: 'Logged out successfully' });
  }

  /**
   * Get Current Authenticated User Details
   * GET /api/Auth/user_details or GET /api/Auth/profile
   */
  public static async getProfile(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) {
      return sendError(res, 'Not authenticated', 401);
    }
    return sendSuccess(res, { user });
  }
}
