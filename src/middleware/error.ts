import { NextFunction, Request, Response } from 'express';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';

export function notFoundHandler(_req: Request, res: Response) {
	logger.warn(`Route not found: ${_req.method} ${_req.path}`);
	res.status(StatusCodes.NOT_FOUND).json({
		error: 'Not Found',
		message: 'Route does not exist',
	});
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
	let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
	let message = 'Internal Server Error';
	let details: any = undefined;

	if (err instanceof ZodError) {
		statusCode = StatusCodes.BAD_REQUEST;
		message = 'Validation Error';
		details = err.flatten();
		logger.warn(`Validation error on ${req.method} ${req.path}:`, details);
	} else if (err instanceof Error) {
		message = err.message;
		
		// Handle specific error types
		if (err.name === 'ValidationError') {
			statusCode = StatusCodes.BAD_REQUEST;
		} else if (err.name === 'CastError') {
			statusCode = StatusCodes.BAD_REQUEST;
			message = 'Invalid ID format';
		} else if (err.name === 'MongoError' && (err as any).code === 11000) {
			statusCode = StatusCodes.CONFLICT;
			message = 'Duplicate entry';
		}
		
		logger.error(`Error on ${req.method} ${req.path}:`, {
			message: err.message,
			stack: err.stack,
			url: req.url,
			method: req.method,
			ip: req.ip,
			userAgent: req.get('User-Agent')
		});
	} else {
		logger.error(`Unknown error on ${req.method} ${req.path}:`, err);
	}

	res.status(statusCode).json({
		error: getReasonPhrase(statusCode),
		message,
		...(details && { details }),
		...(process.env.NODE_ENV === 'development' && err instanceof Error && { stack: err.stack })
	});
}
