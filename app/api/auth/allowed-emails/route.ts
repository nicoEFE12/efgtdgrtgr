import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET - List all allowed emails
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sql = getDb();
    const emails = await sql`
      SELECT id, email, role, created_at
      FROM allowed_emails
      ORDER BY created_at DESC
    `;

    return NextResponse.json(emails);
  } catch (error) {
    console.error("Error fetching allowed emails:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// POST - Add a new allowed email
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { email, role } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const validRoles = ["admin", "user", "viewer"];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    const sql = getDb();

    // Check if already exists
    const existing = await sql`
      SELECT id FROM allowed_emails WHERE LOWER(email) = LOWER(${email})
    `;
    if (existing.length > 0) {
      return NextResponse.json({ error: "Este email ya está en la lista" }, { status: 409 });
    }

    const result = await sql`
      INSERT INTO allowed_emails (email, role)
      VALUES (LOWER(${email}), ${role || "user"})
      RETURNING id, email, role, created_at
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error adding allowed email:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// DELETE - Remove an allowed email
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const sql = getDb();

    // Don't allow removing own email
    const emailRow = await sql`SELECT email FROM allowed_emails WHERE id = ${id}`;
    if (emailRow.length > 0 && emailRow[0].email === session.email?.toLowerCase()) {
      return NextResponse.json({ error: "No podés eliminar tu propio email" }, { status: 400 });
    }

    await sql`DELETE FROM allowed_emails WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting allowed email:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
