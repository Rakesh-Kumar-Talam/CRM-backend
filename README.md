# Mini CRM Backend

A comprehensive CRM backend with customer management, segmentation, campaigns, and AI integration.

## Features

- 🔐 **Google OAuth 2.0 Authentication**
- 👥 **Customer Management** with data ingestion APIs
- 📦 **Order Processing** with pub-sub architecture
- 🎯 **Dynamic Audience Segmentation** with rule-based filtering
- 📧 **Campaign Management** with delivery tracking
- 🤖 **AI Integration** for natural language processing and message suggestions
- 📊 **Real-time Analytics** and delivery statistics
- 🔄 **Queue-based Processing** using BullMQ and Redis
- 📚 **Comprehensive API Documentation** with Swagger

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Queue**: BullMQ with Redis
- **Authentication**: Passport.js with Google OAuth
- **Validation**: Zod
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **Logging**: Winston

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB
- Redis (optional, for queue processing)

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd mini-crm-backend
npm install
```

2. **Configure environment:**
```bash
cp config.local.sample.json config.local.json
# Edit config.local.json with your settings
```

3. **Start the development server:**
```bash
npm run dev
```

4. **Access the API:**
- API Base URL: `http://localhost:4000`
- Health Check: `http://localhost:4000/health`
- API Documentation: `http://localhost:4000/docs`

## API Endpoints

### Authentication
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - OAuth callback
- `POST /api/auth/dev-token` - Development token (when OAuth not configured)

### Customer Management
- `POST /api/customers` - Create/ingest customer data
- `GET /api/customers` - List customers with pagination and filters

### Order Processing
- `POST /api/orders` - Create/ingest order data
- `GET /api/orders` - List orders

### Audience Segmentation
- `POST /api/segments` - Create audience segment with rules
- `GET /api/segments/:id/preview` - Preview audience count

### Campaign Management
- `POST /api/campaigns` - Create campaign with selected segment
- `GET /api/campaigns` - List campaigns with delivery stats
- `GET /api/campaigns/:id` - Get campaign details with delivery logs

### AI Integration
- `POST /api/ai/rules` - Convert natural language to segment rules
- `POST /api/ai/messages` - Generate message suggestions
- `POST /api/ai/summary` - Generate performance summaries

### Vendor Integration
- `POST /api/mock-send` - Mock vendor send endpoint
- `POST /api/delivery-receipt` - Delivery status callback

## Configuration

### Environment Variables
```json
{
  "NODE_ENV": "development",
  "PORT": "4000",
  "MONGO_URI": "mongodb://localhost:27017/mini_crm",
  "JWT_SECRET": "your-secret-key",
  "REDIS_URL": "redis://localhost:6379",
  "GOOGLE_CLIENT_ID": "your-google-client-id",
  "GOOGLE_CLIENT_SECRET": "your-google-client-secret",
  "GOOGLE_CALLBACK_URL": "http://localhost:4000/api/auth/google/callback"
}
```

## Database Schema

### Customers
```typescript
{
  name: string;
  email: string;
  phone?: string;
  spend?: number;
  visits?: number;
  last_active?: Date;
  created_at: Date;
}
```

### Orders
```typescript
{
  customer_id: ObjectId;
  amount: number;
  items: Array<{
    sku: string;
    name: string;
    qty: number;
    price: number;
  }>;
  date: Date;
}
```

### Segments
```typescript
{
  rules_json: RuleGroup;
  created_by: string;
  created_at: Date;
}
```

### Campaigns
```typescript
{
  segment_id: ObjectId;
  message: string;
  created_at: Date;
}
```

### Communication Logs
```typescript
{
  campaign_id: ObjectId;
  customer_id: ObjectId;
  status: 'SENT' | 'FAILED' | 'QUEUED';
  message: string;
  vendor_message_id?: string;
  sent_at?: Date;
  updated_at: Date;
}
```

## Segment Rules

The segmentation system supports complex rule-based filtering:

### Basic Rules
```json
{
  "field": "spend",
  "op": ">",
  "value": 1000
}
```

### Rule Groups
```json
{
  "and": [
    { "field": "spend", "op": ">", "value": 1000 },
    { "field": "visits", "op": "<", "value": 5 }
  ]
}
```

### Supported Fields
- `spend` - Customer total spend
- `visits` - Number of visits
- `inactive_days` - Days since last activity

### Supported Operators
- `>`, `>=`, `<`, `<=`, `==`, `!=`

## AI Features

### Natural Language to Rules
Convert natural language queries to segment rules:
```
Input: "Users inactive for 6 months and spent > ₹5K"
Output: {
  "and": [
    { "field": "inactive_days", "op": ">", "value": 180 },
    { "field": "spend", "op": ">", "value": 5000 }
  ]
}
```

### Message Suggestions
Generate campaign message templates based on goals:
```
Input: "win back inactive customers"
Output: [
  "Hi there! We miss you. win back inactive customers. Enjoy 15% off this week!",
  "It's been a while—win back inactive customers. Use code WELCOME10 for your next order.",
  "win back inactive customers. Special perk just for you: free shipping today only!"
]
```

## Queue Processing

The system uses BullMQ for asynchronous processing:

- **Customer Queue**: Processes customer data ingestion
- **Order Queue**: Processes order data ingestion
- **Workers**: Background workers process queued jobs

## Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Development

### Project Structure
```
src/
├── controllers/     # Route handlers
├── middleware/      # Express middleware
├── models/         # MongoDB models
├── routes/         # API routes
├── schemas/        # Validation schemas
├── services/       # Business logic
├── queues/         # Queue definitions
├── workers/        # Background workers
├── utils/          # Utility functions
└── tests/          # Test files
```

### Adding New Features

1. **Create Model**: Define MongoDB schema in `src/models/`
2. **Add Validation**: Create Zod schema in `src/schemas/`
3. **Implement Controller**: Add business logic in `src/controllers/`
4. **Define Routes**: Add API endpoints in `src/routes/`
5. **Add Tests**: Write tests in `src/tests/`

## Production Deployment

1. **Build the application:**
```bash
npm run build
```

2. **Start the production server:**
```bash
npm start
```

3. **Environment setup:**
- Set `NODE_ENV=production`
- Configure production MongoDB URI
- Set up Redis for queue processing
- Configure Google OAuth credentials

## API Documentation

Interactive API documentation is available at `/docs` when running the server. The documentation includes:

- Complete endpoint reference
- Request/response schemas
- Authentication requirements
- Example requests and responses

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the ISC License.
