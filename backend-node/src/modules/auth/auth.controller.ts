import { NextFunction, Request, Response } from 'express';
import { CookieNames } from '../../constants/cookies';
import { HttpStatus, HttpStatusCode } from '../../constants/httpStatusCodes';
import { ResponseMessages } from '../../constants/responseMessages';
import { ApiResponse } from '../../utils/apiResponse';
import { clearAuthCookies, setAuthCookies, setCsrfCookie } from '../../utils/cookies';
import { generateCsrfToken } from '../../utils/csrf';
import { AuthService } from './auth.service';

function issueSession(
  res: Response,
  result: Awaited<ReturnType<typeof AuthService.login>>,
  statusCode: HttpStatusCode,
  message: string
) {
  setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
  setCsrfCookie(res, generateCsrfToken());
  ApiResponse.send(res, {
    statusCode,
    message,
    data: { user: result.user },
  });
}

export class AuthController {
  static async register(req: Request, res: Response, _next: NextFunction) {
    const result = await AuthService.register(req.body);
    issueSession(res, result, HttpStatus.CREATED, ResponseMessages.REGISTER_SUCCESS);
  }

  static async login(req: Request, res: Response, _next: NextFunction) {
    const result = await AuthService.login(req.body);
    issueSession(res, result, HttpStatus.OK, ResponseMessages.LOGIN_SUCCESS);
  }

  static async refresh(req: Request, res: Response, _next: NextFunction) {
    const refreshToken = req.cookies?.[CookieNames.REFRESH_TOKEN] as string | undefined;
    const result = await AuthService.refresh(refreshToken ?? '');
    issueSession(res, result, HttpStatus.OK, ResponseMessages.REFRESH_SUCCESS);
  }

  static async logout(req: Request, res: Response, _next: NextFunction) {
    const refreshToken = req.cookies?.[CookieNames.REFRESH_TOKEN] as string | undefined;
    await AuthService.logout(refreshToken);
    clearAuthCookies(res);
    ApiResponse.send(res, { message: ResponseMessages.LOGOUT_SUCCESS, data: null });
  }

  static async me(req: Request, res: Response, _next: NextFunction) {
    const user = await AuthService.getCurrentUser(req.user!.id);
    ApiResponse.send(res, { data: user });
  }

  static async csrf(_req: Request, res: Response, _next: NextFunction) {
    const token = generateCsrfToken();
    setCsrfCookie(res, token);
    ApiResponse.send(res, { data: { csrfToken: token } });
  }

  static async changePassword(req: Request, res: Response, _next: NextFunction) {
    await AuthService.changePassword(req.user!.id, req.body);
    clearAuthCookies(res);
    ApiResponse.send(res, { message: 'Password changed successfully. Please sign in again.', data: null });
  }

  static async forgotPassword(req: Request, res: Response, _next: NextFunction) {
    const result = await AuthService.forgotPassword(req.body);
    ApiResponse.send(res, {
      message: 'If an account exists for that email, a reset token has been issued.',
      data: result,
    });
  }

  static async resetPassword(req: Request, res: Response, _next: NextFunction) {
    await AuthService.resetPassword(req.body);
    ApiResponse.send(res, { message: 'Password reset successfully', data: null });
  }
}
