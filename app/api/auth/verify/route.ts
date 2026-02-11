import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=Token inválido", request.url));
  }

  const sql = getDb();

  try {
    // Find valid token
    const tokens = await sql`
      SELECT evt.*, u.email, u.name, u.id as uid
      FROM email_verification_tokens evt
      JOIN users u ON evt.user_id = u.id
      WHERE evt.token = ${token}
      AND evt.expires_at > NOW()
      AND evt.used = FALSE
    `;

    if (tokens.length === 0) {
      return NextResponse.redirect(
        new URL("/login?error=El enlace de verificación expiró o ya fue usado", request.url)
      );
    }

    const verificationToken = tokens[0];

    // Mark token as used
    await sql`
      UPDATE email_verification_tokens SET used = TRUE WHERE id = ${verificationToken.id}
    `;

    // Mark user as verified
    await sql`
      UPDATE users SET email_verified = TRUE WHERE id = ${verificationToken.uid}
    `;

    // Auto-login the user
    await createSession(verificationToken.uid);

    return NextResponse.redirect(new URL("/dashboard?verified=true", request.url));
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.redirect(new URL("/login?error=Error al verificar", request.url));
  }
}
