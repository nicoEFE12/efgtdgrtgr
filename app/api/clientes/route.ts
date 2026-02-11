import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const sql = getDb();

  let clients;
  if (search) {
    const searchTerm = `%${search}%`;
    clients = await sql`
      SELECT * FROM clients 
      WHERE apellido_nombre ILIKE ${searchTerm} 
        OR numero_contrato ILIKE ${searchTerm}
        OR dni ILIKE ${searchTerm}
      ORDER BY created_at DESC
    `;
  } else {
    clients = await sql`SELECT * FROM clients ORDER BY created_at DESC`;
  }

  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const sql = getDb();

    const result = await sql`
      INSERT INTO clients (
        apellido_nombre, numero_contrato, dni, domicilio_legal, domicilio_obra,
        telefono, email, presupuesto_observacion, fecha_alta, denominacion,
        plan_pago, observaciones, tiempo_obra_estimado, agenda_inicio, agenda_cierre
      ) VALUES (
        ${body.apellido_nombre}, ${body.numero_contrato}, ${body.dni},
        ${body.domicilio_legal}, ${body.domicilio_obra},
        ${body.telefono || null}, ${body.email || null},
        ${body.presupuesto_observacion || null},
        ${body.fecha_alta || new Date().toISOString().split("T")[0]},
        ${body.denominacion || null}, ${body.plan_pago || null},
        ${body.observaciones || null}, ${body.tiempo_obra_estimado || null},
        ${body.agenda_inicio || null}, ${body.agenda_cierre || null}
      )
      RETURNING *
    `;

    return NextResponse.json({ client: result[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: "Error al crear el cliente" },
      { status: 500 }
    );
  }
}
