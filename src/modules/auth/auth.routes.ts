import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../middleware/validate';
import { RegisterSchema, LoginSchema, RefreshTokenSchema } from './auth.schema';
import { authRateLimiter } from '../../middleware/rateLimiter';
import { authenticateToken } from '../../middleware/authenticate';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user and create default workspace
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object;
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Account created successfully
 *       400:
 *         description: Validation error or duplicate email
 */
router.post('/register', authRateLimiter, validateRequest(RegisterSchema), AuthController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Authenticate user credentials and return JWT tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authRateLimiter, validateRequest(LoginSchema), AuthController.login);

/**
 * @openapi
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token using refresh token rotation
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tokens refreshed
 *       401:
 *         description: Invalid or revoked refresh token
 */
router.post('/refresh-token', validateRequest(RefreshTokenSchema), AuthController.refreshToken);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Revoke refresh token and logout user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post('/logout', validateRequest(RefreshTokenSchema), AuthController.logout);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get currently authenticated user profile & memberships
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile details
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticateToken, AuthController.getMe);

export default router;
