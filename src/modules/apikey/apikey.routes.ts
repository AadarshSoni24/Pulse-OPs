import { Router } from 'express';
import { ApiKeyController } from './apikey.controller';
import { authenticateToken } from '../../middleware/authenticate';
import { checkWorkspaceRole } from '../../middleware/rbac';
import { validateRequest } from '../../middleware/validate';
import { CreateApiKeySchema } from './apikey.schema';

const router = Router({ mergeParams: true });

router.use(authenticateToken);

/**
 * @openapi
 * /workspaces/{workspaceId}/api-keys:
 *   post:
 *     summary: Generate a new API Key for workspace
 *     tags: [API Keys]
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
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               expiresInDays:
 *                 type: integer
 *     responses:
 *       201:
 *         description: API Key created (returns secret key once)
 *   get:
 *     summary: List API keys in workspace
 *     tags: [API Keys]
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
 *         description: API key list
 */
router.post(
  '/',
  checkWorkspaceRole(['OWNER', 'ADMIN']),
  validateRequest(CreateApiKeySchema),
  ApiKeyController.createApiKey
);

router.get(
  '/',
  checkWorkspaceRole(['OWNER', 'ADMIN']),
  ApiKeyController.getApiKeys
);

router.delete(
  '/:id',
  checkWorkspaceRole(['OWNER', 'ADMIN']),
  ApiKeyController.revokeApiKey
);

export default router;
