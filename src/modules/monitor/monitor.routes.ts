import { Router } from 'express';
import { MonitorController } from './monitor.controller';
import { authenticateToken } from '../../middleware/authenticate';
import { checkWorkspaceRole } from '../../middleware/rbac';
import { validateRequest } from '../../middleware/validate';
import { CreateMonitorSchema, UpdateMonitorSchema } from './monitor.schema';

const router = Router({ mergeParams: true });

router.use(authenticateToken);

/**
 * @openapi
 * /workspaces/{workspaceId}/monitors:
 *   post:
 *     summary: Create a new API monitor
 *     tags: [Monitors]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, url]
 *             properties:
 *               name:
 *                 type: string
 *               url:
 *                 type: string
 *               method:
 *                 type: string
 *                 default: GET
 *               interval:
 *                 type: integer
 *                 default: 60
 *               timeout:
 *                 type: integer
 *                 default: 5000
 *               expectedStatus:
 *                 type: integer
 *                 default: 200
 *     responses:
 *       201:
 *         description: Monitor created
 *       400:
 *         description: Invalid input or SSRF blocked URL
 *   get:
 *     summary: List all monitors in workspace
 *     tags: [Monitors]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of workspace monitors
 */
router.post(
  '/',
  checkWorkspaceRole(['OWNER', 'ADMIN', 'DEVELOPER']),
  validateRequest(CreateMonitorSchema),
  MonitorController.createMonitor
);

router.get(
  '/',
  checkWorkspaceRole(['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER']),
  MonitorController.getMonitors
);

/**
 * @openapi
 * /workspaces/{workspaceId}/monitors/{id}:
 *   get:
 *     summary: Get single monitor details, history, and incidents
 *     tags: [Monitors]
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
 *     responses:
 *       200:
 *         description: Monitor details
 */
router.get(
  '/:id',
  checkWorkspaceRole(['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER']),
  MonitorController.getMonitorById
);

router.put(
  '/:id',
  checkWorkspaceRole(['OWNER', 'ADMIN', 'DEVELOPER']),
  validateRequest(UpdateMonitorSchema),
  MonitorController.updateMonitor
);

router.delete(
  '/:id',
  checkWorkspaceRole(['OWNER', 'ADMIN', 'DEVELOPER']),
  MonitorController.deleteMonitor
);

router.patch(
  '/:id/toggle',
  checkWorkspaceRole(['OWNER', 'ADMIN', 'DEVELOPER']),
  MonitorController.toggleMonitor
);

export default router;
