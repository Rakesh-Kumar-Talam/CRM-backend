import fs from 'fs';
import path from 'path';

function loadLocalConfig(): Partial<Record<string, string>> {
	try {
		const root = process.cwd();
		const filePath = path.join(root, 'config.local.json');
		if (fs.existsSync(filePath)) {
			const raw = fs.readFileSync(filePath, 'utf-8');
			const parsed = JSON.parse(raw) as Record<string, string>;
			return parsed;
		}
		return {};
	} catch {
		return {};
	}
}

const local = loadLocalConfig();

export const env = {
	nodeEnv: process.env.NODE_ENV || local.NODE_ENV || 'development',
	port: process.env.PORT ? parseInt(process.env.PORT, 10) : (local.PORT ? parseInt(local.PORT, 10) : 4000),
	
	// MongoDB Atlas configuration (required)
	mongoUri: process.env.MONGO_URI || local.MONGO_URI || 'mongodb+srv://rakesh22bce7907_db_user:Ab14fi0jGvjS2wJp@crm.vtif66a.mongodb.net/?retryWrites=true&w=majority&appName=CRM',
	
	// JWT configuration
	jwtSecret: process.env.JWT_SECRET || local.JWT_SECRET || 'dev-secret-change',
	
	// Google OAuth configuration
	googleClientId: process.env.GOOGLE_CLIENT_ID || local.GOOGLE_CLIENT_ID || '',
	googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || local.GOOGLE_CLIENT_SECRET || '',
	googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || local.GOOGLE_CALLBACK_URL || 'https://cr-m-back.onrender.com/api/auth/google/callback',
	
	// Frontend URLs
	frontendUrl: process.env.FRONTEND_URL || local.FRONTEND_URL || 'https://crm-front-drks.onrender.com',
	frontendDashboardUrl: process.env.FRONTEND_DASHBOARD_URL || local.FRONTEND_DASHBOARD_URL || 'https://crm-front-drks.onrender.com/dashboard',
	frontendAuthCallbackUrl: process.env.FRONTEND_AUTH_CALLBACK_URL || local.FRONTEND_AUTH_CALLBACK_URL || 'https://crm-front-drks.onrender.com/auth/callback',
	
	// Redis configuration
	redisUrl: process.env.REDIS_URL || local.REDIS_URL || 'redis://127.0.0.1:6379',
	redisEnabled: (process.env.REDIS_ENABLED || local.REDIS_ENABLED || '0') === '1',
	redisCloudUrl: process.env.REDIS_CLOUD_URL || local.REDIS_CLOUD_URL || '',
	
	// MongoDB Atlas specific settings
	mongoMaxRetries: parseInt(process.env.MONGO_MAX_RETRIES || local.MONGO_MAX_RETRIES || '5', 10),
	mongoRetryDelay: parseInt(process.env.MONGO_RETRY_DELAY || local.MONGO_RETRY_DELAY || '2000', 10),
	mongoConnectionTimeout: parseInt(process.env.MONGO_CONNECTION_TIMEOUT || local.MONGO_CONNECTION_TIMEOUT || '30000', 10),
};
