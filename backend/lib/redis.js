import Redis from "ioredis"
import dotenv from "dotenv";

dotenv.config();

export const redis = new Redis(process.env.UPSTASH_REDIS_URL);

redis.on("error", (error) => {
  console.error("Redis connection error:", error.message);
});

// await redis.set('foo','bar');