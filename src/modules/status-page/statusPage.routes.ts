import { Router } from 'express';
import { StatusPageController } from './statusPage.controller';
import { authenticateToken } from '../../middleware/authenticate';
import { checkWorkspaceRole } from '../../middleware/rbac';
import { validateRequest } from '../../middleware/validate';
import { CreateStatusPageSchema } from './statusPage.schema';

const workspaceRouter = Router({ mergeParams: true });

workspaceRouter.use(authenticateToken);

/**
 * @openapi
 * /workspaces/{workspaceId}/status-pages:
 *   post:
 *     summary: Create public status page
 *     tags: [Status Pages]
 *     security:
 *       - BearerAuth: []
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
 *             required: [name, slug, monitorIds]
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               monitorIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Status page created
 *   get:
 *     summary: List status pages in workspace
 *     tags: [Status Pages]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of workspace status pages
 */
workspaceRouter.post(
  '/',
  checkWorkspaceRole(['OWNER', 'ADMIN']),
  validateRequest(CreateStatusPageSchema),
  StatusPageController.createStatusPage
);

workspaceRouter.get(
  '/',
  checkWorkspaceRole(['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER']),
  StatusPageController.getWorkspaceStatusPages
);

export const publicStatusRouter = Router();

/**
 * @openapi
 * /status/{slug}:
 *   get:
 *     summary: Unauthenticated public status page view
 *     tags: [Status Pages]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Real-time public status page details
 *       404:
 *         description: Status page not found or private
 */
publicStatusRouter.get('/:slug', StatusPageController.getPublicStatusPage);

export default workspaceRouter;
