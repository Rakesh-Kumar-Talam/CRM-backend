import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import bodyParser from 'body-parser';
import { healthRouter } from './routes/health';
import { docsRouter } from './routes/docs';
import { apiRouter } from './routes/index';
import { errorHandler, notFoundHandler } from './middleware/error';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 200 }));

app.use('/health', healthRouter);
app.use('/docs', docsRouter);
app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
