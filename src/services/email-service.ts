/**
 * Nodemailer Email Service
 * Handles sending email reports with configurable providers
 */

import nodemailer from 'nodemailer';
import { EmailTemplateService, EmailTemplateData } from './email-template';
import path from 'path';
import fs from 'fs/promises';
import { mkdir } from 'fs/promises';

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private provider: string;
  private fromAddress: string;
  private toAddress: string;
  private ccAddress?: string;
  private subject: string;
  private connectionVerified: boolean = false;

  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'gmail';
    this.fromAddress = process.env.REPORT_FROM || 'noreply@southwestinvestment.local';
    this.toAddress = process.env.REPORT_TO || '';
    this.ccAddress = process.env.REPORT_TO_CC;
    this.subject = process.env.REPORT_SUBJECT || 'Daily Property Analysis - Southwest Investment';

    if (!this.toAddress) {
      throw new Error('REPORT_TO environment variable is required');
    }

    this.initializeTransporter();
  }

  /**
   * Initialize mail transporter based on provider
   */
  private initializeTransporter(): void {
    try {
      switch (this.provider) {
        case 'gmail':
          this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASSWORD,
            },
          });
          break;

        case 'outlook':
          this.transporter = nodemailer.createTransport({
            host: 'smtp-mail.outlook.com',
            port: 587,
            secure: false,
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASSWORD,
            },
          });
          break;

        case 'sendgrid':
          this.transporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: {
              user: 'apikey',
              pass: process.env.SENDGRID_API_KEY,
            },
          });
          break;

        case 'custom':
          this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_TLS === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            },
          });
          break;

        default:
          throw new Error(`Unknown email provider: ${this.provider}`);
      }

      console.log(`✅ Email transporter initialized with provider: ${this.provider}`);
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error);
      throw error;
    }
  }

  /**
   * Verify SMTP connection is working
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      console.error('❌ Transporter not initialized');
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection verified');
      return true;
    } catch (error) {
      console.error('❌ SMTP verification failed:', error);
      return false;
    }
  }

  /**
   * Send morning report email
   */
  async sendMorningReport(reportData: EmailTemplateData): Promise<boolean> {
    if (!this.transporter) {
      console.error('❌ Transporter not initialized');
      return false;
    }

    try {
      const htmlContent = EmailTemplateService.generateHTML(reportData);
      const textContent = EmailTemplateService.generateText(reportData);

      const mailOptions = {
        from: this.fromAddress,
        to: this.toAddress,
        ...(this.ccAddress && { cc: this.ccAddress }),
        subject: this.subject,
        html: htmlContent,
        text: textContent,
        headers: {
          'X-Mailer': 'Southwest Investment Software v1.0',
          'X-Report-Type': 'Daily Morning Report',
          'List-Unsubscribe': `<mailto:${this.fromAddress}?subject=unsubscribe>`,
        },
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log('✅ Email sent successfully');
      console.log(`   Message ID: ${info.messageId}`);
      console.log(`   To: ${this.toAddress}`);
      if (this.ccAddress) {
        console.log(`   CC: ${this.ccAddress}`);
      }

      await this.logEmailEventAsync('SENT', reportData);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      await this.logEmailEventAsync('FAILED', reportData, error);
      return false;
    }
  }

  /**
   * Send alert email for immediate issues
   */
  async sendAlertEmail(
    alertType: string,
    message: string,
    details?: Record<string, any>
  ): Promise<boolean> {
    if (!this.transporter) {
      console.error('❌ Transporter not initialized');
      return false;
    }

    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; }
            .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #fef2f2; padding: 20px; border-radius: 0 0 8px 8px; }
            .alert-type { font-size: 24px; font-weight: bold; }
            .details { background-color: #fff; padding: 15px; margin-top: 15px; border-left: 4px solid #dc2626; }
            pre { overflow-x: auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="alert-type">⚠️ ${alertType}</div>
            </div>
            <div class="content">
              <p>${message}</p>
              ${details ? `<div class="details"><pre>${JSON.stringify(details, null, 2)}</pre></div>` : ''}
              <p style="color: #999; font-size: 12px; margin-top: 20px;">
                Southwest Investment Software
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
Southwest Investment - Alert

Alert Type: ${alertType}
Message: ${message}
${details ? `\nDetails:\n${JSON.stringify(details, null, 2)}` : ''}
      `.trim();

      await this.transporter.sendMail({
        from: this.fromAddress,
        to: this.toAddress,
        subject: `[ALERT] ${alertType} - Southwest Investment`,
        html: htmlContent,
        text: textContent,
      });

      console.log(`✅ Alert email sent: ${alertType}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send alert email:', error);
      return false;
    }
  }

  /**
   * Asynchronously log email events for debugging (non-blocking)
   */
  private async logEmailEventAsync(
    status: 'SENT' | 'FAILED',
    data: EmailTemplateData,
    error?: any
  ): Promise<void> {
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      const logFile = path.join(logsDir, 'email.log');

      await mkdir(logsDir, { recursive: true });

      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        status,
        to: this.toAddress,
        properties: {
          highVelocity: data.highVelocityCount,
          evaluate: data.evaluateCount,
          alerts: (data.priceAlerts?.length || 0) + (data.domAlerts?.length || 0),
        },
        error: error ? error.message : null,
      };

      await fs.appendFile(
        logFile,
        JSON.stringify(logEntry) + '\n'
      );
    } catch (err) {
      // Silently fail logging to not crash email operations
      console.error('⚠️  Logging error:', err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Legacy sync logging for compatibility
   */
  private logEmailEvent(
    status: 'SENT' | 'FAILED',
    data: EmailTemplateData,
    error?: any
  ): void {
    // Fire and forget async logging without awaiting
    this.logEmailEventAsync(status, data, error).catch(err => {
      console.error('Async logging failed:', err);
    });
  }

  /**
   * Get email configuration status
   */
  getStatus(): {
    provider: string;
    fromAddress: string;
    toAddress: string;
    ccAddress?: string;
    isConfigured: boolean;
  } {
    return {
      provider: this.provider,
      fromAddress: this.fromAddress,
      toAddress: this.toAddress,
      ccAddress: this.ccAddress,
      isConfigured: !!this.transporter,
    };
  }
}

/**
 * Singleton instance
 */
let emailService: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailService) {
    emailService = new EmailService();
  }
  return emailService;
}
