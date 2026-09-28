import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
  id: number;
  userId?: number;
  username: string;
  email?: string;
  role: string;
  roles?: Record<string, any>;
  studentId?: number;
  parentId?: number;
  staffId?: number;
  sessionId?: number;
}

export class AuthService {
  /**
   * Verify password against bcrypt hash or plain text fallback
   */
  public static async verifyPassword(plain: string, hashed: string): Promise<boolean> {
    if (!plain || !hashed) return false;
    
    // 1. Check standard bcrypt ($2y$, $2a$, $2b$)
    if (hashed.startsWith('$2y$') || hashed.startsWith('$2a$') || hashed.startsWith('$2b$')) {
      const normalizedHash = hashed.replace(/^\$2y\$/, '$2a$');
      try {
        const isBcrypt = await bcrypt.compare(plain, normalizedHash);
        if (isBcrypt) return true;
      } catch {
        // Continue to fallback
      }
    }
    
    // 2. Check MD5 hash (PHP legacy compatibility)
    try {
      const crypto = require('crypto');
      const md5Hash = crypto.createHash('md5').update(plain).digest('hex');
      if (md5Hash.toLowerCase() === hashed.toLowerCase()) return true;
    } catch {
      // Ignore
    }

    // 3. Fallback for legacy plain text passwords if any
    return plain === hashed;
  }

  /**
   * Hash a new password
   */
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Generate signed JWT access token
   */
  public static generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT.SECRET, {
      expiresIn: env.JWT.EXPIRES_IN as any,
    });
  }

  /**
   * Verify and decode JWT token
   */
  public static verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, env.JWT.SECRET) as TokenPayload;
    } catch {
      return null;
    }
  }
}
