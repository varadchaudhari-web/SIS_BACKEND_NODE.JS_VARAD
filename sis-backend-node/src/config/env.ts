import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '8080', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB: {
    HOST: process.env.DB_HOST || '127.0.0.1',
    PORT: parseInt(process.env.DB_PORT || '3306', 10),
    USER: process.env.DB_USER || 'root',
    PASSWORD: process.env.DB_PASSWORD || '',
    DATABASE: process.env.DB_NAME || 'NWE_SIS_DB',
    CONNECTION_LIMIT: parseInt(process.env.DB_CONNECTION_LIMIT || '20', 10),
  },
  JWT: {
    SECRET: process.env.JWT_SECRET || 'sahyadri_sis_jwt_super_secret_key_2026',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  },
  STORAGE: {
    BASE_PATH: path.resolve(__dirname, '../../storage'),
    LEGACY_UPLOADS: path.resolve(__dirname, '../../../Sahyadri-International-School-Backend/uploads'),
  },
  CORS: {
    ORIGIN: process.env.CORS_ORIGIN || '*',
  },
};
