import Bull from 'bull';
import { redisClient } from './redis';

// Create a new Bull queue for users
export const userQueue = new Bull('userQueue', {
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
  },
});
