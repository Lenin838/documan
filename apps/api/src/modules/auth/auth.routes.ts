import { Router } from "express";

import { validateBody } from "../../middleware/validate.middleware.js";
import {
  loginRateLimiter,
  refreshRateLimiter,
  signupRateLimiter,
  verifyOtpRateLimiter,
  resendOtpRateLimiter,
} from "../../middleware/rate-limit.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";

import {
  registerController,
  verifyOtpController,
  resendOtpController,
  loginController,
  logoutController,
  logoutAllController,
  refreshController,
} from "./auth.controller.js";
import {
  loginSchema,
  registerSchema,
  verifyOtpSchema,
  resendOtpSchema,
} from "./auth.schema.js";

const authRouter = Router();

authRouter.post(
  "/register",
  signupRateLimiter,
  validateBody(registerSchema),
  registerController,
);

authRouter.post(
  "/register/verify-otp",
  verifyOtpRateLimiter,
  validateBody(verifyOtpSchema),
  verifyOtpController,
);

authRouter.post(
  "/register/resend-otp",
  resendOtpRateLimiter,
  validateBody(resendOtpSchema),
  resendOtpController,
);

authRouter.post(
  "/login",
  loginRateLimiter,
  validateBody(loginSchema),
  loginController,
);

authRouter.post("/refresh", refreshRateLimiter, refreshController);

authRouter.post("/logout", logoutController);

authRouter.post("/logout-all", authenticate, logoutAllController);

export { authRouter };
