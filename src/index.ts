import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/environment';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';
import { swaggerSpec } from './docs/swagger';
import { globalRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './modules/auth/auth.routes';
import workspaceRoutes from './modules/workspace/workspace.routes';
import monitorRoutes from './modules/monitor/monitor.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import statusPageRoutes, { publicStatusRouter } from './modules/status-page/statusPage.routes';
import apiKeyRoutes from './modules/apikey/apikey.routes';
import auditRoutes from './modules/audit/audit.routes';
import metricsRoutes from './modules/metrics/metrics.routes';

const app = express();

// Security and Middleware Configuration
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
}

app.use(globalRateLimiter);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'PulseOps Backend API'
  });
});

// Swagger OpenAPI Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// REST API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1/workspaces/:workspaceId/monitors', monitorRoutes);
app.use('/api/v1/workspaces/:workspaceId/monitors', analyticsRoutes);
app.use('/api/v1/workspaces/:workspaceId/status-pages', statusPageRoutes);
app.use('/api/v1/workspaces/:workspaceId/api-keys', apiKeyRoutes);
app.use('/api/v1/workspaces/:workspaceId/audit-logs', auditRoutes);
app.use('/api/v1/status', publicStatusRouter);
app.use('/api/v1/metrics', metricsRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;

if (process.env.NODE_ENV !== 'test') {
  connectDatabase().then(() => {
    app.listen(env.PORT, () => {
      logger.info(`🚀 PulseOps Backend API running on port ${env.PORT}`);
      logger.info(`📚 Swagger OpenAPI documentation available at http://localhost:${env.PORT}/api-docs`);
    });
  });
}
