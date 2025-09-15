import { Queue } from 'bullmq';
import { redis } from './connection';
import { logger } from '../utils/logger';

export const customersQueue = redis ? new Queue('customers', { connection: redis }) : undefined;

export async function enqueueCustomer(payload: Record<string, unknown>, userId?: string) {
	if (!customersQueue) {
		logger.warn('customersQueue disabled; skipping enqueue');
		return false;
	}
	const dataWithUserId = { ...payload, userId };
	await customersQueue.add('create', dataWithUserId, { removeOnComplete: true, attempts: 3 });
	return true;
}
