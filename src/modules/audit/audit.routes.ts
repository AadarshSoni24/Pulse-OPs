import { Router } from 'express';
import { AuditController } from './audit.controller';
import { authenticateToken } from '../../middleware/authenticate';
import { checkWorkspaceRole } from '../../middleware/rbac';

const router = Router({ mergeParams: true });

router.use(authenticateToken);

/**
 * @openapi
 * /workspaces/{workspaceId}/audit-logs:
 *   get:
 *     summary: View paginated security audit log of workspace actions
 *     tags: [Audit Logs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Paginated workspace audit log records
 */
router.get(
  '/',
  checkWorkspaceRole(['OWNER', 'ADMIN']),
  AuditController.getWorkspaceAuditLogs
);

export default router;
