import { Request, Response, NextFunction } from 'express';
import { WorkspaceService } from './workspace.service';

export class WorkspaceController {
  public static async createWorkspace(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { name } = req.body;
      const workspace = await WorkspaceService.createWorkspace(userId, name);
      return res.status(201).json({ message: 'Workspace created successfully', workspace });
    } catch (error) {
      return next(error);
    }
  }

  public static async getWorkspaces(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const workspaces = await WorkspaceService.getUserWorkspaces(userId);
      return res.status(200).json({ workspaces });
    } catch (error) {
      return next(error);
    }
  }

  public static async getWorkspaceById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const workspace = await WorkspaceService.getWorkspaceById(id);
      return res.status(200).json({ workspace });
    } catch (error) {
      return next(error);
    }
  }

  public static async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { email, role } = req.body;
      const requesterId = req.user!.id;
      const member = await WorkspaceService.addMember(id, email, role, requesterId);
      return res.status(201).json({ message: 'Member added to workspace', member });
    } catch (error) {
      return next(error);
    }
  }

  public static async updateMemberRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, userId } = req.params;
      const { role } = req.body;
      const requesterId = req.user!.id;
      const updated = await WorkspaceService.updateMemberRole(id, userId, role, requesterId);
      return res.status(200).json({ message: 'Member role updated', member: updated });
    } catch (error) {
      return next(error);
    }
  }

  public static async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, userId } = req.params;
      const requesterId = req.user!.id;
      await WorkspaceService.removeMember(id, userId, requesterId);
      return res.status(200).json({ message: 'Member removed from workspace' });
    } catch (error) {
      return next(error);
    }
  }
}
