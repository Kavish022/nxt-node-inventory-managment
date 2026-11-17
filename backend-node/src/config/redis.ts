import Redis from 'ioredis';
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
redisConnection.on('connect', () => {
  console.log('⚡ Connected to Redis (Queue & Pub/Sub)');
});
redisConnection.on('error', (err) => {
  console.warn('Redis Connection Warning:', err.message);
});