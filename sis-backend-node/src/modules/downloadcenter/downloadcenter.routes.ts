import { Router } from 'express';
import { DownloadCenterController } from './downloadcenter.controller';
import multer from 'multer';
import path from 'path';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(process.cwd(), 'uploads/school_content/material'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '')}`);
  }
});
const upload = multer({ storage });

router.get('/', DownloadCenterController.getAll);
router.get('/detail/:id', DownloadCenterController.detail);
router.get('/assignments', DownloadCenterController.assignments);
router.get('/study_material', DownloadCenterController.studyMaterial);
router.get('/study-material', DownloadCenterController.studyMaterial);
router.get('/syllabus', DownloadCenterController.syllabus);
router.get('/other', DownloadCenterController.other);
router.get('/student', DownloadCenterController.getStudentDownloads);
router.post('/upload', upload.single('file'), DownloadCenterController.upload);
router.delete('/delete/:id', DownloadCenterController.deleteContent);
router.post('/delete/:id', DownloadCenterController.deleteContent);
router.post('/delete', DownloadCenterController.deleteContent);
router.get('/file/:filename', DownloadCenterController.file);

export const downloadCenterRoutes = router;
