import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/config/database';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/environment';

jest.mock('../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn()
    },
    workspaceMember: {
      findUnique: jest.fn()
    },
    monitor: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({})
    }
  }
}));

describe('Monitor Management CRUD Suite', () => {
  const mockUser = { id: 'usr-1', name: 'Tester', email: 'tester@example.com' };
  const mockWorkspaceId = 'ws-100';
  const mockMonitorId = 'mon-200';
  let token: string;

  beforeAll(() => {
    token = jwt.sign({ userId: mockUser.id, email: mockUser.email, name: mockUser.name }, env.JWT_ACCESS_SECRET);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue({
      workspaceId: mockWorkspaceId,
      userId: mockUser.id,
      role: 'OWNER'
    });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  it('should create valid monitor and perform SSRF check', async () => {
    (prisma.monitor.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.monitor.create as jest.Mock).mockResolvedValue({
      id: mockMonitorId,
      workspaceId: mockWorkspaceId,
      name: 'Public API Health',
      url: 'https://example.com/status',
      method: 'GET',
      interval: 60,
      timeout: 5000,
      expectedStatus: 200,
      isActive: true
    });

    const res = await request(app)
      .post(`/api/v1/workspaces/${mockWorkspaceId}/monitors`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Public API Health',
        url: 'https://example.com/status',
        method: 'GET',
        interval: 60,
        timeout: 5000,
        expectedStatus: 200
      });

    expect(res.status).toBe(201);
    expect(res.body.monitor.id).toBe(mockMonitorId);
    expect(res.body.monitor.name).toBe('Public API Health');
  });

  it('should reject creating duplicate monitor URL in same workspace', async () => {
    (prisma.monitor.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-mon' });

    const res = await request(app)
      .post(`/api/v1/workspaces/${mockWorkspaceId}/monitors`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Duplicate Health',
        url: 'https://example.com/status'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('already exists in this workspace');
  });

  it('should reject monitor creation targeting SSRF private IP', async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${mockWorkspaceId}/monitors`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'SSRF Attack Target',
        url: 'http://169.254.169.254/metadata'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Security Error (SSRF Guard)');
  });

  it('should toggle monitor active state', async () => {
    (prisma.monitor.findFirst as jest.Mock).mockResolvedValue({
      id: mockMonitorId,
      workspaceId: mockWorkspaceId,
      isActive: true
    });
    (prisma.monitor.update as jest.Mock).mockResolvedValue({
      id: mockMonitorId,
      isActive: false
    });

    const toggleRes = await request(app)
      .patch(`/api/v1/workspaces/${mockWorkspaceId}/monitors/${mockMonitorId}/toggle`)
      .set('Authorization', `Bearer ${token}`);

    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.monitor.isActive).toBe(false);
  });
});
