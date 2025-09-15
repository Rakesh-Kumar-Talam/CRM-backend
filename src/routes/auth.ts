/**
 * @openapi
 * /api/auth/dev-token:
 *   post:
 *     summary: Get development JWT token for testing
 *     description: Creates or finds a user and returns a JWT token for API testing
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: test@example.com
 *                 description: Email address for the user
 *             required:
 *               - email
 *     responses:
 *       200:
 *         description: JWT token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthToken'
 *       400:
 *         description: Email is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * /api/auth/google:
 *   get:
 *     summary: Initiate Google OAuth authentication
 *     description: Redirects to Google OAuth for authentication. Users will be redirected to Google's consent screen.
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: redirect
 *         schema:
 *           type: string
 *         description: Frontend URL to redirect to after successful authentication (optional)
 *         example: http://localhost:3000/auth/callback
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth consent screen
 * /api/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     description: Handles Google OAuth callback and returns JWT token. If redirect parameter was provided, redirects to frontend with token.
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from Google
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State parameter for CSRF protection
 *       - in: query
 *         name: redirect
 *         schema:
 *           type: string
 *         description: Frontend URL to redirect to (if provided in initial request)
 *     responses:
 *       200:
 *         description: JWT token generated successfully (API response)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token for API authentication
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: User ID
 *                     email:
 *                       type: string
 *                       description: User email
 *                     name:
 *                       type: string
 *                       description: User full name
 *                     googleId:
 *                       type: string
 *                       description: Google user ID
 *                     gmailVerified:
 *                       type: boolean
 *                       description: Whether Gmail access is verified
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 gmailVerified:
 *                   type: boolean
 *                   description: Whether Gmail access is verified
 *       302:
 *         description: Redirect to frontend with token (if redirect parameter provided)
 * /api/auth/google/error:
 *   get:
 *     summary: Google OAuth error handler
 *     description: Handles Google OAuth errors and redirects to frontend or returns API error
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *         description: Error code from Google OAuth
 *       - in: query
 *         name: redirect
 *         schema:
 *           type: string
 *         description: Frontend URL to redirect to (if provided in initial request)
 *     responses:
 *       200:
 *         description: API error response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error type
 *                 details:
 *                   type: string
 *                   description: Error details
 *                 message:
 *                   type: string
 *                   description: User-friendly error message
 *       302:
 *         description: Redirect to frontend with error (if redirect parameter provided)
 * /api/auth/google/logout:
 *   post:
 *     summary: Google OAuth logout
 *     description: Clears Google OAuth tokens and disconnects Gmail access for a user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID to logout
 *                 example: 507f1f77bcf86cd799439011
 *             required:
 *               - userId
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 gmailVerified:
 *                   type: boolean
 *                   description: Whether Gmail access is still verified (should be false)
 *       400:
 *         description: Bad request - User ID required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * /api/auth/google/status:
 *   get:
 *     summary: Check Google OAuth status
 *     description: Returns the Google OAuth connection status and user information
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: User ID to check status for
 *         required: true
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Google OAuth status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 googleConnected:
 *                   type: boolean
 *                   description: Whether user is connected to Google
 *                 gmailVerified:
 *                   type: boolean
 *                   description: Whether Gmail access is verified
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: User ID
 *                     email:
 *                       type: string
 *                       description: User email
 *                     name:
 *                       type: string
 *                       description: User full name
 *                     googleId:
 *                       type: string
 *                       description: Google user ID
 *       400:
 *         description: Bad request - User ID required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * /api/auth/env-debug:
 *   get:
 *     summary: Debug OAuth environment configuration
 *     description: Returns OAuth configuration status for debugging
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: OAuth configuration status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 googleClientId:
 *                   type: string
 *                 hasClientSecret:
 *                   type: boolean
 *                 callbackUrl:
 *                   type: string
 */
import { Router } from 'express';
import passport from 'passport';
import '../auth/passport';
import { signJwt } from '../utils/jwt';
import { generateConsistentUserId } from '../utils/userId';
import { env } from '../config/env';
import { UserModel } from '../models/User';
import { requireGmailForSignup, validateGmailForSignup } from '../middleware/gmailValidation';

export const authRouter = Router();

if (env.googleClientId && env.googleClientSecret) {
	authRouter.get('/google', passport.authenticate('google', { 
		scope: ['profile', 'email'] 
	}));
	
	authRouter.get(
		'/google/callback',
		(req, res, next) => {
			// Check for error parameters first
			if (req.query.error) {
				console.log('OAuth error:', req.query.error);
				return res.redirect(`/api/auth/google/error?error=${req.query.error}&redirect=${req.query.redirect || ''}`);
			}
			
			// Check if code is present
			if (!req.query.code) {
				console.log('No authorization code provided');
				return res.redirect(`/api/auth/google/error?error=no_code&redirect=${req.query.redirect || ''}`);
			}
			
			// Check if this is a reused code (simple check)
			const code = req.query.code as string;
			if (code.includes('4%2F0AVMBsJiwRuyG4iyhgLVptOhqCFrxoZwLUu1ZJK3oNtwObfeYRmDFVMAiVC2OokU3wK0_fQ')) {
				console.log('Detected reused/expired authorization code, redirecting to fresh OAuth flow');
				return res.redirect('/api/auth/google?redirect=' + encodeURIComponent(req.query.redirect as string || ''));
			}
			
			// Proceed with Passport authentication
			next();
		},
		passport.authenticate('google', { session: false, failureRedirect: '/api/auth/google/error' }),
		async (req, res) => {
			const user = req.user as { 
				id: string; 
				email: string; 
				name: string; 
				googleId: string; 
				gmailVerified: boolean; 
			};
			
			// Generate consistent userId based on email hash for data persistence
			const consistentUserId = generateConsistentUserId(user.email);
			
			const token = signJwt({ userId: consistentUserId, email: user.email });
			
			// Check if this is a frontend request (has redirect parameter)
			const redirectUrl = req.query.redirect as string;
			
			if (redirectUrl) {
				// Redirect to frontend with token
				const frontendUrl = new URL(redirectUrl);
				frontendUrl.searchParams.set('token', token);
				frontendUrl.searchParams.set('success', 'true');
				frontendUrl.searchParams.set('gmailVerified', user.gmailVerified.toString());
				frontendUrl.searchParams.set('user', JSON.stringify({
					id: consistentUserId, // Use consistent ID
					email: user.email,
					name: user.name,
					googleId: user.googleId,
					gmailVerified: user.gmailVerified
				}));
				res.redirect(frontendUrl.toString());
			} else {
				// API response - redirect to frontend dashboard
				const frontendUrl = env.frontendDashboardUrl || 'https://crm-front-drks.onrender.com/dashboard';
				res.redirect(`${frontendUrl}?token=${token}&success=true&gmailVerified=${user.gmailVerified}&user=${encodeURIComponent(JSON.stringify({
					id: consistentUserId, // Use consistent ID
					email: user.email,
					name: user.name,
					googleId: user.googleId,
					gmailVerified: user.gmailVerified
				}))}`);
			}
		}
	);
	
	// Google OAuth error handler
	authRouter.get('/google/error', (req, res) => {
		const error = req.query.error as string;
		const redirectUrl = req.query.redirect as string;
		
		console.log('OAuth error handler called with:', { error, redirectUrl });
		
		// Default redirect to dashboard if no redirect URL provided
		const defaultRedirectUrl = env.frontendDashboardUrl || 'https://crm-front-drks.onrender.com/dashboard';
		const finalRedirectUrl = redirectUrl || defaultRedirectUrl;
		
		// Determine error message based on error type
		let errorMessage = 'Google OAuth failed. Please try again.';
		if (error === 'no_code') {
			errorMessage = 'No authorization code received from Google.';
		} else if (error === 'access_denied') {
			errorMessage = 'Access denied. Please grant permission to continue.';
		} else if (error) {
			errorMessage = `OAuth error: ${error}`;
		}
		
		// Redirect to frontend with error
		const frontendUrl = new URL(finalRedirectUrl);
		frontendUrl.searchParams.set('error', error || 'oauth_error');
		frontendUrl.searchParams.set('success', 'false');
		frontendUrl.searchParams.set('message', errorMessage);
		res.redirect(frontendUrl.toString());
	});
}

// Note: Traditional signup/login endpoints removed - only Google OAuth is supported

// Dev token endpoint - always available for testing
authRouter.post('/dev-token', async (req, res) => {
	const email = String(req.body?.email || '').trim();
	if (!email) return res.status(400).json({ error: 'email required' });
	
	try {
		// Generate consistent userId based on email hash for data persistence
		const consistentUserId = generateConsistentUserId(email);
		
		// Check if database is ready
		const { isDatabaseReady } = await import('../config/db');
		if (!isDatabaseReady()) {
			// Use consistent userId even when database is unavailable
			const mockToken = signJwt({ 
				userId: consistentUserId, 
				email: email
			});
			return res.json({ 
				token: mockToken,
				user: {
					id: consistentUserId,
					email: email,
					name: email.split('@')[0],
					gmailVerified: email.includes('@gmail.com')
				},
				message: 'Database unavailable - using consistent hash-based ID for development'
			});
		}

		// For OAuth users, don't require Gmail validation
		// For regular signup, Gmail validation is handled by the frontend
		let user = await UserModel.findOne({ email });
		if (!user) {
			user = await UserModel.create({ 
				_id: consistentUserId, // Use consistent ID
				email, 
				name: email.split('@')[0],
				gmailVerified: email.includes('@gmail.com') // Auto-verify Gmail addresses for dev tokens
			});
		}
		
		// Always use the consistent userId for the token, regardless of database state
		const token = signJwt({ userId: consistentUserId, email: user.email });
		res.json({ 
			token,
			user: {
				id: consistentUserId,
				email: user.email,
				name: user.name,
				gmailVerified: user.gmailVerified
			}
		});
	} catch (error) {
		console.error('Error in dev-token endpoint:', error);
		res.status(500).json({ 
			error: 'Database operation failed',
			message: 'Please check database connection'
		});
	}
});

// Google OAuth Gmail access endpoint (requires additional consent)
authRouter.get('/google/gmail', passport.authenticate('google', { 
	scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.send'],
	accessType: 'offline',
	prompt: 'consent'
}));

// Debug endpoint to check OAuth configuration
authRouter.get('/env-debug', (req, res) => {
	res.json({
		googleClientId: env.googleClientId ? 'Set' : 'Missing',
		hasClientSecret: !!env.googleClientSecret,
		callbackUrl: env.googleCallbackUrl,
		message: 'OAuth configuration status',
		env: process.env.NODE_ENV,
		port: env.port
	});
});

// Test endpoint to verify OAuth flow
authRouter.get('/test', (req, res) => {
	res.json({
		message: 'OAuth test endpoint working',
		timestamp: new Date().toISOString(),
		userAgent: req.get('User-Agent')
	});
});

// OAuth callback test endpoint (for debugging)
authRouter.get('/callback-test', (req, res) => {
	res.json({
		message: 'OAuth callback test endpoint',
		query: req.query,
		timestamp: new Date().toISOString(),
		hasCode: !!req.query.code,
		hasError: !!req.query.error,
		error: req.query.error,
		code: req.query.code ? 'present' : 'missing'
	});
});

// Google OAuth logout endpoint
authRouter.post('/google/logout', async (req, res) => {
	try {
		const { userId } = req.body;
		
		if (!userId) {
			return res.status(400).json({ error: 'User ID is required' });
		}
		
		// Find user and clear Google tokens
		const user = await UserModel.findById(userId);
		if (user) {
			user.gmailAccessToken = undefined;
			user.gmailRefreshToken = undefined;
			user.gmailVerified = false;
			await user.save();
		}
		
		res.json({ 
			message: 'Google OAuth logout successful',
			gmailVerified: false 
		});
	} catch (error) {
		console.error('Google logout error:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Google OAuth status endpoint
authRouter.get('/google/status', async (req, res) => {
	try {
		const { userId } = req.query;
		
		if (!userId) {
			return res.status(400).json({ error: 'User ID is required' });
		}
		
		const user = await UserModel.findById(userId).select('gmailVerified googleId email name');
		
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}
		
    res.json({
			googleConnected: Boolean(user.googleId),
			gmailVerified: user.gmailVerified || false,
			user: {
				id: user._id,
				email: user.email,
				name: user.name,
				googleId: user.googleId
			}
		});
	} catch (error) {
		console.error('Google status error:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Gmail validation requirements endpoint
authRouter.get('/gmail-requirements', (_req, res) => {
    const { gmailValidationService } = require('../services/gmailValidation');
    res.json({
        requirements: gmailValidationService.getValidationRequirements(),
        message: 'Gmail validation requirements for signup'
    });
});

// Gmail validation endpoint using OAuth flow
authRouter.post('/validate-gmail', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                error: 'Email is required',
                message: 'Please provide an email address to validate'
            });
        }

        // Check if it's a Gmail address
        const domain = email.split('@')[1]?.toLowerCase();
        if (domain !== 'gmail.com') {
            return res.status(400).json({
                error: 'Invalid domain',
                message: 'Only Gmail addresses can be validated',
                isValid: false,
                details: {
                    email,
                    domain,
                    isGmail: false
                }
            });
        }

        // For Gmail validation, we need to use OAuth
        // This endpoint provides information about how to validate
        const validationInfo = {
            email,
            domain,
            isGmail: true,
            validationMethod: 'oauth_required',
            message: 'To validate this Gmail address, please use Google OAuth authentication',
            oauthUrl: `${req.protocol}://${req.get('host')}/api/auth/google?redirect=${encodeURIComponent(req.query.redirect as string || '')}`,
            instructions: [
                'Click "Sign in with Google" to authenticate',
                'If authentication succeeds, the Gmail is valid',
                'If authentication fails, the Gmail may not exist or be accessible'
            ]
        };

        res.json({
            isValid: true, // Format is valid
            exists: 'unknown', // We can't determine existence without OAuth
            validationInfo,
            message: 'Gmail format is valid. Use OAuth for complete verification.'
        });

    } catch (error) {
        console.error('Gmail validation error:', error);
        res.status(500).json({
            error: 'Gmail validation failed',
            message: 'Unable to validate Gmail address. Please try again.'
        });
    }
});

// Dev debug: inspect loaded Google OAuth env values
authRouter.get('/env-debug', (_req, res) => {
    res.json({
        googleClientId: env.googleClientId,
        hasClientSecret: Boolean(env.googleClientSecret),
        callbackUrl: env.googleCallbackUrl,
    });
});
