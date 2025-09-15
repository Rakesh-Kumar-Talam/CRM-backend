import { google } from 'googleapis';
import { UserModel } from '../models/User';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export class GmailService {
	private oauth2Client: any;

	constructor() {
		this.oauth2Client = new google.auth.OAuth2(
			env.googleClientId,
			env.googleClientSecret,
			env.googleCallbackUrl
		);
	}

	async sendEmail(userEmail: string, emailData: {
		to: string;
		subject: string;
		text: string;
		html?: string;
	}) {
		try {
			// Get user with Gmail tokens
			const user = await UserModel.findOne({ email: userEmail }).select('+gmailAccessToken +gmailRefreshToken');
			
			if (!user) {
				return {
					success: false,
					error: 'User not found'
				};
			}

			if (!user.gmailVerified || !user.gmailAccessToken) {
				return {
					success: false,
					error: 'Gmail not verified. Please authenticate with Google first.'
				};
			}

			// Set credentials
			this.oauth2Client.setCredentials({
				access_token: user.gmailAccessToken,
				refresh_token: user.gmailRefreshToken
			});

			// Create Gmail API instance
			const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

			// Create email message
			const message = this.createEmailMessage(userEmail, emailData);

			// Send email
			const result = await gmail.users.messages.send({
				userId: 'me',
				requestBody: {
					raw: message
				}
			});

			logger.info(`Gmail email sent successfully from ${userEmail} to ${emailData.to}`, {
				messageId: result.data.id,
				subject: emailData.subject
			});

			return {
				success: true,
				messageId: result.data.id
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			logger.error(`Failed to send Gmail email from ${userEmail}:`, error);
			
			// Check if token needs refresh
			if (errorMessage.includes('invalid_grant') || errorMessage.includes('invalid_token')) {
				return {
					success: false,
					error: 'Gmail access expired. Please re-authenticate with Google.',
					needsReauth: true
				};
			}

			return {
				success: false,
				error: errorMessage
			};
		}
	}


	private createEmailMessage(fromEmail: string, emailData: {
		to: string;
		subject: string;
		text: string;
		html?: string;
	}): string {
		const boundary = '----=_Part_' + Math.random().toString(36).substr(2, 9);
		const headers = [
			`From: ${fromEmail}`,
			`To: ${emailData.to}`,
			`Subject: ${emailData.subject}`,
			'MIME-Version: 1.0',
			`Content-Type: multipart/alternative; boundary="${boundary}"`
		];

		const textPart = [
			`--${boundary}`,
			'Content-Type: text/plain; charset=UTF-8',
			'Content-Transfer-Encoding: 7bit',
			'',
			emailData.text
		];

		const htmlPart = emailData.html ? [
			`--${boundary}`,
			'Content-Type: text/html; charset=UTF-8',
			'Content-Transfer-Encoding: 7bit',
			'',
			emailData.html
		] : [];

		const endBoundary = [`--${boundary}--`];

		const message = [
			...headers,
			'',
			...textPart,
			...htmlPart,
			...endBoundary
		].join('\n');

		// Encode message in base64url format
		return Buffer.from(message)
			.toString('base64')
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '');
	}

	async verifyGmailAccess(userEmail: string): Promise<boolean> {
		try {
			const user = await UserModel.findOne({ email: userEmail }).select('+gmailAccessToken +gmailRefreshToken');
			
			if (!user || !user.gmailVerified || !user.gmailAccessToken) {
				return false;
			}

			// Set credentials
			this.oauth2Client.setCredentials({
				access_token: user.gmailAccessToken,
				refresh_token: user.gmailRefreshToken
			});

			// Test Gmail API access
			const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
			await gmail.users.getProfile({ userId: 'me' });

			return true;
		} catch (error) {
			logger.error(`Gmail verification failed for ${userEmail}:`, error);
			return false;
		}
	}
}

export const gmailService = new GmailService();
