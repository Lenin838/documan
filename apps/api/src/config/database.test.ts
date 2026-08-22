import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockConnect, mockLogger } = vi.hoisted(() => ({
  mockConnect: vi.fn(),
  mockLogger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('mongoose', () => ({
  default: {
    connect: mockConnect,
  },
}));

vi.mock('./logger.js', () => ({
  logger: mockLogger,
}));

vi.mock('./env.js', () => ({
  env: {
    MONGO_URI: 'mongodb://localhost:27017/documan',
  },
}));

import { connectDatabase } from './database.js';

describe('connectDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should connect to the configured MongoDB URI', async () => {
    mockConnect.mockResolvedValueOnce(undefined);

    await connectDatabase();

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledWith(
      'mongodb://localhost:27017/documan',
    );
  });

  it('should log a success message after connecting', async () => {
    mockConnect.mockResolvedValueOnce(undefined);

    await connectDatabase();

    expect(mockLogger.info).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Database connected',
    );
  });

  it('should not log an error when connection succeeds', async () => {
    mockConnect.mockResolvedValueOnce(undefined);

    await connectDatabase();

    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should log the connection error when mongoose.connect fails', async () => {
    const error = new Error('Database connection failed');

    mockConnect.mockRejectedValueOnce(error);

    await expect(connectDatabase()).rejects.toBe(error);

    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      { error },
      'Database connection failed',
    );
  });

  it('should rethrow the original connection error', async () => {
    const error = new Error('MongoDB unavailable');

    mockConnect.mockRejectedValueOnce(error);

    await expect(connectDatabase()).rejects.toBe(error);
  });
});