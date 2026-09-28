import { Response } from 'express';

export interface ApiResponse<T = any> {
  status?: boolean;
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
  [key: string]: any;
}

export function sendSuccess<T = any>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200,
  extra: Record<string, any> = {}
) {
  // If data is already an array or custom object
  return res.status(statusCode).json({
    status: true,
    success: true,
    message,
    data,
    ...extra,
  });
}

export function sendRaw(res: Response, payload: any, statusCode: number = 200) {
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  error: string = 'Internal Server Error',
  statusCode: number = 500,
  details: any = null
) {
  return res.status(statusCode).json({
    status: false,
    success: false,
    error,
    message: error,
    details: details || undefined,
  });
}
