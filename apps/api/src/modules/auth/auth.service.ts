import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";

import { env } from "../../config/env.js";
import { AppError } from "../../errors/app-error.js";
import {
  generateRefreshToken,
  hashRefreshToken,
} from "../../utils/refresh-token.js";
import { generateAccessToken } from "../../utils/jwt.js";
import { RefreshToken } from "./refresh-token.model.js";
import type {
  LoginInput,
  RegisterInput,
  VerifyOtpInput,
  ResendOtpInput,
} from "./auth.schema.js";
import { User } from "../users/user.model.js";
import { createUser } from "../users/user.service.js";
import { SignupOtp } from "./signup-otp.model.js";
import { generateOtp, hashOtp, verifyOtpHash } from "../../utils/otp.js";
import { emailService } from "../../utils/email.service.js";

export async function registerUser(input: RegisterInput) {
  const normalizedEmail = input.email.toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    if (existingUser.isEmailVerified) {
      throw new AppError(
        "User with this email already exists",
        409,
        "USER_ALREADY_EXISTS",
      );
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    existingUser.name = input.name;
    existingUser.passwordHash = passwordHash;
    await existingUser.save();
  } else {
    await createUser({
      name: input.name,
      email: input.email,
      password: input.password,
      isEmailVerified: false,
    });
  }

  const otp = generateOtp();
  const tokenHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await SignupOtp.findOneAndUpdate(
    { email: normalizedEmail },
    {
      $set: {
        tokenHash,
        expiresAt,
        failedAttempts: 0,
        attemptsExceeded: false,
        lastSentAt: new Date(),
        resendCount: 0,
      },
    },
    { upsert: true, new: true },
  );

  try {
    await emailService.sendVerificationOtp(normalizedEmail, input.name, otp);
  } catch (_error) {
    throw new AppError(
      "Failed to dispatch verification email. Please try again.",
      500,
      "EMAIL_DELIVERY_FAILED",
    );
  }

  const isDevNoSmtp = env.NODE_ENV === "development" && !env.SMTP_HOST;

  return {
    message:
      "Registration successful. Please verify your email with the 6-digit code sent to your inbox.",
    email: normalizedEmail,
    resendCooldown: 60,
    ...(isDevNoSmtp ? { devOtpCode: otp } : {}),
  };
}

export async function verifySignupOtp(input: VerifyOtpInput) {
  const normalizedEmail = input.email.toLowerCase();
  const otpRecord = await SignupOtp.findOne({ email: normalizedEmail });

  if (!otpRecord) {
    throw new AppError("Invalid verification code", 400, "INVALID_OTP");
  }

  if (otpRecord.attemptsExceeded) {
    throw new AppError(
      "Maximum verification attempts exceeded. Please request a new code.",
      400,
      "ATTEMPTS_EXCEEDED",
    );
  }

  if (otpRecord.expiresAt.getTime() < Date.now()) {
    throw new AppError(
      "Verification code has expired. Please request a new code.",
      400,
      "OTP_EXPIRED",
    );
  }

  const isMatch = verifyOtpHash(input.otp, otpRecord.tokenHash);

  if (!isMatch) {
    otpRecord.failedAttempts += 1;

    if (otpRecord.failedAttempts >= 5) {
      otpRecord.attemptsExceeded = true;
    }

    await otpRecord.save();

    if (otpRecord.attemptsExceeded) {
      throw new AppError(
        "Maximum verification attempts exceeded. Please request a new code.",
        400,
        "ATTEMPTS_EXCEEDED",
      );
    }

    const remaining = 5 - otpRecord.failedAttempts;
    throw new AppError(
      `Invalid verification code. You have ${remaining} attempt${
        remaining === 1 ? "" : "s"
      } remaining.`,
      400,
      "INVALID_OTP",
    );
  }

  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  user.isEmailVerified = true;
  await user.save();

  await SignupOtp.deleteOne({ email: normalizedEmail });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const familyId = randomUUID();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: refreshTokenHash,
    familyId,
    expiresAt,
    revokedAt: null,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
    },
  };
}

export async function resendSignupOtp(input: ResendOtpInput) {
  const normalizedEmail = input.email.toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user || user.isEmailVerified) {
    return {
      message: "A new verification code has been dispatched to your email address.",
      resendCooldown: 60,
    };
  }

  const otpRecord = await SignupOtp.findOne({ email: normalizedEmail });

  if (otpRecord) {
    const secondsSinceLastSent =
      (Date.now() - new Date(otpRecord.lastSentAt).getTime()) / 1000;

    if (secondsSinceLastSent < 60) {
      throw new AppError(
        "Please wait 60 seconds before requesting another code.",
        429,
        "RESEND_COOLDOWN_ACTIVE",
      );
    }

    if (otpRecord.resendCount >= 3 && secondsSinceLastSent < 3600) {
      throw new AppError(
        "Maximum resend attempts reached for this hour. Please try again later.",
        429,
        "RESEND_LIMIT_EXCEEDED",
      );
    }
  }

  const newOtp = generateOtp();
  const tokenHash = hashOtp(newOtp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const currentResendCount = otpRecord ? otpRecord.resendCount + 1 : 1;

  await SignupOtp.findOneAndUpdate(
    { email: normalizedEmail },
    {
      $set: {
        tokenHash,
        expiresAt,
        failedAttempts: 0,
        attemptsExceeded: false,
        lastSentAt: new Date(),
        resendCount: currentResendCount,
      },
    },
    { upsert: true, new: true },
  );

  try {
    await emailService.sendVerificationOtp(normalizedEmail, user.name, newOtp);
  } catch (_error) {
    throw new AppError(
      "Failed to dispatch verification email. Please try again.",
      500,
      "EMAIL_DELIVERY_FAILED",
    );
  }

  const isDevNoSmtp = env.NODE_ENV === "development" && !env.SMTP_HOST;

  return {
    message: "A new verification code has been dispatched to your email address.",
    resendCooldown: 60,
    ...(isDevNoSmtp ? { devOtpCode: newOtp } : {}),
  };
}

export async function loginUser(input: LoginInput) {
  const user = await User.findOne({
    email: input.email.toLowerCase(),
  });

  if (!user) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw new AppError("User account is inactive", 403, "ACCOUNT_INACTIVE");
  }

  if (!user.isEmailVerified) {
    throw new AppError(
      "Please verify your email address before logging in",
      403,
      "EMAIL_NOT_VERIFIED",
    );
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const familyId = randomUUID();

  const expiresAt = new Date();

  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: refreshTokenHash,
    familyId,
    expiresAt,
    revokedAt: null,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
    },
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);

  const storedToken = await RefreshToken.findOne({
    tokenHash,
  });

  if (!storedToken) {
    throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
  }

  if (storedToken.revokedAt) {
    await RefreshToken.updateMany(
      {
        userId: storedToken.userId,
        familyId: storedToken.familyId,
        revokedAt: null,
      },
      {
        $set: {
          revokedAt: new Date(),
        },
      },
    );

    throw new AppError(
      "Refresh token reuse detected",
      401,
      "REFRESH_TOKEN_REUSE_DETECTED",
    );
  }

  if (storedToken.expiresAt <= new Date()) {
    throw new AppError(
      "Refresh token has expired",
      401,
      "REFRESH_TOKEN_EXPIRED",
    );
  }

  const user = await User.findById(storedToken.userId);

  if (!user) {
    throw new AppError("User not found", 401, "INVALID_REFRESH_TOKEN");
  }

  if (!user.isActive) {
    throw new AppError("User account is inactive", 403, "ACCOUNT_INACTIVE");
  }

  if (!user.isEmailVerified) {
    throw new AppError(
      "Please verify your email address before logging in",
      403,
      "EMAIL_NOT_VERIFIED",
    );
  }

  storedToken.revokedAt = new Date();
  await storedToken.save();

  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashRefreshToken(newRefreshToken);

  const expiresAt = new Date();

  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: newRefreshTokenHash,
    familyId: storedToken.familyId,
    expiresAt,
    revokedAt: null,
  });

  const accessToken = generateAccessToken(user.id);

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logoutUser(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);

  await RefreshToken.findOneAndUpdate(
    {
      tokenHash,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    },
  );
}

export async function logoutAllSessions(userId: string) {
  await RefreshToken.updateMany(
    {
      userId,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    },
  );
}
