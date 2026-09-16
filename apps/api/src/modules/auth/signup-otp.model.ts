import { Schema, model, type Document } from "mongoose";

export interface SignupOtpDocument extends Document {
  email: string;
  tokenHash: string;
  expiresAt: Date;
  failedAttempts: number;
  attemptsExceeded: boolean;
  lastSentAt: Date;
  resendCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const signupOtpSchema = new Schema<SignupOtpDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    tokenHash: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    failedAttempts: {
      type: Number,
      default: 0,
    },

    attemptsExceeded: {
      type: Boolean,
      default: false,
    },

    lastSentAt: {
      type: Date,
      default: Date.now,
    },

    resendCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

signupOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SignupOtp = model<SignupOtpDocument>("SignupOtp", signupOtpSchema);
