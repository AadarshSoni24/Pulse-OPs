import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/config/database';

jest.mock('../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn()
    },
    workspace: {
      create: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn()
    },
    workspaceMember: {
      create: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn()
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: 'rt-1' }),
      findUnique: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn()
    },
    $transaction: jest.fn(async (callback) => await callback(prisma))
  }
}));

describe('Auth & Multi-tenant RBAC Suite', () => {
  const mockUserA = { id: 'usr-a', name: 'User A', email: 'usera@example.com', passwordHash: '$2b$10$abcdefghijklmnopqrstuv', createdAt: new Date() };
  const mockUserB = { id: 'usr-b', name: 'User B', email: 'userb@example.com', passwordHash: '$2b$10$abcdefghijklmnopqrstuv', createdAt: new Date() };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.refreshToken.create as jest.Mock).mockResolvedValue({ id: 'rt-1' });
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => await cb(prisma));
  });

  it('should register a user and auto-create default workspace', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(mockUserA);
    (prisma.workspace.create as jest.Mock).mockResolvedValue({ id: 'ws-a', name: "User A's Workspace", ownerId: 'usr-a' });
    (prisma.workspaceMember.create as jest.Mock).mockResolvedValue({ id: 'mem-a', workspaceId: 'ws-a', userId: 'usr-a', role: 'OWNER' });

    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'User A',
      email: 'usera@example.com',
      password: 'Password123!'
    });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('usera@example.com');
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.workspace.id).toBe('ws-a');
  });

  it('should reject registration with existing email', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserA);

    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Duplicate User',
      email: 'usera@example.com',
      password: 'Password123!'
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email address is already registered');
  });

  it('should enforce multi-tenant RBAC boundary (non-member cannot access workspace)', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserB);
    (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(null);

    const jwt = require('jsonwebtoken');
    const { env } = require('../src/config/environment');
    const userBToken = jwt.sign({ userId: 'usr-b', email: 'userb@example.com', name: 'User B' }, env.JWT_ACCESS_SECRET);

    const res = await request(app)
      .get('/api/v1/workspaces/ws-a')
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('You are not a member of this workspace');
  });

  it('should enforce RBAC role matrix (VIEWER role forbidden from creating monitors)', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserB);
    (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue({
      workspaceId: 'ws-a',
      userId: 'usr-b',
      role: 'VIEWER'
    });

    const jwt = require('jsonwebtoken');
    const { env } = require('../src/config/environment');
    const userBToken = jwt.sign({ userId: 'usr-b', email: 'userb@example.com', name: 'User B' }, env.JWT_ACCESS_SECRET);

    const res = await request(app)
      .post('/api/v1/workspaces/ws-a/monitors')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        name: 'Forbidden Monitor',
        url: 'https://example.com'
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden: Your role (VIEWER) does not have permission');
  });
});
