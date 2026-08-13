import { Router } from 'express';
import { MetricsController } from './metrics.controller';

const router = Router();

/**
 * @openapi
 * /metrics:
 *   get:
 *     summary: System observability & BullMQ queue telemetry
 *     tags: [Observability]
 *     responses:
 *       200:
 *         description: Real-time telemetry metrics
 */
router.get('/', MetricsController.getSystemMetrics);

export default router;
