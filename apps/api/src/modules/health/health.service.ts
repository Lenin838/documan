import mongoose from 'mongoose';

export function getHealthStatus() {
  const dbConnected = mongoose.connection?.readyState === 1;
  return {
    status: dbConnected ? 'ok' : 'degraded',
    service: 'documan-api',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: dbConnected ? 'connected' : 'disconnected',
  };
}

export function getReadinessStatus() {
  const dbConnected = mongoose.connection?.readyState === 1;
  return {
    ready: dbConnected,
    database: dbConnected ? 'connected' : 'disconnected',
  };
}

export function getLivenessStatus() {
  return {
    live: true,
  };
}
