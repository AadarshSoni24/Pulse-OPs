import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authenticateToken } from '../../middleware/authenticate';
import { checkWorkspaceRole } from '../../middleware/rbac';

const router = Router({ mergeParams: true });

router.use(authenticateToken);

/**
 * @openapi
 * /workspaces/{workspaceId}/monitors/{id}/analytics:
 *   get:
 *     summary: Get latency percentiles (P50/P95/P99), uptime %, MTTR, MTBF
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           default: 24
 *     responses:
 *       200:
 *         description: Latency metrics and reliability analytics
 */
router.get(
  '/:id/analytics',
  checkWorkspaceRole(['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER']),
  AnalyticsController.getMonitorAnalytics
);

export default router;
