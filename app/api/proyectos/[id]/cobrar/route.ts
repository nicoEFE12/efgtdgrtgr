import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

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
    // Get the project to find the client
    const projects = await sql`
      SELECT p.*, c.apellido_nombre as client_name
      FROM projects p
      JOIN clients c ON p.client_id = c.id
      WHERE p.id = ${id}
    `;

    if (projects.length === 0) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const project = projects[0];
    const clientId = project.client_id;
    const clientName = project.client_name;

    // 1. Register cobro in cuenta_corriente
    await sql`
      INSERT INTO cuenta_corriente (
        client_id, type, amount, payment_method, concept, date, notes, project_id, created_by
      ) VALUES (
        ${clientId}, 'cobro', ${body.amount}, ${body.payment_method},
        ${body.concept || 'Cobro cuota'},
        ${body.date || new Date().toISOString().split("T")[0]},
        ${body.notes || null}, ${id}, ${session.userId}
      )
    `;

    // 2. Register as ingreso in caja general
    await sql`
      INSERT INTO cash_movements (
        type, amount, payment_method, concept, category, client_id, project_id, date, notes, created_by
      ) VALUES (
        'ingreso', ${body.amount}, ${body.payment_method},
        ${`Cobro cuota: ${clientName} - ${project.nombre} - ${body.concept || 'Cuota'}`},
        'Cobro cliente', ${clientId}, ${id},
        ${body.date || new Date().toISOString().split("T")[0]},
        ${body.notes || null}, ${session.userId}
      )
    `;

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Error cobrar cuota:", error);
    return NextResponse.json(
      { error: "Error al registrar el cobro" },
      { status: 500 }
    );
  }
}
