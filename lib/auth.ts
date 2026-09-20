import type { NextApiRequest } from "next";

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
const COOKIE = "schemasafe_token";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const AUTH_COOKIE = COOKIE;
export const AUTH_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 30 * 24 * 3600,
  secure: process.env.NODE_ENV === "production",
};

export interface SessionPayload {
  sub: string;
  email: string;
  role: "user" | "admin";
}

export function getUserFromRequest(req: NextApiRequest): SessionPayload | null {
  const cookieTok = req.cookies?.[COOKIE];
  const headerTok = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const token = cookieTok || headerTok;
  if (!token) return null;
  try {
    const d = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    if (d && d.sub && d.email) return d as SessionPayload;
  } catch {}
  return null;
}

export function getAdminFromRequest(req: NextApiRequest): SessionPayload | null {
  const s = getUserFromRequest(req);
  if (!s || s.role !== "admin") return null;
  return s;
}