import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

const swaggerSpec = swaggerJsdoc({
	definition: {
		openapi: '3.0.0',
		info: { 
			title: 'Mini CRM API', 
			version: '1.0.0',
			description: `A comprehensive CRM backend with customer management, segmentation, campaigns, and AI integration.

## Getting Started

### Authentication
1. **Development Mode**: Use \`POST /api/auth/dev-token\` with an email to get a JWT token
2. **Production Mode**: Use Google OAuth via \`GET /api/auth/google\`

### Testing Your API Keys
- All endpoints require Bearer token authentication
- Include the JWT token in the Authorization header: \`Authorization: Bearer <your-token>\`
- Use the provided example data in the schemas for testing

### Common Testing Workflow
1. Get authentication token
2. Create customers
3. Create orders for customers
4. Create segments with rules
5. Create campaigns targeting segments
6. Use AI endpoints for rule generation and message suggestions

### Example cURL Commands
\`\`\`bash
# Get dev token
curl -X POST http://localhost:4000/api/auth/dev-token \\
  -H "Content-Type: application/json" \\
  -d '{"email": "test@example.com"}'

# Create customer (replace TOKEN with actual token)
curl -X POST http://localhost:4000/api/customers \\
  -H "Authorization: Bearer TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "John Doe", "email": "john@example.com", "spend": 1000}'
\`\`\``
		},
		servers: [{ url: 'http://localhost:4000' }],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT',
					description: 'JWT token obtained from /api/auth/dev-token or Google OAuth'
				},
			},
			parameters: {
				page: {
					name: 'page',
					in: 'query',
					description: 'Page number for pagination',
					required: false,
					schema: {
						type: 'integer',
						minimum: 1,
						default: 1
					}
				},
				limit: {
					name: 'limit',
					in: 'query',
					description: 'Number of items per page',
					required: false,
					schema: {
						type: 'integer',
						minimum: 1,
						maximum: 100,
						default: 10
					}
				},
				email: {
					name: 'email',
					in: 'query',
					description: 'Filter by customer email',
					required: false,
					schema: {
						type: 'string',
						format: 'email'
					}
				},
				segmentId: {
					name: 'id',
					in: 'path',
					description: 'Segment ID',
					required: true,
					schema: {
						type: 'string'
					}
				},
				campaignId: {
					name: 'id',
					in: 'path',
					description: 'Campaign ID',
					required: true,
					schema: {
						type: 'string'
					}
				},
				startDate: {
					name: 'start_date',
					in: 'query',
					description: 'Start date for filtering (ISO 8601 format)',
					required: false,
					schema: {
						type: 'string',
						format: 'date-time',
						example: '2024-01-01T00:00:00Z'
					}
				},
				endDate: {
					name: 'end_date',
					in: 'query',
					description: 'End date for filtering (ISO 8601 format)',
					required: false,
					schema: {
						type: 'string',
						format: 'date-time',
						example: '2024-12-31T23:59:59Z'
					}
				},
				status: {
					name: 'status',
					in: 'query',
					description: 'Filter by status',
					required: false,
					schema: {
						type: 'string',
						enum: ['SENT', 'FAILED', 'QUEUED'],
						example: 'SENT'
					}
				}
			},
			schemas: {
				Customer: {
					type: 'object',
					properties: {
						_id: { 
							type: 'string',
							example: '507f1f77bcf86cd799439011',
							description: 'MongoDB ObjectId'
						},
						name: { 
							type: 'string',
							example: 'John Doe',
							description: 'Customer full name'
						},
						email: { 
							type: 'string', 
							format: 'email',
							example: 'john.doe@example.com',
							description: 'Customer email address'
						},
						phone: { 
							type: 'string',
							example: '+1234567890',
							description: 'Customer phone number'
						},
						spend: { 
							type: 'number',
							example: 1250.50,
							description: 'Total amount spent by customer'
						},
						visits: { 
							type: 'integer',
							example: 15,
							description: 'Number of visits'
						},
						last_active: { 
							type: 'string', 
							format: 'date-time',
							example: '2024-01-15T10:30:00Z',
							description: 'Last activity timestamp'
						},
						created_at: { 
							type: 'string', 
							format: 'date-time',
							example: '2024-01-01T00:00:00Z',
							description: 'Customer creation timestamp'
						}
					},
					required: ['name', 'email']
				},
				Order: {
					type: 'object',
					properties: {
						_id: { 
							type: 'string',
							example: '507f1f77bcf86cd799439012',
							description: 'MongoDB ObjectId'
						},
						customer_id: { 
							type: 'string',
							example: '507f1f77bcf86cd799439011',
							description: 'Customer ID who placed the order'
						},
						amount: { 
							type: 'number',
							example: 299.99,
							description: 'Total order amount'
						},
						items: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									sku: { 
										type: 'string',
										example: 'PROD-001'
									},
									name: { 
										type: 'string',
										example: 'Premium Widget'
									},
									qty: { 
										type: 'integer',
										example: 2
									},
									price: { 
										type: 'number',
										example: 149.99
									}
								},
								required: ['sku', 'name', 'qty', 'price']
							}
						},
						date: { 
							type: 'string', 
							format: 'date-time',
							example: '2024-01-15T14:30:00Z',
							description: 'Order date and time'
						},
						created_at: { 
							type: 'string', 
							format: 'date-time',
							example: '2024-01-15T14:30:00Z',
							description: 'Order creation timestamp'
						}
					},
					required: ['customer_id', 'amount', 'date']
				},
				Segment: {
					type: 'object',
					properties: {
						_id: { 
							type: 'string',
							example: '507f1f77bcf86cd799439013',
							description: 'MongoDB ObjectId'
						},
						rules_json: { 
							type: 'object',
							example: {
								"and": [
									{ "field": "spend", "operator": ">=", "value": 1000 },
									{ "field": "visits", "operator": ">", "value": 5 }
								]
							},
							description: 'JSON object defining segment rules'
						},
						created_by: { 
							type: 'string',
							example: '507f1f77bcf86cd799439011',
							description: 'User ID who created the segment'
						},
						created_at: { 
							type: 'string', 
							format: 'date-time',
							example: '2024-01-15T10:00:00Z',
							description: 'Segment creation timestamp'
						}
					},
					required: ['rules_json', 'created_by']
				},
				Campaign: {
					type: 'object',
					properties: {
						_id: { 
							type: 'string',
							example: '507f1f77bcf86cd799439014',
							description: 'MongoDB ObjectId'
						},
						segment_id: { 
							type: 'string',
							example: '507f1f77bcf86cd799439013',
							description: 'Segment ID to target'
						},
						message: { 
							type: 'string',
							example: 'Special offer just for you! Get 20% off your next purchase.',
							description: 'Campaign message content'
						},
						created_at: { 
							type: 'string', 
							format: 'date-time',
							example: '2024-01-15T11:00:00Z',
							description: 'Campaign creation timestamp'
						}
					},
					required: ['segment_id', 'message']
				},
				CommunicationLog: {
					type: 'object',
					properties: {
						_id: { 
							type: 'string',
							example: '507f1f77bcf86cd799439015',
							description: 'MongoDB ObjectId'
						},
						campaign_id: { 
							type: 'string',
							example: '507f1f77bcf86cd799439014',
							description: 'Campaign ID'
						},
						customer_id: { 
							type: 'string',
							example: '507f1f77bcf86cd799439011',
							description: 'Customer ID'
						},
						status: { 
							type: 'string', 
							enum: ['SENT', 'FAILED', 'QUEUED'],
							example: 'SENT',
							description: 'Message delivery status'
						},
						message: { 
							type: 'string',
							example: 'Special offer just for you! Get 20% off your next purchase.',
							description: 'Message content sent to customer'
						},
						vendor_message_id: { 
							type: 'string',
							example: 'msg_123456789',
							description: 'External vendor message ID'
						},
						sent_at: { 
							type: 'string', 
							format: 'date-time',
							example: '2024-01-15T12:00:00Z',
							description: 'Message sent timestamp'
						},
						updated_at: { 
							type: 'string', 
							format: 'date-time',
							example: '2024-01-15T12:00:00Z',
							description: 'Last update timestamp'
						}
					},
					required: ['campaign_id', 'customer_id', 'status', 'message']
				},
				Error: {
					type: 'object',
					properties: {
						error: { type: 'string' },
						details: { type: 'object' }
					}
				},
				AuthToken: {
					type: 'object',
					properties: {
						token: { 
							type: 'string',
							description: 'JWT token for API authentication',
							example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
						}
					},
					required: ['token']
				},
				CustomerCreateRequest: {
					type: 'object',
					properties: {
						name: { 
							type: 'string',
							example: 'John Doe',
							description: 'Customer full name'
						},
						email: { 
							type: 'string', 
							format: 'email',
							example: 'john.doe@example.com',
							description: 'Customer email address'
						},
						phone: { 
							type: 'string',
							example: '+1234567890',
							description: 'Customer phone number'
						},
						spend: { 
							type: 'number',
							example: 1250.50,
							description: 'Total amount spent by customer'
						},
						visits: { 
							type: 'integer',
							example: 15,
							description: 'Number of visits'
						},
						last_active: { 
							type: 'string', 
							format: 'date-time',
							example: '2024-01-15T10:30:00Z',
							description: 'Last activity timestamp'
						}
					},
					required: ['name', 'email']
				},
				OrderCreateRequest: {
					type: 'object',
					properties: {
						customer_id: { 
							type: 'string',
							example: '507f1f77bcf86cd799439011',
							description: 'MongoDB ObjectId of the customer'
						},
						amount: { 
							type: 'number',
							example: 299.99,
							description: 'Total order amount'
						},
						items: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									sku: { 
										type: 'string',
										example: 'PROD-001'
									},
									name: { 
										type: 'string',
										example: 'Premium Widget'
									},
									qty: { 
										type: 'integer',
										example: 2
									},
									price: { 
										type: 'number',
										example: 149.99
									}
								},
								required: ['sku', 'name', 'qty', 'price']
							}
						},
						date: { 
							type: 'string', 
							format: 'date-time',
							example: '2024-01-15T14:30:00Z'
						}
					},
					required: ['customer_id', 'amount', 'date']
				},
				SegmentCreateRequest: {
					type: 'object',
					properties: {
						rules_json: { 
							type: 'object',
							example: {
								"and": [
									{ "field": "spend", "operator": ">=", "value": 1000 },
									{ "field": "visits", "operator": ">", "value": 5 }
								]
							},
							description: 'JSON object defining segment rules'
						},
						created_by: { 
							type: 'string',
							example: '507f1f77bcf86cd799439011',
							description: 'User ID who created the segment'
						}
					},
					required: ['rules_json', 'created_by']
				},
				CampaignCreateRequest: {
					type: 'object',
					properties: {
						segment_id: { 
							type: 'string',
							example: '507f1f77bcf86cd799439011',
							description: 'Segment ID to target'
						},
						message: { 
							type: 'string',
							example: 'Special offer just for you! Get 20% off your next purchase.',
							description: 'Campaign message content'
						}
					},
					required: ['segment_id', 'message']
				},
				AIRulesRequest: {
					type: 'object',
					properties: {
						input: { 
							type: 'string',
							example: 'Find customers who spent more than $500 and visited in the last 30 days',
							description: 'Natural language description of segment rules'
						}
					},
					required: ['input']
				},
				AIMessagesRequest: {
					type: 'object',
					properties: {
						goal: { 
							type: 'string',
							example: 'Promote new product launch to high-value customers',
							description: 'Campaign goal description'
						}
					},
					required: ['goal']
				},
				AISummaryRequest: {
					type: 'object',
					properties: {
						sent: { 
							type: 'integer',
							example: 150,
							description: 'Number of messages sent'
						},
						failed: { 
							type: 'integer',
							example: 5,
							description: 'Number of failed messages'
						}
					},
					required: ['sent', 'failed']
				},
				PaginatedResponse: {
					type: 'object',
					properties: {
						data: {
							type: 'array',
							items: { type: 'object' },
							description: 'Array of items'
						},
						pagination: {
							type: 'object',
							properties: {
								page: { type: 'integer', example: 1 },
								limit: { type: 'integer', example: 10 },
								total: { type: 'integer', example: 100 },
								pages: { type: 'integer', example: 10 }
							}
						}
					}
				},
				SuccessResponse: {
					type: 'object',
					properties: {
						success: { 
							type: 'boolean',
							example: true,
							description: 'Indicates if the operation was successful'
						},
						message: { 
							type: 'string',
							example: 'Operation completed successfully',
							description: 'Success message'
						},
						data: { 
							type: 'object',
							description: 'Response data'
						}
					}
				},
				ValidationError: {
					type: 'object',
					properties: {
						error: { 
							type: 'string',
							example: 'Validation failed',
							description: 'Error message'
						},
						details: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									field: { type: 'string', example: 'email' },
									message: { type: 'string', example: 'Email is required' }
								}
							}
						}
					}
				}
			}
		},
	},
	apis: ['src/routes/*.ts'],
});

export const docsRouter = Router();

docsRouter.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
