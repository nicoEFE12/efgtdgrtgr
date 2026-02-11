import crypto from "crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const verify = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return hash === verify;
}

export function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

export async function createSession(userId: number): Promise<string> {
  const sql = getDb();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await sql`
    INSERT INTO sessions (user_id, token, expires_at)
    VALUES (${userId}, ${token}, ${expiresAt.toISOString()})
  `;

  const cookieStore = await cookies();
  cookieStore.set("session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (!token) return null;

  const sql = getDb();
  const sessions = await sql`
    SELECT s.*, u.name, u.email, u.role
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ${token}
    AND s.expires_at > NOW()
  `;

  if (sessions.length === 0) return null;

  return {
    userId: sessions[0].user_id as number,
    name: sessions[0].name as string,
    email: sessions[0].email as string,
    role: sessions[0].role as string,
  };
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (token) {
    const sql = getDb();
    await sql`DELETE FROM sessions WHERE token = ${token}`;
    cookieStore.delete("session_token");
  }
}
