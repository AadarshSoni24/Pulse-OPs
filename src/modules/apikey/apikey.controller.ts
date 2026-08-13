import { Request, Response, NextFunction } from 'express';
import { ApiKeyService } from './apikey.service';

export class ApiKeyController {
  public static async createApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.params;
      const { name, expiresInDays } = req.body;
      const userId = req.user!.id;
      const result = await ApiKeyService.createApiKey(workspaceId, name, userId, expiresInDays);
      return res.status(201).json({
        message: 'API Key generated successfully. Save this secret key as it will not be shown again.',
        ...result
      });
    } catch (error) {
      return next(error);
    }
  }

  public static async getApiKeys(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId } = req.params;
      const keys = await ApiKeyService.getApiKeysByWorkspace(workspaceId);
      return res.status(200).json({ apiKeys: keys });
    } catch (error) {
      return next(error);
    }
  }

  public static async revokeApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId, id } = req.params;
      const userId = req.user!.id;
      await ApiKeyService.revokeApiKey(workspaceId, id, userId);
      return res.status(200).json({ message: 'API Key revoked successfully' });
    } catch (error) {
      return next(error);
    }
  }
}
