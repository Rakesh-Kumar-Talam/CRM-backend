import IORedis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export let redis: IORedis | undefined;

// Initialize Redis connection
function initializeRedis(): IORedis | undefined {
	if (!env.redisEnabled) {
		logger.warn('Redis disabled by config; queues will not run.');
		return undefined;
	}

	try {
		// Use cloud Redis if available, otherwise fallback to local
		const redisUrl = env.redisCloudUrl || env.redisUrl;
		logger.info(`Connecting to Redis: ${redisUrl.includes('cloud') ? 'Cloud Redis' : 'Local Redis'}`);
		
		const redisClient = new IORedis(redisUrl, {
			maxRetriesPerRequest: null, // Required for BullMQ
			enableReadyCheck: true, // Enable ready check
			connectTimeout: 10000, // 10 seconds connection timeout
			lazyConnect: true, // Don't connect immediately
			// Additional options for better reliability
			family: 4, // Use IPv4
			keepAlive: 30000, // 30 seconds keep alive
			noDelay: true
		});

		// Event handlers
		redisClient.on('connect', () => {
			logger.info('Redis connected successfully');
		});

		redisClient.on('ready', () => {
			logger.info('Redis is ready to accept commands');
		});

		redisClient.on('error', (err) => {
			logger.error(`Redis connection error: ${err.message}`);
			// Don't throw, just log the error
		});

		redisClient.on('close', () => {
			logger.warn('Redis connection closed');
		});

		redisClient.on('reconnecting', () => {
			logger.info('Redis reconnecting...');
		});

		// Connect with timeout
		redisClient.connect().catch((err) => {
			logger.error(`Redis connection failed: ${err.message}`);
			logger.warn('Redis not available, queues will be disabled');
		});

		return redisClient;
	} catch (err) {
		logger.error(`Redis initialization failed: ${(err as Error).message}`);
		logger.warn('Redis not available, queues disabled.');
		return undefined;
	}
}

// Initialize Redis
redis = initializeRedis();
