import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

// Simple connection state management
let isConnected = false;

/**
 * Connect to MongoDB Atlas with simplified configuration
 * @returns Promise<typeof mongoose>
 */
export async function connectMongo(): Promise<typeof mongoose> {
	// Return existing connection if already connected
	if (isConnected && mongoose.connection.readyState === 1) {
		logger.info('✅ MongoDB already connected');
		return mongoose;
	}

	// Validate MongoDB URI
	const mongoUri = env.mongoUri;
	if (!mongoUri) {
		const error = new Error('MongoDB URI is not configured. Please set MONGO_URI in your environment variables.');
		logger.error(error.message);
		throw error;
	}

	if (!mongoUri.includes('mongodb+srv://')) {
		const error = new Error('MongoDB Atlas URI is required. Please use a mongodb+srv:// connection string.');
		logger.error(error.message);
		throw error;
	}

	logger.info('🚀 Attempting to connect to MongoDB Atlas...');
	logger.info(`🔗 Connection URI: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`);

	// Set up connection event handlers
	setupConnectionHandlers();

	// Simple connection options - no complex SSL/TLS configuration
	const connectionOptions: mongoose.ConnectOptions = {
		// Basic connection settings
		serverSelectionTimeoutMS: 5000,
		connectTimeoutMS: 5000,
		socketTimeoutMS: 10000,

		// Connection pooling
		maxPoolSize: 5,
		minPoolSize: 1,

		// Retry configuration
		retryWrites: true,
		retryReads: true,

		// Buffer configuration - enable buffering to prevent connection issues
		bufferCommands: true,

		// Simple SSL configuration
		ssl: true,
	};

	try {
		logger.info('🔧 Connecting to MongoDB Atlas...');

		// Connect to MongoDB
		await mongoose.connect(mongoUri, connectionOptions);

		// Verify connection
		await mongoose.connection.db?.admin().ping();
		
		isConnected = true;
		logger.info('✅ MongoDB Atlas connection established successfully');
		logger.info(`🏷️ Database: ${mongoose.connection.db?.databaseName || 'Unknown'}`);
		logger.info(`🌐 Host: ${mongoose.connection.host || 'Unknown'}`);

		return mongoose;

	} catch (error) {
		const err = error as Error;
		logger.error(`❌ MongoDB Atlas connection failed: ${err.message}`);

		// In development mode, continue without database
		if (process.env.NODE_ENV === 'development') {
			logger.warn('⚠️ Development mode: Continuing without MongoDB connection. Some features may not work.');
			return mongoose;
		} else {
			logger.error('🚨 Production environment: MongoDB connection is required. Exiting...');
			throw err;
		}
	}
}

/**
 * Set up MongoDB connection event handlers
 */
function setupConnectionHandlers(): void {
	// Connection established
	mongoose.connection.on('connected', () => {
		logger.info('✅ MongoDB Atlas connected successfully');
		isConnected = true;
	});

	// Connection error
	mongoose.connection.on('error', (err) => {
		logger.error(`❌ MongoDB connection error: ${err.message}`);
		isConnected = false;
	});

	// Connection disconnected
	mongoose.connection.on('disconnected', () => {
		logger.warn('⚠️ MongoDB disconnected');
		isConnected = false;
	});

	// Connection reconnected
	mongoose.connection.on('reconnected', () => {
		logger.info('🔄 MongoDB reconnected');
		isConnected = true;
	});

	// Graceful shutdown handlers
	setupGracefulShutdown();
}

/**
 * Set up graceful shutdown handlers
 */
function setupGracefulShutdown(): void {
	// SIGINT handler (Ctrl+C)
	process.on('SIGINT', async () => {
		logger.info('🛑 Received SIGINT, closing MongoDB connection...');
		await mongoose.connection.close();
		logger.info('✅ MongoDB connection closed through app termination');
		process.exit(0);
	});

	// SIGTERM handler
	process.on('SIGTERM', async () => {
		logger.info('🛑 Received SIGTERM, closing MongoDB connection...');
		await mongoose.connection.close();
		logger.info('✅ MongoDB connection closed through app termination');
		process.exit(0);
	});
}

/**
 * Check MongoDB connection health
 * @returns Promise<boolean>
 */
export async function checkMongoHealth(): Promise<boolean> {
	try {
		if (!mongoose.connection.db) {
			logger.warn('⚠️ MongoDB connection not established');
			return false;
		}

		await mongoose.connection.db.admin().ping();
		logger.info('✅ MongoDB health check passed');
		return true;
	} catch (error) {
		logger.error(`❌ MongoDB health check failed: ${(error as Error).message}`);
		return false;
	}
}

/**
 * Get MongoDB connection status
 * @returns string
 */
export function getMongoStatus(): string {
	const states = {
		0: 'disconnected',
		1: 'connected',
		2: 'connecting',
		3: 'disconnecting'
	};
	return states[mongoose.connection.readyState as keyof typeof states] || 'unknown';
}

/**
 * Get MongoDB connection details
 * @returns object
 */
export function getMongoConnectionInfo(): {
	status: string;
	host?: string;
	port?: number;
	database?: string;
	readyState: number;
	isConnected: boolean;
} {
	return {
		status: getMongoStatus(),
		host: mongoose.connection.host,
		port: mongoose.connection.port,
		database: mongoose.connection.db?.databaseName,
		readyState: mongoose.connection.readyState,
		isConnected
	};
}

/**
 * Check if database is ready for operations
 * @returns boolean
 */
export function isDatabaseReady(): boolean {
	return isConnected && mongoose.connection.readyState === 1;
}

/**
 * Wait for database to be ready (with timeout)
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 * @returns Promise<boolean>
 */
export async function waitForDatabase(timeoutMs: number = 5000): Promise<boolean> {
	if (isDatabaseReady()) {
		return true;
	}

	return new Promise((resolve) => {
		const startTime = Date.now();
		
		const checkConnection = () => {
			if (isDatabaseReady()) {
				resolve(true);
				return;
			}
			
			if (Date.now() - startTime > timeoutMs) {
				logger.warn('⚠️ Database connection timeout - operations may fail');
				resolve(false);
				return;
			}
			
			setTimeout(checkConnection, 100);
		};
		
		checkConnection();
	});
}

/**
 * Close MongoDB connection gracefully
 * @returns Promise<void>
 */
export async function closeMongoConnection(): Promise<void> {
	try {
		if (mongoose.connection.readyState !== 0) {
			await mongoose.connection.close();
			isConnected = false;
			logger.info('✅ MongoDB connection closed gracefully');
		}
	} catch (error) {
		logger.error(`❌ Error closing MongoDB connection: ${(error as Error).message}`);
	}
}