import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { authRateLimiter } from '../../middlewares/rateLimiter.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthController } from './auth.controller';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.validation';

const router = Router();

router.get('/csrf', asyncHandler(AuthController.csrf));
router.post('/register', authRateLimiter, validate({ body: registerSchema }), asyncHandler(AuthController.register));
router.post('/login', authRateLimiter, validate({ body: loginSchema }), asyncHandler(AuthController.login));
router.post('/refresh', asyncHandler(AuthController.refresh));
router.post('/logout', asyncHandler(AuthController.logout));
router.post('/forgot-password', authRateLimiter, validate({ body: forgotPasswordSchema }), asyncHandler(AuthController.forgotPassword));
router.post('/reset-password', authRateLimiter, validate({ body: resetPasswordSchema }), asyncHandler(AuthController.resetPassword));
router.get('/me', authenticate, asyncHandler(AuthController.me));
router.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  asyncHandler(AuthController.changePassword)
);

export const authRoutes = router;
