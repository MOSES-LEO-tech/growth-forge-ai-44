// Email service for authentication
// Uses Nodemailer for sending emails via SMTP

import nodemailer from 'nodemailer';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

class EmailService {
    private transporter: nodemailer.Transporter | null = null;
    private fromEmail: string;
    private fromName: string;
    private frontendUrl: string;

    constructor() {
        this.fromEmail = process.env.EMAIL_FROM || 'noreply@growthforge.ai';
        this.fromName = process.env.EMAIL_FROM_NAME || 'Growth Forge AI';
        this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
        
        // Initialize transporter only in production or if SMTP is configured
        this.initTransporter();
    }

    private initTransporter(): void {
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = parseInt(process.env.SMTP_PORT || '587');
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;

        if (smtpHost && smtpUser && smtpPass) {
            this.transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpPort === 465, // true for SSL, false for TLS
                auth: {
                    user: smtpUser,
                    pass: smtpPass,
                },
                tls: {
                    rejectUnauthorized: process.env.NODE_ENV === 'production'
                }
            });
            
            console.log('📧 Email service initialized with SMTP:', smtpHost);
        } else {
            console.log('📧 Email service running in development mode (emails will be logged)');
        }
    }

    async sendEmail(options: EmailOptions): Promise<boolean> {
        // In development, just log the email
        if (process.env.NODE_ENV !== 'production' && !this.transporter) {
            console.log('📧 [DEV] Email sent:');
            console.log(`   To: ${options.to}`);
            console.log(`   Subject: ${options.subject}`);
            console.log(`   Preview URL: ${this.generatePreviewUrl(options.html)}`);
            return true;
        }

        // In production or with SMTP configured, send real email
        if (this.transporter) {
            try {
                await this.transporter.sendMail({
                    from: `"${this.fromName}" <${this.fromEmail}>`,
                    to: options.to,
                    subject: options.subject,
                    html: options.html,
                    text: options.text || this.stripHtml(options.html),
                });
                console.log(`📧 [PROD] Email sent to ${options.to}: ${options.subject}`);
                return true;
            } catch (error) {
                console.error('Failed to send email:', error);
                return false;
            }
        }

        console.log('📧 [PROD] Email would be sent:', options.subject);
        return true;
    }

    private generatePreviewUrl(html: string): string {
        // For development debugging
        return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    }

    private stripHtml(html: string): string {
        return html.replace(/<[^>]*>/g, '')
                  .replace(/\s+/g, ' ')
                  .trim();
    }

    async sendVerificationEmail(to: string, token: string, userName?: string): Promise<boolean> {
        const verificationUrl = `${this.frontendUrl}/verify-email?token=${token}`;

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Growth Forge AI</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Verify Your Email Address</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <p>Hi ${userName || 'there'},</p>
                
                <p>Thank you for registering with Growth Forge AI! To complete your registration, please verify your email address by clicking the button below:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Verify Email Address
                    </a>
                </div>
                
                <p style="color: #666; font-size: 14px;">This verification link will expire in 24 hours. If you didn't create an account with Growth Forge AI, please ignore this email or contact support if you have concerns.</p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px; text-align: center;">
                    © ${new Date().getFullYear()} Growth Forge AI. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        `;

        return this.sendEmail({
            to,
            subject: 'Verify Your Email - Growth Forge AI',
            html,
        });
    }

    async sendPasswordResetEmail(to: string, token: string, userName?: string): Promise<boolean> {
        const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Growth Forge AI</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Reset Your Password</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <p>Hi ${userName || 'there'},</p>
                
                <p>We received a request to reset your password. If you made this request, click the button below to create a new password:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                    <strong>Security Note:</strong> This password reset link will expire in 1 hour for your security.
                </p>
                
                <p style="color: #666; font-size: 14px;">
                    If you didn't request a password reset, please ignore this email or contact support if you have concerns. Your password will remain unchanged.
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px; text-align: center;">
                    © ${new Date().getFullYear()} Growth Forge AI. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        `;

        return this.sendEmail({
            to,
            subject: 'Reset Your Password - Growth Forge AI',
            html,
        });
    }

    async sendPasswordChangeNotificationEmail(to: string, userName?: string): Promise<boolean> {
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Changed</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #4CAF50; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Growth Forge AI</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Password Changed Successfully</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <p>Hi ${userName || 'there'},</p>
                
                <p>Your password has been successfully changed. If you made this change, you can ignore this email.</p>
                
                <p style="color: #666; font-size: 14px;">
                    <strong>If you didn't change your password</strong>, please contact our support team immediately. Your account may have been compromised.
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px; text-align: center;">
                    © ${new Date().getFullYear()} Growth Forge AI. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        `;

        return this.sendEmail({
            to,
            subject: 'Password Changed - Growth Forge AI',
            html,
        });
    }

    async sendLoginAlertEmail(to: string, userName: string, ipAddress: string, userAgent: string, time: Date): Promise<boolean> {
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Login detected</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #2196F3; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Growth Forge AI</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">New Login detected</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <p>Hi ${userName},</p>
                
                <p>A new login to your account was detected:</p>
                
                <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Time:</strong> ${time.toLocaleString()}</p>
                    <p style="margin: 5px 0;"><strong>IP Address:</strong> ${ipAddress}</p>
                    <p style="margin: 5px 0;"><strong>Device:</strong> ${userAgent}</p>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                    If this was you, you can ignore this email. If you don't recognize this activity, please change your password immediately and contact support.
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px; text-align: center;">
                    © ${new Date().getFullYear()} Growth Forge AI. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        `;

        return this.sendEmail({
            to,
            subject: 'New Login detected - Growth Forge AI',
            html,
        });
    }

    // New email templates
    
    async sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Growth Forge AI</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to Growth Forge AI!</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <p>Hi ${userName},</p>
                
                <p>Welcome to Growth Forge AI! We're excited to have you on board.</p>
                
                <p>Here's what you can do next:</p>
                <ul style="line-height: 1.8;">
                    <li>📝 Complete your profile with your achievements</li>
                    <li>🏆 Add projects to showcase your work</li>
                    <li>🎓 Get matched with scholarships</li>
                    <li>💬 Chat with SmartBuddy for personalized advice</li>
                </ul>
                
                <p style="color: #666; font-size: 14px;">
                    If you have any questions, our support team is here to help!
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px; text-align: center;">
                    © ${new Date().getFullYear()} Growth Forge AI. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        `;

        return this.sendEmail({
            to,
            subject: 'Welcome to Growth Forge AI!',
            html,
        });
    }

    async sendAchievementVerifiedEmail(to: string, userName: string, achievementTitle: string, verifierName: string): Promise<boolean> {
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Achievement Verified</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🏆 Achievement Verified!</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <p>Hi ${userName},</p>
                
                <p>Great news! Your achievement has been verified:</p>
                
                <div style="background: #fff; border: 2px solid #4CAF50; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: #4CAF50;">✓ ${achievementTitle}</p>
                    <p style="margin: 10px 0 0 0; color: #666;">Verified by ${verifierName}</p>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                    Verified achievements help strengthen your portfolio and improve your scholarship matches!
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px; text-align: center;">
                    © ${new Date().getFullYear()} Growth Forge AI. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        `;

        return this.sendEmail({
            to,
            subject: `🏆 Your Achievement "${achievementTitle}" Has Been Verified!`,
            html,
        });
    }
}

export const emailService = new EmailService();
