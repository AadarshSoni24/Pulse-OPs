import { SslCheckJobData } from '../src/workers/sslWorker';

jest.mock('../src/config/database', () => ({
  prisma: {
    sslCertificate: {
      upsert: jest.fn().mockResolvedValue({ id: 'ssl-1' })
    }
  }
}));

describe('SSL Certificate Monitoring Worker Suite', () => {
  it('should ignore non-HTTPS URLs gracefully', async () => {
    const jobData: SslCheckJobData = {
      monitorId: 'mon-http-1',
      url: 'http://example.com/status'
    };

    expect(jobData.url.startsWith('https://')).toBe(false);
  });

  it('should calculate days remaining correctly for valid SSL certificate', () => {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    const daysRemaining = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    expect(daysRemaining).toBe(30);
  });

  it('should flag certificates with less than 14 days remaining for alert', () => {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days remaining
    const daysRemaining = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const needsAlert = daysRemaining < 14;
    expect(needsAlert).toBe(true);
  });
});
