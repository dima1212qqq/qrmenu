const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 30;

// Create a composite key from IP + sessionId to prevent spoofing
export function createRateLimitKey(ip: string, sessionId?: string): string {
  // If sessionId looks like a valid generated ID (not spoofed), include it
  // Generated IDs look like: session-1745...-randomString
  const hasValidSession = sessionId && sessionId.startsWith("session-") && sessionId.length > 20;
  if (hasValidSession) {
    return `${ip}:${sessionId}`;
  }
  return ip; // Fall back to IP-only if sessionId is missing or suspicious
}

export function checkRateLimit(key: string): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetIn: WINDOW_MS };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: MAX_REQUESTS - entry.count,
    resetIn: entry.resetTime - now,
  };
}

setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((entry, key) => {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  });
}, WINDOW_MS);