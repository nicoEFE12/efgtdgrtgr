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
  const clients = await sql`SELECT * FROM clients WHERE id = ${id}`;

  if (clients.length === 0) {
    return NextResponse.json(
      { error: "Cliente no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json({ client: clients[0] });
}

export async function PUT(
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
      UPDATE clients SET
        apellido_nombre = ${body.apellido_nombre},
        numero_contrato = ${body.numero_contrato},
        dni = ${body.dni},
        domicilio_legal = ${body.domicilio_legal},
        domicilio_obra = ${body.domicilio_obra},
        telefono = ${body.telefono || null},
        email = ${body.email || null},
        presupuesto_observacion = ${body.presupuesto_observacion || null},
        fecha_alta = ${body.fecha_alta},
        denominacion = ${body.denominacion || null},
        plan_pago = ${body.plan_pago || null},
        observaciones = ${body.observaciones || null},
        tiempo_obra_estimado = ${body.tiempo_obra_estimado || null},
        agenda_inicio = ${body.agenda_inicio || null},
        agenda_cierre = ${body.agenda_cierre || null},
        estado = ${body.estado || "activo"},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ client: result[0] });
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: "Error al actualizar el cliente" },
      { status: 500 }
    );
  }
}
