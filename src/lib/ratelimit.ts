import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// 5 requests por 10 minutos - para OTP
export const otpLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  prefix: "rl:otp",
})

// 10 requests por minuto - para endpoints generales
export const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "rl:api",
})

// 5 requests por minuto - para crear usuarios
export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "rl:auth",
})