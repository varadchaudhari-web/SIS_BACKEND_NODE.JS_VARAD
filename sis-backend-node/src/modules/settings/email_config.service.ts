import nodemailer from 'nodemailer';
import { EmailConfigModel, EmailConfigRecord } from './email_config.model';
import { logger } from '../../utils/logger';

export class EmailConfigService {
  /**
   * Get Email Configuration
   */
  public static async getEmailConfig(): Promise<EmailConfigRecord> {
    const record = await EmailConfigModel.getActiveEmail();
    if (!record) {
      return {
        email_type: 'smtp',
        smtp_server: '',
        smtp_port: '587',
        smtp_username: '',
        smtp_password: '',
        ssl_tls: 'tls',
        is_active: 'yes',
      };
    }
    return record;
  }

  /**
   * Save / Update Email Configuration
   */
  public static async saveEmailConfig(body: any): Promise<{ status: boolean; message: string; data: any }> {
    const emailType = body.email_type || 'smtp';
    const smtpServer = body.smtp_server || '';
    const smtpPort = body.smtp_port ? String(body.smtp_port) : '587';
    const smtpUsername = body.smtp_username || '';
    const smtpPassword = body.smtp_password || '';
    const sslTls = body.smtp_security || body.ssl_tls || 'tls';

    if (emailType === 'smtp') {
      if (!smtpServer) {
        throw new Error('SMTP Server address is required');
      }
      if (!smtpPort) {
        throw new Error('SMTP Port is required');
      }
    }

    const payload: Partial<EmailConfigRecord> = {
      email_type: emailType,
      smtp_server: smtpServer,
      smtp_port: smtpPort,
      smtp_username: smtpUsername,
      smtp_password: smtpPassword,
      ssl_tls: sslTls,
      is_active: 'yes',
    };

    const id = await EmailConfigModel.add(payload);

    return {
      status: true,
      message: 'Email SMTP gateway configuration saved successfully',
      data: { id, ...payload },
    };
  }

  /**
   * Create Nodemailer Transporter based on active database configuration
   */
  public static async createTransporter() {
    const config = await this.getEmailConfig();

    if (config.email_type === 'sendmail') {
      return nodemailer.createTransport({
        sendmail: true,
        newline: 'unix',
        path: '/usr/sbin/sendmail',
      });
    }

    const port = Number(config.smtp_port) || 587;
    const isSecure = port === 465 || config.ssl_tls?.toLowerCase() === 'ssl';

    return nodemailer.createTransport({
      host: config.smtp_server || 'smtp.gmail.com',
      port,
      secure: isSecure,
      auth: config.smtp_username
        ? {
            user: config.smtp_username,
            pass: config.smtp_password || '',
          }
        : undefined,
      tls: {
        rejectUnauthorized: false, // Prevents self-signed cert errors in institutional networks
      },
    });
  }

  /**
   * Send Test Email
   */
  public static async sendTestEmail(recipientEmail: string): Promise<{ status: boolean; message: string; messageId?: string }> {
    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim())) {
      throw new Error('Valid recipient email address is required');
    }

    const config = await this.getEmailConfig();
    const fromAddress = config.smtp_username || 'no-reply@sahyadrischool.in';

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; border-bottom: 2px solid #ea580c; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #1e293b; margin: 0; font-size: 20px;">Sahyadri International School</h2>
          <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">School Information System (SIS)</p>
        </div>
        <div style="padding: 12px 0;">
          <h3 style="color: #16a34a; margin-top: 0;">✅ SMTP Gateway Test Successful!</h3>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            This is a confirmation test email dispatched from your <strong>Sahyadri International School Node.js Backend</strong>.
          </p>
          <div style="background-color: #f8fafc; border-left: 4px solid #ea580c; padding: 12px; margin: 16px 0; font-size: 13px; color: #475569;">
            <strong>Email Engine:</strong> ${config.email_type.toUpperCase()}<br/>
            <strong>SMTP Server:</strong> ${config.smtp_server || 'N/A'}:${config.smtp_port || 'N/A'}<br/>
            <strong>Security:</strong> ${config.ssl_tls?.toUpperCase() || 'TLS'}<br/>
            <strong>Dispatched To:</strong> ${recipientEmail}<br/>
            <strong>Timestamp:</strong> ${new Date().toLocaleString()}
          </div>
          <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
            If you received this message, your school email gateway is properly configured and operational.
          </p>
        </div>
      </div>
    `;

    try {
      const transporter = await this.createTransporter();
      const info = await transporter.sendMail({
        from: `"Sahyadri International School" <${fromAddress}>`,
        to: recipientEmail.trim(),
        subject: 'Sahyadri School Email Gateway Test Successful',
        text: 'Sahyadri International School - Test Email Sent Successfully.',
        html: htmlContent,
      });

      logger.info(`Test email successfully dispatched to ${recipientEmail}, messageId: ${info.messageId}`);

      return {
        status: true,
        message: 'Test Email Sent Successfully. Please check your email inbox if you have received.',
        messageId: info.messageId,
      };
    } catch (error: any) {
      logger.error('Error sending test email via SMTP transporter:', error);
      // Fallback response with informative error
      throw new Error(`SMTP Gateway Error: ${error.message || 'Failed to dispatch email via SMTP server'}`);
    }
  }

  /**
   * Send Email Notification (Generic for student/fees/attendance)
   */
  public static async sendMail(to: string, subject: string, html: string, text?: string) {
    if (!to) return null;
    const config = await this.getEmailConfig();
    const fromAddress = config.smtp_username || 'no-reply@sahyadrischool.in';

    try {
      const transporter = await this.createTransporter();
      return await transporter.sendMail({
        from: `"Sahyadri International School" <${fromAddress}>`,
        to,
        subject,
        text: text || subject,
        html,
      });
    } catch (e: any) {
      logger.error(`Failed to send email to ${to}:`, e);
      return null;
    }
  }
}
