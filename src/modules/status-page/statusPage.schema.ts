import { z } from 'zod';

export const CreateStatusPageSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Status page name must be at least 2 characters'),
    slug: z
      .string()
      .min(3, 'Slug must be at least 3 characters')
      .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
    monitorIds: z.array(z.string()).min(1, 'Select at least one monitor for the status page'),
    isPublic: z.boolean().default(true)
  })
});
