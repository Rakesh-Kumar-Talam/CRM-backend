/**
 * @openapi
 * /api/orders:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Ingest order (queued or direct)
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: List orders
 * /api/orders/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get order by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *   put:
 *     security:
 *       - bearerAuth: []
 *     summary: Update order by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customer_id: { type: string }
 *               amount: { type: number }
 *               items: 
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     sku: { type: string }
 *                     name: { type: string }
 *                     qty: { type: number }
 *                     price: { type: number }
 *               date: { type: string, format: date-time }
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     summary: Delete order by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { orderCreateSchema } from '../schemas/order';
import { ingestOrder, listOrders, getOrder, updateOrder, deleteOrder } from '../controllers/orders';

export const ordersRouter = Router();

ordersRouter.post('/', requireAuth, validateBody(orderCreateSchema), ingestOrder);
ordersRouter.get('/:id', requireAuth, getOrder);
ordersRouter.put('/:id', requireAuth, updateOrder);
ordersRouter.delete('/:id', requireAuth, deleteOrder);
ordersRouter.get('/', requireAuth, listOrders);
