import express from 'express';
import cors from 'cors';
// import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { connectDatabase } from '@/config/database';
import { logger } from '@/config/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { notFoundHandler } from '@/middleware/notFoundHandler';

// Import routes
import authRouter from '@/routes/auth.routes';
import userRoutes from '@/routes/user.routes';
import walletRoutes from '@/routes/wallet.routes';
import claimRoutes from '@/routes/claim.routes';
import groupRoutes from '@/routes/group.routes';
import paymentRoutes from '@/routes/payment.routes';
import healthInsuranceSubscriptionRoutes from '@/routes/healthInsuranceSubscription.routes';

// Import models to register them with Mongoose
import '@/models/User';
import '@/models/Wallet';
import '@/models/Transaction';
import '@/models/GroupSavings';
import '@/models/SavingsPlan';
import '@/models/InsurancePlan';
// Note: You'll need to create these new model files:
// import '@/models/HealthInsuranceSubscription';
// import '@/models/InsuranceClaim';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_PREFIX = process.env.API_PREFIX || '/api';
const API_VERSION = process.env.API_VERSION || 'v1';


// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
// app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(limiter); // Rate limiting
app.use(cors({
  origin: ['https://ilera-pay-fe.vercel.app', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'InsureWise API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
// const apiRouter = express.Router();
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'InsureWise API',
      version: '1.0.0',
    },
  },
  apis: ['./src/routes/*.ts', './src/models/*.ts'], // adjust paths as needed
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(`${API_PREFIX}/${API_VERSION}/auth`, authRouter);
app.use(`${API_PREFIX}/${API_VERSION}/users`, userRoutes);
app.use(`${API_PREFIX}/${API_VERSION}/insurance-subscriptions`, healthInsuranceSubscriptionRoutes);
app.use(`${API_PREFIX}/${API_VERSION}/wallet`, walletRoutes);
app.use(`${API_PREFIX}/${API_VERSION}/claims`, claimRoutes);
app.use(`${API_PREFIX}/${API_VERSION}/group-savings`, groupRoutes); // Fixed: changed from /groups to /group-savings
app.use(`${API_PREFIX}/${API_VERSION}/payments`, paymentRoutes);


// app.use(`${API_PREFIX}/${API_VERSION}`, apiRouter);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Database connection and server startup
const startServer = async () => {
  try {
    await connectDatabase();
    logger.info('Database connected successfully');

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`API Base URL: http://localhost:${PORT}${API_PREFIX}/${API_VERSION}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();

export default app;
