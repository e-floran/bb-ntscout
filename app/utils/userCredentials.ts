import { User } from "@/app/types/mainTypes";

// In-memory storage for user credentials during their session
export const userCredentials = new Map<
  string,
  { login: string; password: string; timestamp: number; user: User }
>();

// Clean up expired credentials (older than 4 hours)
const CREDENTIAL_EXPIRY = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
export function cleanupExpiredCredentials() {
  const now = Date.now();
  for (const [sessionId, data] of userCredentials.entries()) {
    if (now - data.timestamp > CREDENTIAL_EXPIRY) {
      userCredentials.delete(sessionId);
    }
  }
}
