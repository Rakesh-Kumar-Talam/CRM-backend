import { Router } from 'express';
import { checkMongoHealth, getMongoStatus } from '../config/db';
import { logger } from '../utils/logger';

export const healthRouter = Router();

// Basic health check
healthRouter.get('/', (_req, res) => {
	res.json({ 
		status: 'ok', 
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		memory: process.memoryUsage(),
		version: process.version
	});
});

// MongoDB Atlas health check
healthRouter.get('/mongodb', async (_req, res) => {
	try {
		const isHealthy = await checkMongoHealth();
		const status = getMongoStatus();
		
		if (isHealthy) {
			res.json({
				status: 'healthy',
				message: 'MongoDB Atlas connection is working properly',
				connectionState: status,
				timestamp: new Date().toISOString(),
				details: {
					readyState: status,
					host: process.env.MONGO_URI?.includes('mongodb+srv://') ? 'Atlas' : 'Unknown',
					healthy: true
				}
			});
		} else {
			res.status(503).json({
				status: 'unhealthy',
				message: 'MongoDB Atlas connection is not working',
				connectionState: status,
				timestamp: new Date().toISOString(),
				details: {
					readyState: status,
					healthy: false,
					error: 'Connection test failed'
				}
			});
		}
	} catch (error) {
		logger.error(`MongoDB health check error: ${(error as Error).message}`);
		res.status(503).json({
			status: 'error',
			message: 'MongoDB Atlas health check failed',
			error: (error as Error).message,
			timestamp: new Date().toISOString()
		});
	}
});

// Detailed system health check
healthRouter.get('/detailed', async (_req, res) => {
	try {
		const mongoHealthy = await checkMongoHealth();
		const mongoStatus = getMongoStatus();
		
		const healthData = {
			status: mongoHealthy ? 'healthy' : 'unhealthy',
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			services: {
				mongodb: {
					status: mongoHealthy ? 'healthy' : 'unhealthy',
					connectionState: mongoStatus,
					readyState: mongoStatus,
					details: mongoHealthy ? 'Connected to MongoDB Atlas' : 'Not connected to MongoDB Atlas'
				},
				server: {
					status: 'healthy',
					uptime: process.uptime(),
					memory: process.memoryUsage(),
					version: process.version,
					platform: process.platform
				}
			},
			environment: {
				nodeEnv: process.env.NODE_ENV || 'development',
				port: process.env.PORT || 4000,
				mongoConfigured: !!process.env.MONGO_URI
			}
		};
		
		const httpStatus = mongoHealthy ? 200 : 503;
		res.status(httpStatus).json(healthData);
		
	} catch (error) {
		logger.error(`Detailed health check error: ${(error as Error).message}`);
		res.status(500).json({
			status: 'error',
			message: 'Health check failed',
			error: (error as Error).message,
			timestamp: new Date().toISOString()
		});
	}
});
