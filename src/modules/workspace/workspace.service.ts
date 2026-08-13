import { Role } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export class WorkspaceService {
  public static async createWorkspace(userId: string, name: string) {
    return prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name,
          ownerId: userId
        }
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: Role.OWNER
        }
      });

      await tx.auditLog.create({
        data: {
          workspaceId: workspace.id,
          userId,
          action: 'WORKSPACE_CREATED',
          metadata: { workspaceName: name }
        }
      });

      return workspace;
    });
  }

  public static async getUserWorkspaces(userId: string) {
    const members = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            _count: {
              select: { monitors: true, members: true }
            }
          }
        }
      }
    });

    return members.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      ownerId: m.workspace.ownerId,
      role: m.role,
      monitorCount: m.workspace._count.monitors,
      memberCount: m.workspace._count.members,
      createdAt: m.workspace.createdAt
    }));
  }

  public static async getWorkspaceById(workspaceId: string) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        _count: {
          select: { monitors: true }
        }
      }
    });

    if (!workspace) {
      throw new AppError('Workspace not found', 404);
    }

    return workspace;
  }

  public static async addMember(workspaceId: string, email: string, role: Role, requesterId: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('No user found with the provided email address', 404);
    }

    const existingMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } }
    });

    if (existingMember) {
      throw new AppError('User is already a member of this workspace', 400);
    }

    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: user.id,
        role
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId: requesterId,
        action: 'MEMBER_ADDED',
        metadata: { addedUserEmail: email, assignedRole: role }
      }
    });

    return member;
  }

  public static async updateMemberRole(
    workspaceId: string,
    targetUserId: string,
    newRole: Role,
    requesterId: string
  ) {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new AppError('Workspace not found', 404);

    if (workspace.ownerId === targetUserId && newRole !== Role.OWNER) {
      throw new AppError('Workspace owner role cannot be downgraded', 400);
    }

    const updated = await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      data: { role: newRole }
    });

    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId: requesterId,
        action: 'MEMBER_ROLE_UPDATED',
        metadata: { targetUserId, newRole }
      }
    });

    return updated;
  }

  public static async removeMember(workspaceId: string, targetUserId: string, requesterId: string) {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new AppError('Workspace not found', 404);

    if (workspace.ownerId === targetUserId) {
      throw new AppError('Cannot remove workspace owner from workspace', 400);
    }

    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } }
    });

    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId: requesterId,
        action: 'MEMBER_REMOVED',
        metadata: { targetUserId }
      }
    });
  }
}
