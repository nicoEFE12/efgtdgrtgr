import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email es requerido" },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Find user
    const users = await sql`SELECT * FROM users WHERE LOWER(email) = LOWER(${email})`;

    // Always return success to prevent email enumeration
    if (users.length === 0) {
      return NextResponse.json({
        message: "Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña.",
      });
    }

    const user = users[0];

    // Generate reset token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate previous tokens
    await sql`
      UPDATE password_reset_tokens SET used = TRUE 
      WHERE user_id = ${user.id} AND used = FALSE
    `;

    await sql`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (${user.id}, ${token}, ${expiresAt.toISOString()})
    `;

    // Send email
    try {
      await sendPasswordResetEmail(email, token, user.name);
    } catch (emailErr) {
      console.error("Error sending reset email:", emailErr);
    }

    return NextResponse.json({
      message: "Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
