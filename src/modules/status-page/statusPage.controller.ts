import { Request, Response, NextFunction } from 'express';
import { StatusPageService } from './statusPage.service';

export class StatusPageController {
  public static async createStatusPage(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.params;
      const { name, slug, monitorIds, isPublic } = req.body;
      const userId = req.user!.id;
      const page = await StatusPageService.createStatusPage(
        workspaceId,
        name,
        slug,
        monitorIds,
        isPublic,
        userId
      );
      return res.status(201).json({ message: 'Status page created successfully', page });
    } catch (error) {
      return next(error);
    }
  }

  public static async getWorkspaceStatusPages(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.params;
      const pages = await StatusPageService.getStatusPagesByWorkspace(workspaceId);
      return res.status(200).json({ pages });
    } catch (error) {
      return next(error);
    }
  }

  public static async getPublicStatusPage(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const pageData = await StatusPageService.getPublicStatusPage(slug);
      return res.status(200).json({ page: pageData });
    } catch (error) {
      return next(error);
    }
  }
}
