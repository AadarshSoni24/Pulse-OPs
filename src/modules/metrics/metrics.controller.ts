import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

export class MetricsController {
  public static async getSystemMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const metrics = await MetricsService.getSystemMetrics();
      return res.status(200).json({ metrics });
    } catch (error) {
      return next(error);
    }
  }
}
