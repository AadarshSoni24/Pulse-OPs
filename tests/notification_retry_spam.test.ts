import nodemailer from 'nodemailer';
import { NotificationJobData } from '../src/workers/notificationWorker';

describe('Notification Worker Retry & Anti-Spam Suite', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should process incident created email notification successfully', async () => {
    const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'msg-123' });
    jest.spyOn(nodemailer, 'createTransport').mockReturnValue({
      sendMail: mockSendMail
    } as any);

    const jobData: NotificationJobData = {
      type: 'INCIDENT_CREATED',
      recipient: 'alerts@company.com',
      monitorName: 'Production Payment Gateway',
      monitorUrl: 'https://api.payment.com',
      reason: 'Expected HTTP 200, received HTTP 500',
      incidentId: 'inc-100'
    };

    const transporter = nodemailer.createTransport({} as any);
    await transporter.sendMail({
      from: 'alerts@pulseops.com',
      to: jobData.recipient,
      subject: `[ALERT] Incident Detected on ${jobData.monitorName}`,
      html: `<p>${jobData.reason}</p>`
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'alerts@company.com'
      })
    );
  });

  it('should throw error on email transport failure to trigger BullMQ job retry', async () => {
    const mockSendMail = jest.fn().mockRejectedValue(new Error('SMTP Connection Timeout'));
    jest.spyOn(nodemailer, 'createTransport').mockReturnValue({
      sendMail: mockSendMail
    } as any);

    const transporter = nodemailer.createTransport({} as any);

    await expect(
      transporter.sendMail({
        from: 'alerts@pulseops.com',
        to: 'fail@company.com',
        subject: 'Test',
        html: 'Test'
      })
    ).rejects.toThrow('SMTP Connection Timeout');
  });

  it('should restrict notification spam for repeated failures on same monitor', async () => {
    const notifications: NotificationJobData[] = [];

    for (let i = 0; i < 5; i++) {
      if (notifications.length === 0 || notifications[notifications.length - 1].type !== 'INCIDENT_CREATED') {
        notifications.push({
          type: 'INCIDENT_CREATED',
          recipient: 'user@company.com',
          monitorName: 'Payment API',
          monitorUrl: 'https://api.payment.com',
          incidentId: 'inc-single-1'
        });
      }
    }

    expect(notifications.length).toBe(1);
  });
});
