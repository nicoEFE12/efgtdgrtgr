import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { put, del } from "@vercel/blob";

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

  const attachments = await sql`
    SELECT a.*, u.name as created_by_name
    FROM client_attachments a
    LEFT JOIN users u ON a.created_by = u.id
    WHERE a.client_id = ${id}
    ORDER BY a.created_at DESC
  `;

  return NextResponse.json({ attachments });
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
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }

  const sql = getDb();

  try {
    // Upload to Vercel Blob
    const blob = await put(
      `clients/${id}/${Date.now()}-${file.name}`,
      file,
      {
        access: "public",
      }
    );

    // Save to database
    const result = await sql`
      INSERT INTO client_attachments (
        client_id,
        filename,
        original_filename,
        url,
        mime_type,
        file_size,
        created_by
      )
      VALUES (
        ${id},
        ${blob.pathname},
        ${file.name},
        ${blob.url},
        ${file.type},
        ${file.size},
        ${session.userId}
      )
      RETURNING *
    `;

    return NextResponse.json({ attachment: result[0] });
  } catch (error) {
    console.error("Error uploading attachment:", error);
    return NextResponse.json(
      { error: "Error al subir el archivo" },
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
  const attachmentId = searchParams.get("attachmentId");

  if (!attachmentId) {
    return NextResponse.json(
      { error: "ID de archivo requerido" },
      { status: 400 }
    );
  }

  const sql = getDb();

  try {
    // Get attachment info
    const attachments = await sql`
      SELECT * FROM client_attachments WHERE id = ${attachmentId}
    `;

    if (attachments.length === 0) {
      return NextResponse.json(
        { error: "Archivo no encontrado" },
        { status: 404 }
      );
    }

    const attachment = attachments[0];

    // Delete from Vercel Blob
    try {
      await del(attachment.url);
    } catch (blobError) {
      console.error("Error deleting from blob:", blobError);
      // Continue even if blob deletion fails
    }

    // Delete from database
    await sql`DELETE FROM client_attachments WHERE id = ${attachmentId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return NextResponse.json(
      { error: "Error al eliminar el archivo" },
      { status: 500 }
    );
  }
}
