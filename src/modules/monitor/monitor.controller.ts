import { Request, Response, NextFunction } from 'express';
import { MonitorService } from './monitor.service';

export class MonitorController {
  public static async createMonitor(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.params;
      const userId = req.user!.id;
      const monitor = await MonitorService.createMonitor(workspaceId, req.body, userId);
      return res.status(201).json({ message: 'Monitor created successfully', monitor });
    } catch (error) {
      return next(error);
    }
  }

  public static async getMonitors(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.params;
      const monitors = await MonitorService.getMonitorsByWorkspace(workspaceId);
      return res.status(200).json({ monitors });
    } catch (error) {
      return next(error);
    }
  }

  public static async getMonitorById(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId, id } = req.params;
      const monitor = await MonitorService.getMonitorById(workspaceId, id);
      return res.status(200).json({ monitor });
    } catch (error) {
      return next(error);
    }
  }

  public static async updateMonitor(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId, id } = req.params;
      const userId = req.user!.id;
      const monitor = await MonitorService.updateMonitor(workspaceId, id, req.body, userId);
      return res.status(200).json({ message: 'Monitor updated successfully', monitor });
    } catch (error) {
      return next(error);
    }
  }

  public static async deleteMonitor(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId, id } = req.params;
      const userId = req.user!.id;
      await MonitorService.deleteMonitor(workspaceId, id, userId);
      return res.status(200).json({ message: 'Monitor deleted successfully' });
    } catch (error) {
      return next(error);
    }
  }

  public static async toggleMonitor(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId, id } = req.params;
      const userId = req.user!.id;
      const monitor = await MonitorService.toggleMonitorState(workspaceId, id, userId);
      return res.status(200).json({ message: 'Monitor active status toggled', monitor });
    } catch (error) {
      return next(error);
    }
  }
}
