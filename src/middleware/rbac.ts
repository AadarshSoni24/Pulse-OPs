import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from './errorHandler';

const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 4,
  ADMIN: 3,
  DEVELOPER: 2,
  VIEWER: 1
};

export function checkWorkspaceRole(allowedRoles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError('Unauthorized', 401));
      }

      const workspaceId = req.params.workspaceId || req.params.id || req.body.workspaceId;
      if (!workspaceId) {
        return next(new AppError('Workspace ID parameter missing from request', 400));
      }

      // If authenticated via API Key, enforce workspace boundary
      if (req.apiKeyWorkspaceId && req.apiKeyWorkspaceId !== workspaceId) {
        return next(new AppError('API key is not authorized for this workspace', 403));
      }

      const member = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId
          }
        }
      });

      if (!member) {
        return next(new AppError('Access denied: You are not a member of this workspace', 403));
      }

      const userRoleWeight = ROLE_HIERARCHY[member.role];
      const hasPermission = allowedRoles.some((role) => userRoleWeight >= ROLE_HIERARCHY[role]);

      if (!hasPermission) {
        return next(
          new AppError(
            `Forbidden: Your role (${member.role}) does not have permission to perform this action`,
            403
          )
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}
