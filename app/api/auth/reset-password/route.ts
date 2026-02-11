import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token y contraseña son requeridos" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Find valid token
    const tokens = await sql`
      SELECT prt.*, u.id as uid
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.id
      WHERE prt.token = ${token}
      AND prt.expires_at > NOW()
      AND prt.used = FALSE
    `;

    if (tokens.length === 0) {
      return NextResponse.json(
        { error: "El enlace expiró o ya fue usado. Solicitá uno nuevo." },
        { status: 400 }
      );
    }

    const resetToken = tokens[0];

    // Update password
    const passwordHash = hashPassword(password);
    await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${resetToken.uid}`;

    // Mark token as used
    await sql`UPDATE password_reset_tokens SET used = TRUE WHERE id = ${resetToken.id}`;

    return NextResponse.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
