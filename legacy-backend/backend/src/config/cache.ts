import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Redis client configuration
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    retryStrategy: (times) => {
        if (times > 3) {
            return null; // Stop retrying
        }
        return Math.min(times * 100, 3000);
    },
});

redis.on('error', (err: Error) => {
    console.error('Redis connection error:', err);
});

redis.on('connect', () => {
    console.log('Connected to Redis');
});

// Cache helper functions
export async function getCached<T>(key: string): Promise<T | null> {
    try {
        const cached = await redis.get(key);
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        console.error('Cache get error:', error);
        return null;
    }
}

export async function setCache(key: string, data: unknown, ttlSeconds: number = 3600): Promise<void> {
    try {
        await redis.setex(key, ttlSeconds, JSON.stringify(data));
    } catch (error) {
        console.error('Cache set error:', error);
    }
}

export async function invalidateCache(pattern: string): Promise<void> {
    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } catch (error) {
        console.error('Cache invalidation error:', error);
    }
}

export async function invalidatePattern(pattern: string): Promise<void> {
    return invalidateCache(pattern);
}

// Cache keys generator for consistent naming
export const CacheKeys = {
    user: (id: number) => `user:${id}`,
    userProfile: (id: number) => `user:${id}:profile`,
    projects: (userId: number) => `projects:${userId}`,
    project: (id: number) => `project:${id}`,
    scholarships: () => 'scholarships:all',
    recommendations: (userId: number) => `recommendations:${userId}`,
    gallery: (userId: number) => `gallery:${userId}`,
    achievements: (userId: number) => `achievements:${userId}`,
    studentContext: (userId: number) => `ai:context:${userId}`,
};

export default redis;
