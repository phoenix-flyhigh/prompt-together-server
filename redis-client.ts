import "dotenv/config";
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_DB_URL,
  port: Number(process.env.REDIS_DB_PORT),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
});

redis.on("error", (err) => console.log("Redis Client Error", err));

export default redis;
