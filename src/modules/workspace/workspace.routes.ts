import { Router } from 'express';
import { WorkspaceController } from './workspace.controller';
import { authenticateToken } from '../../middleware/authenticate';
import { checkWorkspaceRole } from '../../middleware/rbac';
import { validateRequest } from '../../middleware/validate';
import { CreateWorkspaceSchema, AddMemberSchema, UpdateRoleSchema } from './workspace.schema';

const router = Router();

router.use(authenticateToken);

/**
 * @openapi
 * /workspaces:
 *   post:
 *     summary: Create a new workspace
 *     tags: [Workspaces]
 *     security:
 *       - BearerAuth: []
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
 *     responses:
 *       201:
 *         description: Workspace created
 *   get:
 *     summary: List all workspaces current user belongs to
 *     tags: [Workspaces]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Workspaces list
 */
router.post('/', validateRequest(CreateWorkspaceSchema), WorkspaceController.createWorkspace);
router.get('/', WorkspaceController.getWorkspaces);

/**
 * @openapi
 * /workspaces/{id}:
 *   get:
 *     summary: Get workspace details and member list
 *     tags: [Workspaces]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace details
 */
router.get('/:id', checkWorkspaceRole(['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER']), WorkspaceController.getWorkspaceById);

/**
 * @openapi
 * /workspaces/{id}/members:
 *   post:
 *     summary: Add member to workspace
 *     tags: [Workspaces]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, role]
 *             properties:
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [OWNER, ADMIN, DEVELOPER, VIEWER]
 *     responses:
 *       201:
 *         description: Member added
 */
router.post(
  '/:id/members',
  checkWorkspaceRole(['OWNER', 'ADMIN']),
  validateRequest(AddMemberSchema),
  WorkspaceController.addMember
);

router.patch(
  '/:id/members/:userId',
  checkWorkspaceRole(['OWNER', 'ADMIN']),
  validateRequest(UpdateRoleSchema),
  WorkspaceController.updateMemberRole
);

router.delete(
  '/:id/members/:userId',
  checkWorkspaceRole(['OWNER', 'ADMIN']),
  WorkspaceController.removeMember
);

export default router;
