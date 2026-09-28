import { Router } from 'express';
import { CertificateController } from './certificate.controller';

const certRouter = Router();

// Certificate routes
certRouter.get('/', CertificateController.certificates);
certRouter.get('/index', CertificateController.certificates);
certRouter.post('/create', CertificateController.createCertificate);
certRouter.post('/update/:id', CertificateController.updateCertificate);
certRouter.put('/update/:id', CertificateController.updateCertificate);
certRouter.delete('/delete/:id', CertificateController.deleteCertificate);
certRouter.post('/delete/:id', CertificateController.deleteCertificate);
certRouter.post('/delete', CertificateController.deleteCertificate);
certRouter.post('/generate', CertificateController.generateCertificates);

// Sub-path aliases
certRouter.get('/certificate', CertificateController.certificates);
certRouter.get('/certificates', CertificateController.certificates);
certRouter.post('/certificate/create', CertificateController.createCertificate);
certRouter.post('/certificate/update/:id', CertificateController.updateCertificate);
certRouter.put('/certificate/update/:id', CertificateController.updateCertificate);
certRouter.delete('/certificate/delete/:id', CertificateController.deleteCertificate);
certRouter.post('/certificate/delete/:id', CertificateController.deleteCertificate);
certRouter.post('/certificate/delete', CertificateController.deleteCertificate);
certRouter.post('/certificate/generate', CertificateController.generateCertificates);

const idCardRouter = Router();

// ID Card routes
idCardRouter.get('/', CertificateController.idCards);
idCardRouter.get('/index', CertificateController.idCards);
idCardRouter.post('/create', CertificateController.createIdCard);
idCardRouter.post('/update/:id', CertificateController.updateIdCard);
idCardRouter.put('/update/:id', CertificateController.updateIdCard);
idCardRouter.delete('/delete/:id', CertificateController.deleteIdCard);
idCardRouter.post('/delete/:id', CertificateController.deleteIdCard);
idCardRouter.post('/delete', CertificateController.deleteIdCard);
idCardRouter.post('/generate', CertificateController.generateIdCards);

// Sub-path aliases
idCardRouter.get('/idcard', CertificateController.idCards);
idCardRouter.get('/idcards', CertificateController.idCards);
idCardRouter.post('/idcard/create', CertificateController.createIdCard);
idCardRouter.post('/idcard/update/:id', CertificateController.updateIdCard);
idCardRouter.put('/idcard/update/:id', CertificateController.updateIdCard);
idCardRouter.delete('/idcard/delete/:id', CertificateController.deleteIdCard);
idCardRouter.post('/idcard/delete/:id', CertificateController.deleteIdCard);
idCardRouter.post('/idcard/delete', CertificateController.deleteIdCard);
idCardRouter.post('/idcard/generate', CertificateController.generateIdCards);

export const certificateRoutes = certRouter;
export const idCardRoutes = idCardRouter;
