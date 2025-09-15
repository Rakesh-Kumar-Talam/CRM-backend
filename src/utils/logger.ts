import winston from 'winston';

const logFormat = winston.format.combine(
	winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
	winston.format.errors({ stack: true }),
	winston.format.json()
);

const consoleFormat = winston.format.combine(
	winston.format.colorize(),
	winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
	winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
		let log = `${timestamp} [${level}]: ${message}`;
		if (stack) log += `\n${stack}`;
		if (Object.keys(meta).length > 0) log += `\n${JSON.stringify(meta, null, 2)}`;
		return log;
	})
);

export const logger = winston.createLogger({
	level: process.env.LOG_LEVEL || 'info',
	format: logFormat,
	transports: [
		new winston.transports.Console({
			format: consoleFormat
		}),
		...(process.env.NODE_ENV === 'production' ? [
			new winston.transports.File({ 
				filename: 'logs/error.log', 
				level: 'error',
				format: logFormat
			}),
			new winston.transports.File({ 
				filename: 'logs/combined.log',
				format: logFormat
			})
		] : [])
	],
});
