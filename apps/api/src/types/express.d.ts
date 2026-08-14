declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: {
        userId: string;
        role: 'user' | 'admin';
      };
    }
  }
}

export {};