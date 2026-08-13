import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting PulseOps database seeding...');

  // 1. Clean existing seed data cleanly
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.incident.deleteMany({});
  await prisma.healthCheck.deleteMany({});
  await prisma.sslCertificate.deleteMany({});
  await prisma.statusPage.deleteMany({});
  await prisma.apiKey.deleteMany({});
  await prisma.monitor.deleteMany({});
  await prisma.workspaceMember.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.workspace.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Demo User
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@pulseops.com',
      passwordHash,
      name: 'Adarsh (Engineering Lead)',
      isEmailVerified: true
    }
  });
  console.log(`👤 Created Demo User: ${demoUser.email} (Password: Password123!)`);

  // 3. Create Acme Corp Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Acme Corp Engineering',
      slug: 'acme-corp',
      ownerId: demoUser.id,
      members: {
        create: {
          userId: demoUser.id,
          role: 'OWNER'
        }
      }
    }
  });
  console.log(`🏢 Created Workspace: ${workspace.name} (slug: ${workspace.slug})`);

  // 4. Create Sample API Key
  const apiKey = await prisma.apiKey.create({
    data: {
      workspaceId: workspace.id,
      name: 'CI/CD Pipeline Key',
      keyHash: 'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592', // SHA-256 for pk_live_demo123456
      keyPrefix: 'pk_live_demo'
    }
  });
  console.log(`🔑 Created API Key: ${apiKey.keyPrefix}...`);

  // 5. Create Healthy Monitor 1: GitHub Status API
  const githubMonitor = await prisma.monitor.create({
    data: {
      workspaceId: workspace.id,
      name: 'GitHub Status API',
      url: 'https://www.githubstatus.com/api/v2/status.json',
      method: 'GET',
      interval: 30,
      timeout: 5000,
      expectedStatus: 200,
      isActive: true,
      nextCheckAt: new Date(Date.now() + 30000)
    }
  });

  // 6. Create Healthy Monitor 2: Public Payment Gateway
  const paymentMonitor = await prisma.monitor.create({
    data: {
      workspaceId: workspace.id,
      name: 'Stripe API Gateway',
      url: 'https://api.stripe.com/v1/healthcheck',
      method: 'GET',
      interval: 60,
      timeout: 5000,
      expectedStatus: 200,
      isActive: true,
      nextCheckAt: new Date(Date.now() + 60000)
    }
  });

  // 7. Create Failing Monitor: Legacy Auth Service (Intentionally Failing for Demo)
  const legacyAuthMonitor = await prisma.monitor.create({
    data: {
      workspaceId: workspace.id,
      name: 'Legacy Auth Microservice',
      url: 'https://httpbin.org/status/500',
      method: 'GET',
      interval: 15,
      timeout: 3000,
      expectedStatus: 200,
      isActive: true,
      nextCheckAt: new Date(Date.now() + 15000)
    }
  });
  console.log(`🖥️ Created 3 Monitors (GitHub Status API, Stripe API Gateway, Legacy Auth Microservice)`);

  // 8. Seed Historical Health Checks for GitHub Status API (99.9% Uptime)
  const now = Date.now();
  for (let i = 20; i >= 0; i--) {
    await prisma.healthCheck.create({
      data: {
        monitorId: githubMonitor.id,
        checkedAt: new Date(now - i * 60000),
        statusCode: 200,
        responseTime: 120 + Math.floor(Math.random() * 40),
        success: true
      }
    });
  }

  // 9. Seed Failing Health Checks & Active Incident for Legacy Auth Service
  for (let i = 5; i >= 1; i--) {
    await prisma.healthCheck.create({
      data: {
        monitorId: legacyAuthMonitor.id,
        checkedAt: new Date(now - i * 30000),
        statusCode: 500,
        responseTime: 850,
        success: false,
        errorMessage: 'Expected HTTP 200, received HTTP 500 Internal Server Error'
      }
    });
  }

  // Active Incident for Legacy Auth Service
  const activeIncident = await prisma.incident.create({
    data: {
      monitorId: legacyAuthMonitor.id,
      status: 'ACTIVE',
      startedAt: new Date(now - 150000),
      reason: 'Expected HTTP 200, received HTTP 500 Internal Server Error'
    }
  });
  console.log(`⚠️ Created Active Incident for Legacy Auth Microservice (ID: ${activeIncident.id})`);

  // 10. Seed Historical Resolved Incident for GitHub Status API (Recovered)
  await prisma.incident.create({
    data: {
      monitorId: githubMonitor.id,
      status: 'RESOLVED',
      startedAt: new Date(now - 86400000), // 24 hours ago
      resolvedAt: new Date(now - 86100000), // 5 mins later
      duration: 300,
      reason: 'HTTP Timeout > 5000ms'
    }
  });

  // 11. Create Public Status Page
  const statusPage = await prisma.statusPage.create({
    data: {
      workspaceId: workspace.id,
      title: 'Acme Corp System Status',
      slug: 'acme-corp',
      description: 'Real-time operational status for Acme Corp APIs & Microservices',
      isPublic: true,
      monitors: {
        connect: [{ id: githubMonitor.id }, { id: paymentMonitor.id }, { id: legacyAuthMonitor.id }]
      }
    }
  });
  console.log(`🌐 Created Public Status Page: /api/v1/status/${statusPage.slug}`);

  // 12. Create Sample Audit Log
  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      userId: demoUser.id,
      action: 'MONITOR_CREATED',
      entityType: 'MONITOR',
      entityId: legacyAuthMonitor.id,
      details: { name: legacyAuthMonitor.name, url: legacyAuthMonitor.url }
    }
  });

  console.log('\n✅ PulseOps database seeding completed successfully!');
  console.log('----------------------------------------------------');
  console.log(`Demo Credentials : email: demo@pulseops.com | password: Password123!`);
  console.log(`Public Status Page: GET http://localhost:4000/api/v1/status/acme-corp`);
  console.log(`API Telemetry     : GET http://localhost:4000/api/v1/metrics`);
  console.log('----------------------------------------------------\n');
}

main()
  .catch((e) => {
    console.error('❌ Error Seeding Database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
