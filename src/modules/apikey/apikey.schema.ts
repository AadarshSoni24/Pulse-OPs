import { z } from 'zod';

export const CreateApiKeySchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Key name must be at least 2 characters'),
    expiresInDays: z.number().optional()
  })
});
