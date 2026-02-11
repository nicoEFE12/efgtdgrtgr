import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword, generateToken, createSession } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nombre, email y contraseña son requeridos" },
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

    // Check if email is in the allowed_emails whitelist
    const allowed = await sql`
      SELECT * FROM allowed_emails WHERE LOWER(email) = LOWER(${email})
    `;

    if (allowed.length === 0) {
      return NextResponse.json(
        { error: "Este email no está autorizado para registrarse. Contactá al administrador." },
        { status: 403 }
      );
    }

    // Check if user already exists
    const existing = await sql`SELECT id FROM users WHERE LOWER(email) = LOWER(${email})`;
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con este email" },
        { status: 409 }
      );
    }

    // Create user
    const passwordHash = hashPassword(password);
    const role = allowed[0].role || "user";

    const result = await sql`
      INSERT INTO users (name, email, password_hash, role, email_verified)
      VALUES (${name}, ${email.toLowerCase()}, ${passwordHash}, ${role}, FALSE)
      RETURNING id, name, email, role
    `;

    const user = result[0];

    // Generate verification token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await sql`
      INSERT INTO email_verification_tokens (user_id, token, expires_at)
      VALUES (${user.id}, ${token}, ${expiresAt.toISOString()})
    `;

    // Send verification email
    try {
      await sendVerificationEmail(email, token, name);
    } catch (emailErr) {
      console.error("Error sending verification email:", emailErr);
      // Still create the account, just warn
    }

    return NextResponse.json({
      message: "Cuenta creada. Revisá tu email para verificar tu cuenta.",
      user: { id: user.id, name: user.name, email: user.email },
    }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
