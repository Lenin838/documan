import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const connectDatabase = vi.fn();
const listen = vi.fn();
const loggerInfo = vi.fn();
const loggerError = vi.fn();

vi.mock('./config/database.js', () => ({
  connectDatabase,
}));

vi.mock('./config/env.js', () => ({
  env: {
    PORT: 4000,
  },
}));

vi.mock('./config/logger.js', () => ({
  logger: {
    info: loggerInfo,
    error: loggerError,
  },
}));

vi.mock('./app.js', () => ({
  app: {
    listen,
  },
}));

describe('server', () => {
  const originalExit = process.exit;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    process.exit = vi.fn() as never;
    connectDatabase.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  async function importServer() {
    await import('./server.js');

    // Give the async startServer() a chance to finish.
    await new Promise((resolve) => setImmediate(resolve));
  }

  it('should connect to the database before starting the server', async () => {
    await importServer();

    expect(connectDatabase).toHaveBeenCalledTimes(1);
    expect(listen).toHaveBeenCalledTimes(1);
  });

  it('should start the server on the configured port', async () => {
    await importServer();

    expect(listen).toHaveBeenCalledWith(
      4000,
      expect.any(Function),
    );
  });

  it('should log when the server starts successfully', async () => {
    await importServer();

    const callback = listen.mock.calls[0]?.[1];

    expect(callback).toBeTypeOf('function');

    callback();

    expect(loggerInfo).toHaveBeenCalledWith(
      {
        port: 4000,
      },
      'Documan API started',
    );
  });

  it('should log an error when database connection fails', async () => {
    const error = new Error('Database connection failed');

    connectDatabase.mockRejectedValueOnce(error);

    await importServer();

    expect(loggerError).toHaveBeenCalledWith(
      {
        error,
      },
      'Failed to start Documan API',
    );
  });

  it('should exit with code 1 when startup fails', async () => {
    connectDatabase.mockRejectedValueOnce(
      new Error('Database connection failed'),
    );

    await importServer();

    expect(process.exit).toHaveBeenCalledWith(1);
  });
});