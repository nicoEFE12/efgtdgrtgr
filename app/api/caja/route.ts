import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const method = searchParams.get("method");
  const sql = getDb();

  // Get balances
  const balances = await sql`
    SELECT 
      payment_method,
      COALESCE(SUM(CASE WHEN type = 'ingreso' THEN amount ELSE 0 END), 0) as ingresos,
      COALESCE(SUM(CASE WHEN type = 'egreso' THEN amount ELSE 0 END), 0) as egresos
    FROM cash_movements
    GROUP BY payment_method
  `;

  // Get movements with filters
  let movements;
  if (from && to && method) {
    movements = await sql`
      SELECT cm.*, c.apellido_nombre as client_name, p.nombre as project_name
      FROM cash_movements cm
      LEFT JOIN clients c ON cm.client_id = c.id
      LEFT JOIN projects p ON cm.project_id = p.id
      WHERE cm.date >= ${from} AND cm.date <= ${to} AND cm.payment_method = ${method}
      ORDER BY cm.date DESC, cm.created_at DESC
    `;
  } else if (from && to) {
    movements = await sql`
      SELECT cm.*, c.apellido_nombre as client_name, p.nombre as project_name
      FROM cash_movements cm
      LEFT JOIN clients c ON cm.client_id = c.id
      LEFT JOIN projects p ON cm.project_id = p.id
      WHERE cm.date >= ${from} AND cm.date <= ${to}
      ORDER BY cm.date DESC, cm.created_at DESC
    `;
  } else if (method) {
    movements = await sql`
      SELECT cm.*, c.apellido_nombre as client_name, p.nombre as project_name
      FROM cash_movements cm
      LEFT JOIN clients c ON cm.client_id = c.id
      LEFT JOIN projects p ON cm.project_id = p.id
      WHERE cm.payment_method = ${method}
      ORDER BY cm.date DESC, cm.created_at DESC
      LIMIT 100
    `;
  } else {
    movements = await sql`
      SELECT cm.*, c.apellido_nombre as client_name, p.nombre as project_name
      FROM cash_movements cm
      LEFT JOIN clients c ON cm.client_id = c.id
      LEFT JOIN projects p ON cm.project_id = p.id
      ORDER BY cm.date DESC, cm.created_at DESC
      LIMIT 100
    `;
  }

  return NextResponse.json({ balances, movements });
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
      INSERT INTO cash_movements (
        type, amount, payment_method, concept, category,
        client_id, project_id, date, notes, created_by
      ) VALUES (
        ${body.type}, ${body.amount}, ${body.payment_method},
        ${body.concept}, ${body.category || null},
        ${body.client_id || null}, ${body.project_id || null},
        ${body.date || new Date().toISOString().split("T")[0]},
        ${body.notes || null}, ${session.userId}
      )
      RETURNING *
    `;

    return NextResponse.json({ movement: result[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating cash movement:", error);
    return NextResponse.json(
      { error: "Error al registrar el movimiento" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    const sql = getDb();
    await sql`DELETE FROM cash_movements WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting cash movement:", error);
    return NextResponse.json(
      { error: "Error al eliminar el movimiento" },
      { status: 500 }
    );
  }
}
