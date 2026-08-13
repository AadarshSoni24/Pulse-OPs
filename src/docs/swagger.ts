import swaggerJSDoc from 'swagger-jsdoc';
import { env } from '../config/environment';

const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PulseOps API Specification',
      version: '1.0.0',
      description: 'Production-grade REST API for PulseOps - Distributed API Uptime, Latency, and SSL Certificate Monitoring Platform'
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api/v1`,
        description: 'Local Development Server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ]
  },
  apis: ['./src/modules/**/*.ts', './src/index.ts']
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);
