import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const sql = getDb();

  const notes = await sql`
    SELECT n.*, u.name as created_by_name
    FROM client_notes n
    LEFT JOIN users u ON n.created_by = u.id
    WHERE n.client_id = ${id}
    ORDER BY n.created_at DESC
  `;

  return NextResponse.json({ notes });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const sql = getDb();

  try {
    const result = await sql`
      INSERT INTO client_notes (client_id, content, created_by)
      VALUES (${id}, ${body.content}, ${session.userId})
      RETURNING *
    `;

    return NextResponse.json({ note: result[0] });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { error: "Error al crear la nota" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const noteId = searchParams.get("noteId");

  if (!noteId) {
    return NextResponse.json(
      { error: "ID de nota requerido" },
      { status: 400 }
    );
  }

  const sql = getDb();

  try {
    await sql`DELETE FROM client_notes WHERE id = ${noteId}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: "Error al eliminar la nota" },
      { status: 500 }
    );
  }
}
