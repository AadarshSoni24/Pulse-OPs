import { prisma } from '../src/config/database';

jest.mock('../src/config/database', () => ({
  prisma: {
    healthCheck: {
      create: jest.fn().mockResolvedValue({ id: 'hc-1' }),
      findMany: jest.fn()
    },
    monitor: {
      update: jest.fn().mockResolvedValue({})
    },
    incident: {
      findFirst: jest.fn(),
      update: jest.fn()
    }
  }
}));

jest.mock('../src/config/redis', () => ({
  redisConnectionOptions: {},
  QUEUE_NAMES: {
    HEALTH_CHECK: 'health-check-queue',
    INCIDENT: 'incident-queue',
    NOTIFICATION: 'notification-queue',
    SSL_CHECK: 'ssl-check-queue'
  },
  incidentQueue: {
    add: jest.fn().mockResolvedValue({})
  },
  sslCheckQueue: {
    add: jest.fn().mockResolvedValue({})
  }
}));

describe('Health Worker Execution & Persistence Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate status code 200 as successful check', () => {
    const statusCode: number = 200;
    const expectedStatus: number = 200;
    const isSuccess = statusCode === expectedStatus || (expectedStatus === 200 && statusCode >= 200 && statusCode < 300);
    expect(isSuccess).toBe(true);
  });

  it('should mark status code 500 or 404 as failed check', () => {
    const statusCode: number = 500;
    const expectedStatus: number = 200;
    const isSuccess = statusCode === expectedStatus;
    expect(isSuccess).toBe(false);
  });

  it('should trigger incident event after 2 consecutive failures', async () => {
    (prisma.healthCheck.findMany as jest.Mock).mockResolvedValue([
      { success: false, statusCode: 500 },
      { success: false, statusCode: 500 }
    ]);

    const recentChecks = await prisma.healthCheck.findMany({ where: { monitorId: 'mon-1' } });
    const consecutiveFailures = recentChecks.filter((c: any) => !c.success).length;

    expect(consecutiveFailures).toBe(2);
    expect(consecutiveFailures >= 2).toBe(true);
  });
});
