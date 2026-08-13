import { Worker, Job } from 'bullmq';
import axios, { AxiosResponse } from 'axios';
import http from 'http';
import https from 'https';
import { redisConnectionOptions, QUEUE_NAMES, incidentQueue, sslCheckQueue } from '../config/redis';
import { prisma } from '../config/database';
import { validateUrlForSSRF, validateRedirectTarget } from '../utils/ssrfGuard';
import { logger } from '../utils/logger';

export interface HealthCheckJobData {
  monitorId: string;
  url: string;
  method: string;
  timeout: number;
  expectedStatus: number;
}

export const healthCheckWorker = new Worker<HealthCheckJobData>(
  QUEUE_NAMES.HEALTH_CHECK,
  async (job: Job<HealthCheckJobData>) => {
    const { monitorId, url, method, timeout, expectedStatus } = job.data;
    const startTime = Date.now();

    let statusCode: number | undefined;
    let responseTime: number | undefined;
    let success = false;
    let errorMessage: string | undefined;

    let currentUrl = url;
    let redirectCount = 0;
    const maxRedirects = 5;

    try {
      const httpAgent = new http.Agent({ keepAlive: false });
      const httpsAgent = new https.Agent({ keepAlive: false });

      let response: AxiosResponse | undefined;

      while (redirectCount <= maxRedirects) {
        // 1. Enforce SSRF protection prior to dispatching HTTP request on current hop
        await validateUrlForSSRF(currentUrl);

        response = await axios({
          method: method || 'GET',
          url: currentUrl,
          timeout: timeout || 5000,
          maxRedirects: 0, // Disable automatic redirect following to inspect headers
          httpAgent,
          httpsAgent,
          validateStatus: () => true // Allow handling status codes manually
        });

        // Check if response is a redirect (301, 302, 303, 307, 308)
        if (
          response &&
          [301, 302, 303, 307, 308].includes(response.status) &&
          response.headers &&
          response.headers.location
        ) {
          redirectCount++;
          if (redirectCount > maxRedirects) {
            throw new Error(`Exceeded maximum redirect limit of ${maxRedirects}`);
          }

          // Validate redirect location header against SSRF before following!
          currentUrl = await validateRedirectTarget(currentUrl, response.headers.location as string);
          continue;
        }

        // Final non-redirect response reached
        break;
      }

      responseTime = Date.now() - startTime;
      statusCode = response?.status;

      if (statusCode === expectedStatus || (expectedStatus === 200 && statusCode && statusCode >= 200 && statusCode < 300)) {
        success = true;
      } else {
        success = false;
        errorMessage = `Expected HTTP ${expectedStatus}, received HTTP ${statusCode}`;
      }
    } catch (err: any) {
      responseTime = Date.now() - startTime;
      success = false;
      errorMessage = err.message || 'Request failed';
    }

    // 2. Persist Health Check record
    await prisma.healthCheck.create({
      data: {
        monitorId,
        statusCode,
        responseTime,
        success,
        errorMessage,
        checkedAt: new Date()
      }
    });

    // 3. Update monitor last checked timestamp
    await prisma.monitor.update({
      where: { id: monitorId },
      data: { lastCheckedAt: new Date() }
    });

    // 4. Trigger SSL check if final URL is HTTPS
    if (currentUrl.startsWith('https://')) {
      sslCheckQueue.add('check-ssl', { monitorId, url: currentUrl }).catch(() => {});
    }

    // 5. Handle Incident Creation or Recovery
    if (!success) {
      const recentChecks = await prisma.healthCheck.findMany({
        where: { monitorId },
        orderBy: { checkedAt: 'desc' },
        take: 2
      });

      const consecutiveFailures = recentChecks.filter((c) => !c.success).length;

      if (consecutiveFailures >= 2) {
        await incidentQueue.add('process-incident', {
          type: 'FAILURE',
          monitorId,
          reason: errorMessage || 'Health check failed'
        });
      }
    } else {
      const activeIncident = await prisma.incident.findFirst({
        where: { monitorId, status: 'ACTIVE' }
      });

      if (activeIncident) {
        const resolvedAt = new Date();
        const duration = Math.round((resolvedAt.getTime() - activeIncident.startedAt.getTime()) / 1000);

        await prisma.incident.update({
          where: { id: activeIncident.id },
          data: {
            status: 'RESOLVED',
            resolvedAt,
            duration
          }
        });

        await incidentQueue.add('process-incident', {
          type: 'RECOVERY',
          monitorId,
          incidentId: activeIncident.id,
          duration
        });
      }
    }

    logger.info(`Health check processed for monitor ${monitorId}`, {
      url,
      success,
      statusCode,
      responseTime
    });
  },
  { connection: redisConnectionOptions, concurrency: 10 }
);

healthCheckWorker.on('error', (err) => {
  if (process.env.NODE_ENV !== 'test') {
    logger.error('Health Check Worker Redis error', { error: err.message });
  }
});
