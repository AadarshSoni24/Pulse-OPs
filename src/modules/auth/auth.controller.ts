import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password } = req.body;
      const result = await AuthService.register(name, email, password);
      return res.status(201).json({
        message: 'Account created successfully',
        ...result
      });
    } catch (error) {
      return next(error);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      return res.status(200).json({
        message: 'Login successful',
        ...result
      });
    } catch (error) {
      return next(error);
    }
  }

  public static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refreshAccessToken(refreshToken);
      return res.status(200).json({
        message: 'Tokens refreshed successfully',
        ...result
      });
    } catch (error) {
      return next(error);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      await AuthService.logout(refreshToken);
      return res.status(200).json({
        message: 'Logged out successfully'
      });
    } catch (error) {
      return next(error);
    }
  }

  public static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const user = await AuthService.getMe(userId);
      return res.status(200).json({ user });
    } catch (error) {
      return next(error);
    }
  }
}
