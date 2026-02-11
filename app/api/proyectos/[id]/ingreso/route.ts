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
    await sql`
      INSERT INTO project_cash_movements (
        project_id, type, amount, payment_method, concept, category, date, notes, created_by
      ) VALUES (
        ${id}, 'ingreso', ${body.amount}, ${body.payment_method},
        ${body.concept}, ${body.category || null},
        ${body.date || new Date().toISOString().split("T")[0]},
        ${body.notes || null}, ${session.userId}
      )
    `;

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Error creating ingreso:", error);
    return NextResponse.json(
      { error: "Error al registrar el ingreso" },
      { status: 500 }
    );
  }
}