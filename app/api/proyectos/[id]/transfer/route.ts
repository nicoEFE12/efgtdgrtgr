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
    // 1. Create egreso in cash_movements (salida de caja general)
    const cajaMovement = await sql`
      INSERT INTO cash_movements (
        type, amount, payment_method, concept, project_id, date, created_by
      ) VALUES (
        'egreso', ${body.amount}, ${body.payment_method},
        ${"Transferencia a obra: " + body.project_name},
        ${id}, ${body.date || new Date().toISOString().split("T")[0]},
        ${session.userId}
      )
      RETURNING *
    `;

    // 2. Create ingreso in project_cash_movements
    await sql`
      INSERT INTO project_cash_movements (
        project_id, type, amount, payment_method, concept, date,
        source_cash_movement_id, created_by
      ) VALUES (
        ${id}, 'transferencia_in', ${body.amount}, 'transferencia',
        ${"Transferencia desde Caja General (" + (body.payment_method === "banco" ? "Banco" : body.payment_method === "mercado_pago" ? "Mercado Pago" : body.payment_method === "efectivo_pesos" ? "Efectivo $" : body.payment_method === "efectivo_usd" ? "Efectivo USD" : "Cheque") + ")"},
        ${body.date || new Date().toISOString().split("T")[0]},
        ${cajaMovement[0].id}, ${session.userId}
      )
    `;

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Error transferring:", error);
    return NextResponse.json(
      { error: "Error al realizar la transferencia" },
      { status: 500 }
    );
  }
}
