import { z } from 'zod';

export const CreateMonitorSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Monitor name must be at least 2 characters'),
    url: z.string().url('Invalid URL format'),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']).default('GET'),
    interval: z.number().min(10, 'Minimum check interval is 10 seconds').default(60),
    timeout: z.number().min(1000, 'Minimum timeout is 1000ms').max(30000, 'Maximum timeout is 30000ms').default(5000),
    expectedStatus: z.number().min(100).max(599).default(200),
    isActive: z.boolean().default(true)
  })
});

export const UpdateMonitorSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    url: z.string().url().optional(),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']).optional(),
    interval: z.number().min(10).optional(),
    timeout: z.number().min(1000).max(30000).optional(),
    expectedStatus: z.number().min(100).max(599).optional(),
    isActive: z.boolean().optional()
  })
});
