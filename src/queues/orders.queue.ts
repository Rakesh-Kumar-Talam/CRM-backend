import { Queue } from 'bullmq';
import { redis } from './connection';
import { logger } from '../utils/logger';

export const ordersQueue = redis ? new Queue('orders', { connection: redis }) : undefined;

export async function enqueueOrder(payload: Record<string, unknown>, userId?: string) {
	if (!ordersQueue) {
		logger.warn('ordersQueue disabled; skipping enqueue');
		return false;
	}
	const dataWithUserId = { ...payload, userId };
	await ordersQueue.add('create', dataWithUserId, { removeOnComplete: true, attempts: 3 });
	return true;
}
