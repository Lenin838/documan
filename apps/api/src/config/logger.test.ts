import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPino } = vi.hoisted(() => ({
  mockPino: vi.fn(),
}));

vi.mock('pino', () => ({
  default: mockPino,
}));

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should create logger with the configured log level', async () => {
    vi.doMock('./env.js', () => ({
      env: {
        NODE_ENV: 'test',
        LOG_LEVEL: 'info',
      },
    }));

    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
    };

    mockPino.mockReturnValue(mockLogger);

    const { logger } = await import('./logger.js');

    expect(mockPino).toHaveBeenCalledTimes(1);

    expect(mockPino).toHaveBeenCalledWith({
      level: 'info',
    });

    expect(logger).toBe(mockLogger);
  });

  it('should configure pino-pretty transport in development', async () => {
    vi.doMock('./env.js', () => ({
      env: {
        NODE_ENV: 'development',
        LOG_LEVEL: 'debug',
      },
    }));

    const mockLogger = {};

    mockPino.mockReturnValue(mockLogger);

    const { logger } = await import('./logger.js');

    expect(mockPino).toHaveBeenCalledTimes(1);

    expect(mockPino).toHaveBeenCalledWith({
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
        },
      },
    });

    expect(logger).toBe(mockLogger);
  });

  it('should not configure pino-pretty transport in test environment', async () => {
    vi.doMock('./env.js', () => ({
      env: {
        NODE_ENV: 'test',
        LOG_LEVEL: 'warn',
      },
    }));

    mockPino.mockReturnValue({});

    await import('./logger.js');

    expect(mockPino).toHaveBeenCalledWith({
      level: 'warn',
    });

    const options = mockPino.mock.calls[0]?.[0];

    expect(options).toBeDefined();
    expect(options).not.toHaveProperty('transport');
  });

  it('should not configure pino-pretty transport in production', async () => {
    vi.doMock('./env.js', () => ({
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'error',
      },
    }));

    mockPino.mockReturnValue({});

    await import('./logger.js');

    expect(mockPino).toHaveBeenCalledWith({
      level: 'error',
    });

    const options = mockPino.mock.calls[0]?.[0];

    expect(options).toBeDefined();
    expect(options).not.toHaveProperty('transport');
  });

  it('should support different log levels', async () => {
    vi.doMock('./env.js', () => ({
      env: {
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
      },
    }));

    mockPino.mockReturnValue({});

    await import('./logger.js');

    expect(mockPino).toHaveBeenCalledWith({
      level: 'silent',
    });
  });
});