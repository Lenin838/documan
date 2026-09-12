import { Router } from "express";

import { validateBody } from "../../middleware/validate.middleware.js";
import {
  loginRateLimiter,
  refreshRateLimiter,
  signupRateLimiter,
} from "../../middleware/rate-limit.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";

import {
  registerController,
  loginController,
  logoutController,
  logoutAllController,
  refreshController,
} from "./auth.controller.js";
import { loginSchema, registerSchema } from "./auth.schema.js";

const authRouter = Router();

authRouter.post(
  "/register",
  signupRateLimiter,
  validateBody(registerSchema),
  registerController,
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
