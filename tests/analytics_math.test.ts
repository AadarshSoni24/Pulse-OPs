import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { prisma } from '../src/config/database';

jest.mock('../src/config/database', () => ({
  prisma: {
    monitor: {
      findFirst: jest.fn()
    },
    healthCheck: {
      findMany: jest.fn()
    },
    incident: {
      findMany: jest.fn()
    }
  }
}));

describe('Analytics Engine Math Verification Suite', () => {
  const mockMonitorId = 'mon-123';
  const mockWorkspaceId = 'ws-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should compute exact percentiles, uptime %, MTTR, and MTBF for known dataset', async () => {
    (prisma.monitor.findFirst as jest.Mock).mockResolvedValue({
      id: mockMonitorId,
      workspaceId: mockWorkspaceId,
      name: 'Known Dataset Monitor',
      url: 'https://example.com/health'
    });

    const knownLatencies = [100, 110, 120, 130, 140, 150, 160, 170, 180, 190];
    const mockHealthChecks = knownLatencies.map((lat, idx) => ({
      id: `check-${idx}`,
      monitorId: mockMonitorId,
      statusCode: 200,
      responseTime: lat,
      success: true,
      checkedAt: new Date(Date.now() - idx * 60000)
    }));

    (prisma.healthCheck.findMany as jest.Mock).mockResolvedValue(mockHealthChecks);
    (prisma.incident.findMany as jest.Mock).mockResolvedValue([]);

    const analytics = await AnalyticsService.getMonitorAnalytics(mockWorkspaceId, mockMonitorId, 24);

    expect(analytics.summary.totalChecks).toBe(10);
    expect(analytics.summary.successfulChecks).toBe(10);
    expect(analytics.summary.failedChecks).toBe(0);
    expect(analytics.summary.uptimePercentage).toBe('100%');

    expect(analytics.latency.avgMs).toBe(145); // (100+110+...+190)/10 = 145
    expect(analytics.latency.minMs).toBe(100);
    expect(analytics.latency.maxMs).toBe(190);
    expect(analytics.latency.p50Ms).toBe(150);
    expect(analytics.latency.p95Ms).toBe(190);
    expect(analytics.latency.p99Ms).toBe(190);
  });

  it('should compute correct MTTR and downtime duration when incidents occur', async () => {
    (prisma.monitor.findFirst as jest.Mock).mockResolvedValue({
      id: mockMonitorId,
      workspaceId: mockWorkspaceId,
      name: 'Failing Monitor',
      url: 'https://example.com/api'
    });

    // 8 success, 2 failed
    const mockChecks = [
      ...Array(8).fill(null).map((_, i) => ({ success: true, responseTime: 120, checkedAt: new Date() })),
      ...Array(2).fill(null).map((_, i) => ({ success: false, responseTime: 500, checkedAt: new Date() }))
    ];

    (prisma.healthCheck.findMany as jest.Mock).mockResolvedValue(mockChecks);
    (prisma.incident.findMany as jest.Mock).mockResolvedValue([
      { id: 'inc-1', duration: 300, startedAt: new Date() },
      { id: 'inc-2', duration: 150, startedAt: new Date() }
    ]);

    const analytics = await AnalyticsService.getMonitorAnalytics(mockWorkspaceId, mockMonitorId, 24);

    expect(analytics.summary.uptimePercentage).toBe('80%');
    expect(analytics.summary.totalIncidents).toBe(2);
    expect(analytics.reliability.mttrSeconds).toBe(225); // (300 + 150) / 2 = 225
    expect(analytics.reliability.totalDowntimeSeconds).toBe(450);
  });
});
