import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service';

export class AuditController {
  public static async getWorkspaceAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const data = await AuditService.getWorkspaceAuditLogs(workspaceId, limit, page);
      return res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }
}
