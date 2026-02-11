import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword, createSession, generateToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contrasena son requeridos" },
        { status: 400 }
      );
    }

    const sql = getDb();
    const users = await sql`SELECT * FROM users WHERE LOWER(email) = LOWER(${email})`;

    if (users.length === 0) {
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    const user = users[0];
    const isValid = verifyPassword(password, user.password_hash);

    if (!isValid) {
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    // Check email verification
    if (!user.email_verified) {
      // Resend verification email
      try {
        const token = generateToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await sql`
          INSERT INTO email_verification_tokens (user_id, token, expires_at)
          VALUES (${user.id}, ${token}, ${expiresAt.toISOString()})
        `;
        await sendVerificationEmail(email, token, user.name);
      } catch (e) {
        console.error("Error resending verification:", e);
      }

      return NextResponse.json(
        { error: "Tu email no está verificado. Te reenviamos el link de verificación." },
        { status: 403 }
      );
    }

    await createSession(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
