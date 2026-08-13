import { healthCheckQueue } from '../src/config/redis';
import { logger } from '../src/utils/logger';

async function runLoadBenchmark() {
  logger.info('🚀 Starting PulseOps BullMQ Queue Load & Concurrency Benchmark...');

  const totalJobs = 500;
  const startTime = Date.now();

  logger.info(`Pushing ${totalJobs} health-check jobs to Redis queue...`);

  const jobPromises = [];
  for (let i = 1; i <= totalJobs; i++) {
    jobPromises.push(
      healthCheckQueue.add('benchmark-job', {
        monitorId: `bench-mon-${i}`,
        url: 'https://httpbin.org/status/200',
        method: 'GET',
        timeout: 5000,
        expectedStatus: 200
      })
    );
  }

  await Promise.all(jobPromises);
  const enqueueDuration = Date.now() - startTime;

  logger.info(`✅ Successfully enqueued ${totalJobs} jobs in ${enqueueDuration}ms (${Math.round((totalJobs / enqueueDuration) * 1000)} jobs/sec)`);

  const counts = await healthCheckQueue.getJobCounts();
  logger.info('Current Queue Depths:', counts);

  process.exit(0);
}

runLoadBenchmark().catch((err) => {
  logger.error('Benchmark script failed', { error: err.message });
  process.exit(1);
});
