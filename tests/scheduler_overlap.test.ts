import { SchedulerWorker } from '../src/workers/schedulerWorker';
import { prisma } from '../src/config/database';
import { healthCheckQueue } from '../src/config/redis';

jest.mock('../src/config/database', () => ({
  prisma: {
    monitor: {
      findMany: jest.fn(),
      update: jest.fn()
    }
  }
}));

jest.mock('../src/config/redis', () => ({
  healthCheckQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job-1' })
  }
}));

describe('Scheduler Overlap & Idempotency Suite', () => {
  const mockDueMonitor = {
    id: 'mon-overlap-1',
    workspaceId: 'ws-1',
    name: 'Overlapping Monitor Target',
    url: 'https://example.com/api',
    method: 'GET',
    interval: 60,
    timeout: 5000,
    expectedStatus: 200,
    isActive: true,
    nextCheckAt: new Date(Date.now() - 5000) // Due 5 seconds ago
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate deterministic idempotent job IDs based on time window to prevent job overlap', async () => {
    (prisma.monitor.findMany as jest.Mock).mockResolvedValue([mockDueMonitor]);
    (prisma.monitor.update as jest.Mock).mockResolvedValue({ ...mockDueMonitor, nextCheckAt: new Date(Date.now() + 60000) });

    // Run scheduler pass 1
    await SchedulerWorker.scheduleDueMonitors();

    expect(healthCheckQueue.add).toHaveBeenCalledTimes(1);

    const callArgs = (healthCheckQueue.add as jest.Mock).mock.calls[0];
    const jobName = callArgs[0];
    const jobData = callArgs[1];
    const jobOpts = callArgs[2];

    expect(jobName).toBe('execute-health-check');
    expect(jobData.monitorId).toBe('mon-overlap-1');
    expect(jobOpts.jobId).toMatch(/^check-mon-overlap-1-\d+$/);
  });

  it('should update nextCheckAt in database to prevent double scheduling on subsequent passes', async () => {
    // Pass 1: Monitor is due
    (prisma.monitor.findMany as jest.Mock).mockResolvedValueOnce([mockDueMonitor]);
    (prisma.monitor.update as jest.Mock).mockResolvedValueOnce({
      ...mockDueMonitor,
      nextCheckAt: new Date(Date.now() + 60000)
    });

    await SchedulerWorker.scheduleDueMonitors();

    expect(prisma.monitor.update).toHaveBeenCalledWith({
      where: { id: 'mon-overlap-1' },
      data: expect.objectContaining({ nextCheckAt: expect.any(Date) })
    });

    // Pass 2: Monitor is no longer due (returns empty array)
    (prisma.monitor.findMany as jest.Mock).mockResolvedValueOnce([]);

    await SchedulerWorker.scheduleDueMonitors();

    // Verify queue add was NOT called a second time
    expect(healthCheckQueue.add).toHaveBeenCalledTimes(1);
  });
});
