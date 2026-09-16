import rateLimit from "express-rate-limit";

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_LOGIN_ATTEMPTS",
      message: "Too many login attempts. Please try again later.",
    },
  },
});

export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REFRESH_ATTEMPTS",
      message: "Too many refresh attempts. Please try again later.",
    },
  },
});

export const gateCheckRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_GATE_CHECK_REQUESTS",
      message: "Too many gate check requests. Please try again later.",
    },
  },
});

export const signupRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_SIGNUP_ATTEMPTS",
      message: "Too many signup attempts. Please try again later.",
    },
  },
});

export const verifyOtpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_VERIFY_ATTEMPTS",
      message: "Too many verification attempts. Please try again later.",
    },
  },
});

export const resendOtpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_RESEND_ATTEMPTS",
      message: "Too many resend attempts. Please try again later.",
    },
  },
});
