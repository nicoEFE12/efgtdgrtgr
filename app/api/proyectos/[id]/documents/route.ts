import { type NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getDb } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();

  try {
    const documents = await sql`
      SELECT id, project_id, category, filename, url, mime_type, created_at
      FROM project_documents
      WHERE project_id = ${id}
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Error al cargar documentos" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const category = formData.get("category") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó archivo" },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: "No se proporcionó categoría" },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const blob = await put(`proyectos/${id}/${category}/${file.name}`, file, {
      access: "public",
    });

    // Save reference in database
    const result = await sql`
      INSERT INTO project_documents (project_id, category, filename, url, mime_type)
      VALUES (${id}, ${category}, ${file.name}, ${blob.url}, ${file.type})
      RETURNING *
    `;

    return NextResponse.json({ document: result[0] });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Error al subir el archivo" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();

  try {
    const { documentId } = await request.json();

    // Get the document URL before deleting
    const docs = await sql`
      SELECT url FROM project_documents
      WHERE id = ${documentId} AND project_id = ${id}
    `;

    if (docs.length === 0) {
      return NextResponse.json(
        { error: "Documento no encontrado" },
        { status: 404 }
      );
    }

    // Delete from Vercel Blob
    try {
      await del(docs[0].url);
    } catch (blobError) {
      console.error("Blob delete error (continuing):", blobError);
    }

    // Delete from database
    await sql`
      DELETE FROM project_documents
      WHERE id = ${documentId} AND project_id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Error al eliminar el documento" },
      { status: 500 }
    );
  }
}
