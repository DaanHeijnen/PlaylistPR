export function getEnv(name: string, fallback?: string) {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
export const sessionCookieName = () => process.env.SESSION_COOKIE_NAME || "playlist_pr_session";
