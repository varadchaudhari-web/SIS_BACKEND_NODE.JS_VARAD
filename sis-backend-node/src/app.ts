import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { env } from './config/env';
import { apiRouter } from './routes';
import { calendarRoutes } from './modules/calendar/calendar.routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { serveFileOrFallback } from './utils/fileResolver';

const app = express();

// Middlewares
app.use(cors({
  origin: env.CORS.ORIGIN === '*' ? true : env.CORS.ORIGIN,
  credentials: true,
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Intelligent fallback handler for school logos and favicons
app.get('/uploads/school_content/logo/:filename', (req, res, next) => {
  const filename = req.params.filename;
  const logoDir = path.join(env.STORAGE.LEGACY_UPLOADS, 'school_content', 'logo');
  const exactFile = path.join(logoDir, filename);

  if (fs.existsSync(exactFile) && fs.statSync(exactFile).isFile()) {
    return res.sendFile(exactFile);
  }

  // Fuzzy match or fallback
  if (fs.existsSync(logoDir)) {
    const entries = fs.readdirSync(logoDir);
    // Filter only actual image files
    const imageFiles = entries.filter(f => {
      try {
        const fullPath = path.join(logoDir, f);
        return fs.statSync(fullPath).isFile() && (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.webp') || f.endsWith('.jpeg'));
      } catch {
        return false;
      }
    });

    if (filename.toLowerCase().includes('fav')) {
      const favMatch = imageFiles.find(f => f.toLowerCase().includes('fav'));
      if (favMatch) return res.sendFile(path.join(logoDir, favMatch));
    }

    if (filename.toLowerCase().includes('logo') || filename.toLowerCase().includes('admin')) {
      const logoMatch = imageFiles.find(f => f.toLowerCase().includes('logo'));
      if (logoMatch) return res.sendFile(path.join(logoDir, logoMatch));
    }

    if (imageFiles.length > 0) {
      return res.sendFile(path.join(logoDir, imageFiles[0]));
    }
  }

  return next();
});

// Static file routes and Universal Fallback for uploads, storage and backend uploads across all modules
const handleStaticFileRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const relPath = req.path.replace(/^\//, '').split('?')[0];
  if (!relPath) return next();
  return serveFileOrFallback(relPath, res);
};

app.use('/storage', express.static(env.STORAGE.BASE_PATH));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
app.use('/uploads', express.static(env.STORAGE.LEGACY_UPLOADS));

app.use('/uploads', handleStaticFileRequest);
app.use('/backend/uploads', handleStaticFileRequest);
app.use('/api/uploads', handleStaticFileRequest);
app.use('/storage', handleStaticFileRequest);

// Direct non-/api routes that frontend may hit directly
app.use('/admin/calendar', calendarRoutes);
app.use('/user/calendar', calendarRoutes);

// Mount main API
app.use('/api', apiRouter);

// Root greeting
app.get('/', (req, res) => {
  res.json({
    name: 'Sahyadri International School Backend API',
    status: 'Running',
    version: '1.0.0 (Node.js + TypeScript)',
    timestamp: new Date().toISOString(),
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
