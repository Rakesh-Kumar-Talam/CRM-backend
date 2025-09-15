import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { env } from '../config/env';
import { UserModel } from '../models/User';
import { generateConsistentUserId } from '../utils/userId';
import { logger } from '../utils/logger';

if (!env.googleClientId || !env.googleClientSecret) {
	logger.warn('Google OAuth is not configured (missing client id/secret). Auth endpoints will be unavailable.');
} else {
	passport.use(
		new GoogleStrategy(
			{
				clientID: env.googleClientId,
				clientSecret: env.googleClientSecret,
				callbackURL: env.googleCallbackUrl,
			},
			async (accessToken: string, refreshToken: string, profile: Profile, done) => {
				try {
					const email = profile.emails && profile.emails[0]?.value;
					if (!email) {
						logger.error('No email found in Google profile');
						return done(new Error('Email not available from Google'), undefined);
					}
					
					// Generate consistent userId based on email hash for data persistence
					const consistentUserId = generateConsistentUserId(email);
					
					// Check if database is ready
					const { isDatabaseReady } = await import('../config/db');
					if (!isDatabaseReady()) {
						// Return mock user for development when database is not available
						logger.warn(`Database unavailable - using consistent hash-based ID for Google OAuth: ${email}`);
						return done(null, { 
							id: consistentUserId, 
							email: email,
							name: profile.displayName || email.split('@')[0],
							googleId: profile.id,
							gmailVerified: profile.emails && profile.emails[0]?.verified || false,
							mock: true
						});
					}
					
					// Check if email is verified
					const isEmailVerified = profile.emails && profile.emails[0]?.verified;
					if (!isEmailVerified) {
						logger.warn(`Google email not verified for user: ${email}`);
					}
					
					// Look for existing user by email or Google ID
					let user = await UserModel.findOne({ 
						$or: [
							{ email },
							{ googleId: profile.id }
						]
					});
					
					if (!user) {
						// Create new user with consistent ID
						logger.info(`Creating new user for Google OAuth: ${email}`);
						user = await UserModel.create({
							_id: consistentUserId, // Use consistent ID
							email,
							name: profile.displayName || profile.name?.givenName + ' ' + profile.name?.familyName || email.split('@')[0],
							googleId: profile.id,
							gmailAccessToken: accessToken,
							gmailRefreshToken: refreshToken,
							gmailVerified: isEmailVerified || false,
							googleProfilePicture: profile.photos && profile.photos[0]?.value,
							lastGoogleLogin: new Date(),
						});
					} else {
						// Update existing user with new Google OAuth data
						logger.info(`Updating existing user with Google OAuth: ${email}`);
						
						// Update Google-specific fields
						user.googleId = profile.id;
						user.gmailAccessToken = accessToken;
						user.gmailRefreshToken = refreshToken;
						user.gmailVerified = isEmailVerified || false;
						user.lastGoogleLogin = new Date();
						
						// Update profile picture if available
						if (profile.photos && profile.photos[0]?.value) {
							user.googleProfilePicture = profile.photos[0].value;
						}
						
						// Update name if not set or if Google provides a better name
						if (!user.name || (profile.displayName && profile.displayName !== user.name)) {
							user.name = profile.displayName || user.name;
						}
						
						await user.save();
					}
					
					logger.info(`Google OAuth successful for user: ${email}`);
					return done(null, { 
						id: consistentUserId, // Use consistent ID
						email: user.email,
						name: user.name,
						googleId: user.googleId,
						gmailVerified: user.gmailVerified
					});
				} catch (err) {
					logger.error('Google OAuth error:', err);
					return done(err as Error, undefined);
				}
			}
		)
	);
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
	done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
	try {
		// Check if database is ready
		const { isDatabaseReady } = await import('../config/db');
		if (!isDatabaseReady()) {
			// Return mock user for development when database is not available
			logger.warn(`Database unavailable - using mock user for deserialization: ${id}`);
			done(null, { 
				id: id, 
				email: 'mock@example.com',
				name: 'Mock User',
				mock: true
			});
			return;
		}

		const user = await UserModel.findById(id);
		done(null, user);
	} catch (err) {
		logger.error('Deserialize user error:', err);
		done(err, null);
	}
});

export default passport;
