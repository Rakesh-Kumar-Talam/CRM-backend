/**
 * @openapi
 * /api/segments:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Create a segment with name and rules_json
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - rules_json
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the segment
 *                 example: "High Value Customers"
 *               rules_json:
 *                 type: object
 *                 description: Segment rules configuration
 *                 example: {"field": "spend", "operator": "greater_than", "value": 1000}
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: List all segments with customer counts
 *     responses:
 *       200:
 *         description: List of segments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       rules_json:
 *                         type: object
 *                       created_by:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       customer_ids:
 *                         type: array
 *                         items:
 *                           type: string
 *                       customer_count:
 *                         type: integer
 *                       last_populated_at:
 *                         type: string
 *                         format: date-time
 * /api/segments/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get segment by ID with customer count
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Segment ID
 *     responses:
 *       200:
 *         description: Segment details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 rules_json:
 *                   type: object
 *                 created_by:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 customer_ids:
 *                   type: array
 *                   items:
 *                     type: string
 *                 customer_count:
 *                   type: integer
 *                 last_populated_at:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Segment not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Segment not found"
 *   put:
 *     security:
 *       - bearerAuth: []
 *     summary: Update segment by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Segment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the segment
 *                 example: "Updated High Value Customers"
 *               rules_json:
 *                 type: object
 *                 description: Segment rules configuration
 *                 example: {"field": "spend", "operator": "greater_than", "value": 1500}
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     summary: Delete segment by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Segment ID
 * /api/segments/{id}/preview:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Preview audience count
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Segment ID
 * /api/segments/{id}/customers:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get customers in a segment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Segment ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *         description: Maximum number of customers to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Number of customers to skip
 *     responses:
 *       200:
 *         description: List of customers in the segment
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 customers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       spend:
 *                         type: number
 *                       visits:
 *                         type: number
 *                       last_active:
 *                         type: string
 *                         format: date-time
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     returned:
 *                       type: integer
 * /api/segments/{id}/customers/download:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Download customers in a segment as Excel file
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Segment ID
 *     responses:
 *       200:
 *         description: Excel file with customer data
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Segment not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Segment not found"
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { segmentCreateSchema } from '../schemas/segment';
import { createSegment, listSegments, getSegment, updateSegment, deleteSegment, previewSegment, getSegmentCustomers, downloadSegmentCustomers } from '../controllers/segments';

export const segmentsRouter = Router();

segmentsRouter.post('/', requireAuth, validateBody(segmentCreateSchema), createSegment);
segmentsRouter.get('/', requireAuth, listSegments);
segmentsRouter.get('/:id', requireAuth, getSegment);
segmentsRouter.put('/:id', requireAuth, updateSegment);
segmentsRouter.delete('/:id', requireAuth, deleteSegment);
segmentsRouter.get('/:id/preview', requireAuth, previewSegment);
segmentsRouter.get('/:id/customers', requireAuth, getSegmentCustomers);
segmentsRouter.get('/:id/customers/download', requireAuth, downloadSegmentCustomers);
