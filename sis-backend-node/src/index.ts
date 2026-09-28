import app from './app';
import { env } from './config/env';
import { pool } from './config/database';
import { logger } from './utils/logger';
import { StorageService } from './services/storage.service';

async function bootstrap() {
  try {
    // Ensure base storage directories
    StorageService.ensureDir(env.STORAGE.BASE_PATH);
    StorageService.ensureDir(`${env.STORAGE.BASE_PATH}/private`);
    StorageService.ensureDir(`${env.STORAGE.BASE_PATH}/public`);
    StorageService.ensureDir(`${env.STORAGE.BASE_PATH}/educational`);
    StorageService.ensureDir(`${env.STORAGE.BASE_PATH}/collections`);

    // Test Database connection
    try {
      await pool.query('SELECT 1 as connected');
      logger.info('✅ PostgreSQL Database connected successfully!');
    } catch (dbErr: any) {
      logger.warn(`⚠️ PostgreSQL Database connection warning (${dbErr.message}). Make sure PostgreSQL is running on port ${env.DB.PORT}.`);
    }

    // Start Server
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 Sahyadri SIS Backend running on http://localhost:${env.PORT}`);
      logger.info(`🌐 Environment: ${env.NODE_ENV}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        pool.end();
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
