import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';

export class AnalyticsController {
  public static async getMonitorAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId, id } = req.params;
      const hours = req.query.hours ? parseInt(req.query.hours as string, 10) : 24;
      const analytics = await AnalyticsService.getMonitorAnalytics(workspaceId, id, hours);
      return res.status(200).json({ analytics });
    } catch (error) {
      return next(error);
    }
  }
}
