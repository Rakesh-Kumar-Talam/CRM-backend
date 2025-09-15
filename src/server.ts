import dotenv from 'dotenv';
import http from 'http';
import { app } from './app';
import { logger } from './utils/logger';
import { connectMongo } from './config/db';
import { MessageQueueService } from './services/messageQueueService';
import './workers/customers.worker';
import './workers/orders.worker';
import cors from "cors";

app.use(cors({
  origin: "https://crm-front-drks.onrender.com", // or restrict: "https://crm-frontend.onrender.com"
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));


dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

async function bootstrap() {
	try {
		await connectMongo();
		logger.info('Database connected.');
	} catch (err) {
		logger.error(`Startup DB error: ${(err as Error).message}`);
		logger.warn('Proceeding to start HTTP server without DB connection.');
	}

	// Initialize message queue service
	const messageQueue = MessageQueueService.getInstance();
	logger.info('Message queue service initialized');

	const server = http.createServer(app);
	server.listen(PORT, () => {
		logger.info(`Server listening on port ${PORT}`);
	});
}

bootstrap();

process.on('unhandledRejection', (reason) => {
	logger.error(`Unhandled Rejection: ${String(reason)}`);
});

process.on('uncaughtException', (err) => {
	logger.error(`Uncaught Exception: ${err.message}`);
	process.exit(1);
});
