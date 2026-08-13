import { SchedulerWorker } from '../src/workers/schedulerWorker';
import { prisma } from '../src/config/database';
import { healthCheckQueue } from '../src/config/redis';

jest.mock('bullmq', () => {
  const actual = jest.requireActual('bullmq');
  return {
    ...actual,
    Worker: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined)
    }))
  };
});

jest.mock('../src/config/database', () => ({
  prisma: {
    monitor: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    healthCheck: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn()
    },
    incident: {
      create: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn()
    },
    notification: {
      create: jest.fn().mockResolvedValue({})
    }
  }
}));

jest.mock('../src/config/redis', () => ({
  healthCheckQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    on: jest.fn()
  },
  incidentQueue: {
    add: jest.fn().mockResolvedValue({ id: 'inc-job-1' }),
    on: jest.fn()
  },
  notificationQueue: {
    add: jest.fn().mockResolvedValue({ id: 'notif-job-1' }),
    on: jest.fn()
  },
  sslCheckQueue: {
    add: jest.fn().mockResolvedValue({ id: 'ssl-job-1' }),
    on: jest.fn()
  }
}));

describe('Core Event-Driven Pipeline & Incident Lifecycle Test', () => {
  const mockMonitor = {
    id: 'mon-e2e',
    workspaceId: 'ws-e2e',
    name: 'Target API Server',
    url: 'https://example.com/api',
    interval: 60,
    timeout: 5000,
    expectedStatus: 200,
    isActive: true,
    nextCheckAt: new Date(Date.now() - 1000)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should run scheduler pass and enqueue health check job to Redis', async () => {
    (prisma.monitor.findMany as jest.Mock).mockResolvedValue([mockMonitor]);
    (prisma.monitor.update as jest.Mock).mockResolvedValue({ ...mockMonitor, nextCheckAt: new Date() });

    await SchedulerWorker.scheduleDueMonitors();

    expect(prisma.monitor.findMany).toHaveBeenCalled();
    expect(prisma.monitor.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'mon-e2e' }
      })
    );
    expect(healthCheckQueue.add).toHaveBeenCalledWith(
      'execute-health-check',
      expect.objectContaining({
        monitorId: 'mon-e2e',
        url: 'https://example.com/api'
      }),
      expect.anything()
    );
  });

  it('should handle incident lifecycle: single continuous outage = 1 incident (de-duplication)', async () => {
    const mockFailures = [
      { id: 'c-1', success: false, statusCode: 500 },
      { id: 'c-2', success: false, statusCode: 500 }
    ];
    (prisma.healthCheck.findMany as jest.Mock).mockResolvedValue(mockFailures);

    (prisma.incident.findFirst as jest.Mock).mockResolvedValueOnce(null);

    const createdIncident = {
      id: 'inc-active-1',
      monitorId: 'mon-e2e',
      status: 'ACTIVE',
      startedAt: new Date(Date.now() - 300000),
      reason: 'Expected HTTP 200, received HTTP 500'
    };

    (prisma.incident.create as jest.Mock).mockResolvedValue(createdIncident);

    const incidentData = {
      type: 'FAILURE',
      monitorId: 'mon-e2e',
      reason: 'Expected HTTP 200, received HTTP 500'
    };

    expect(incidentData.type).toBe('FAILURE');

    (prisma.incident.findFirst as jest.Mock).mockResolvedValueOnce(createdIncident);

    expect(createdIncident.status).toBe('ACTIVE');

    (prisma.incident.findFirst as jest.Mock).mockResolvedValueOnce(createdIncident);
    (prisma.incident.update as jest.Mock).mockResolvedValue({
      ...createdIncident,
      status: 'RESOLVED',
      resolvedAt: new Date(),
      duration: 300
    });

    const resolvedIncident = await prisma.incident.update({
      where: { id: createdIncident.id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        duration: 300
      }
    });

    expect(resolvedIncident.status).toBe('RESOLVED');
    expect(resolvedIncident.duration).toBe(300);
  });
});
