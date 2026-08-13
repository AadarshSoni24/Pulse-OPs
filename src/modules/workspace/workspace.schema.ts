import { z } from 'zod';
import { Role } from '@prisma/client';

export const CreateWorkspaceSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Workspace name must be at least 2 characters')
  })
});

export const AddMemberSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid member email address'),
    role: z.nativeEnum(Role).default(Role.DEVELOPER)
  })
});

export const UpdateRoleSchema = z.object({
  body: z.object({
    role: z.nativeEnum(Role)
  })
});
