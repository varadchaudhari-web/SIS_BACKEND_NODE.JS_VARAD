import { Request, Response } from 'express';
import { CertificateService } from './certificate.service';
import { sendSuccess, sendError } from '../../utils/response.util';
import { logger } from '../../utils/logger';

export class CertificateController {
  // Certificates
  public static async certificates(req: Request, res: Response) {
    try {
      const id = req.params.id || (typeof req.query.id === 'string' ? req.query.id : undefined);
      const rows = await CertificateService.getCertificates(id);
      return sendSuccess(res, rows);
    } catch (error) {
      logger.error('Error in certificates list:', error);
      return sendError(res, 'Failed to fetch certificates', 500);
    }
  }

  public static async createCertificate(req: Request, res: Response) {
    try {
      const { certificate_name, name } = req.body;
      const title = certificate_name || name;
      if (!title) return sendError(res, 'Certificate name is required', 400);

      const result = await CertificateService.createCertificate(req.body);
      return sendSuccess(res, { id: result.insertId, name: title }, 'Certificate created successfully', 201);
    } catch (error) {
      return sendError(res, 'Failed to create certificate template', 500);
    }
  }

  public static async updateCertificate(req: Request, res: Response) {
    try {
      const id = req.params.id || req.body.id;
      if (!id) return sendError(res, 'Certificate ID is required', 400);

      await CertificateService.updateCertificate(id, req.body);
      return sendSuccess(res, { id }, 'Certificate updated successfully');
    } catch (error) {
      return sendError(res, 'Failed to update certificate template', 500);
    }
  }

  public static async deleteCertificate(req: Request, res: Response) {
    try {
      const id = req.params.id || req.body.id || req.query.id;
      if (!id) return sendError(res, 'Certificate ID is required', 400);

      await CertificateService.deleteCertificate(id);
      return sendSuccess(res, { id }, 'Certificate deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete certificate template', 500);
    }
  }

  public static async generateCertificates(req: Request, res: Response) {
    try {
      const { certificate_id, id, student_ids, students } = req.body;
      const templateId = certificate_id || id;
      const stuIds = student_ids || students || [];

      if (!templateId) return sendError(res, 'Certificate template ID is required', 400);
      const generated = await CertificateService.generateCertificates(templateId, stuIds);
      return sendSuccess(res, generated, 'Certificates generated successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to generate certificates', 500);
    }
  }

  // ID Cards
  public static async idCards(req: Request, res: Response) {
    try {
      const id = req.params.id || (typeof req.query.id === 'string' ? req.query.id : undefined);
      const rows = await CertificateService.getIdCards(id);
      return sendSuccess(res, rows);
    } catch (error) {
      logger.error('Error in idCards list:', error);
      return sendError(res, 'Failed to fetch ID cards', 500);
    }
  }

  public static async createIdCard(req: Request, res: Response) {
    try {
      const { title, name } = req.body;
      const cardTitle = title || name;
      if (!cardTitle) return sendError(res, 'ID Card title is required', 400);

      const result = await CertificateService.createIdCard(req.body);
      return sendSuccess(res, { id: result.insertId, title: cardTitle }, 'ID card template created successfully', 201);
    } catch (error) {
      return sendError(res, 'Failed to create ID card template', 500);
    }
  }

  public static async updateIdCard(req: Request, res: Response) {
    try {
      const id = req.params.id || req.body.id;
      if (!id) return sendError(res, 'ID Card ID is required', 400);

      await CertificateService.updateIdCard(id, req.body);
      return sendSuccess(res, { id }, 'ID card template updated successfully');
    } catch (error) {
      return sendError(res, 'Failed to update ID card template', 500);
    }
  }

  public static async deleteIdCard(req: Request, res: Response) {
    try {
      const id = req.params.id || req.body.id || req.query.id;
      if (!id) return sendError(res, 'ID Card ID is required', 400);

      await CertificateService.deleteIdCard(id);
      return sendSuccess(res, { id }, 'ID card template deleted successfully');
    } catch (error) {
      return sendError(res, 'Failed to delete ID card template', 500);
    }
  }

  public static async generateIdCards(req: Request, res: Response) {
    try {
      const { id_card_id, id, student_ids, students } = req.body;
      const templateId = id_card_id || id;
      const stuIds = student_ids || students || [];

      if (!templateId) return sendError(res, 'ID Card template ID is required', 400);
      const generated = await CertificateService.generateIdCards(templateId, stuIds);
      return sendSuccess(res, generated, 'ID cards generated successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to generate ID cards', 500);
    }
  }
}
