/**
 * @openapi
 * /api/customers:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Ingest customer data (queued or direct)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               spend: { type: number }
 *               visits: { type: integer }
 *               last_active: { type: string, format: date-time }
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: List customers with pagination
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filter by email
 *       - in: query
 *         name: calculated_spend
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Use calculated spend from orders instead of stored spend
 * /api/customers/{id}:
 *   put:
 *     security:
 *       - bearerAuth: []
 *     summary: Update customer by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               spend: { type: number }
 *               visits: { type: integer }
 *               last_active: { type: string, format: date-time }
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     summary: Delete customer by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 * /api/customers/{id}/refresh-spend:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Refresh spend calculation for a specific customer
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer spend refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Customer spend updated successfully"
 *                 customer:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     spend:
 *                       type: number
 *                 totalSpend:
 *                   type: number
 *                   description: Calculated total spend from orders
 * /api/customers/refresh-spend:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Refresh spend calculation for all customers
 *     responses:
 *       200:
 *         description: All customers spend refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "All customers spend refreshed successfully"
 *                 updated:
 *                   type: integer
 *                   description: Number of customers updated
 *                 totalCustomers:
 *                   type: integer
 *                   description: Total number of customers
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       customerId:
 *                         type: string
 *                       name:
 *                         type: string
 *                       calculatedSpend:
 *                         type: number
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { customerCreateSchema } from '../schemas/customer';
import { 
	ingestCustomer, 
	listCustomers, 
	updateCustomer, 
	deleteCustomer, 
	refreshCustomerSpend, 
	refreshAllCustomersSpend 
} from '../controllers/customers';

export const customersRouter = Router();

customersRouter.post('/', requireAuth, validateBody(customerCreateSchema), ingestCustomer);
customersRouter.get('/', requireAuth, listCustomers);
customersRouter.put('/:id', requireAuth, validateBody(customerCreateSchema), updateCustomer);
customersRouter.delete('/:id', requireAuth, deleteCustomer);
customersRouter.post('/:id/refresh-spend', requireAuth, refreshCustomerSpend);
customersRouter.post('/refresh-spend', requireAuth, refreshAllCustomersSpend);
