import { type NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();

  try {
    const movements = await sql`
      SELECT cc.*, p.nombre as project_name
      FROM cuenta_corriente cc
      LEFT JOIN projects p ON cc.project_id = p.id
      WHERE cc.client_id = ${id}
      ORDER BY cc.date DESC, cc.created_at DESC
    `;

    // Calculate balance: cobros (positive) - cargos (negative)
    const summary = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'cobro' THEN amount ELSE 0 END), 0) as total_cobrado,
        COALESCE(SUM(CASE WHEN type = 'cargo' THEN amount ELSE 0 END), 0) as total_cargado
      FROM cuenta_corriente
      WHERE client_id = ${id}
    `;

    const totalCobrado = Number(summary[0].total_cobrado);
    const totalCargado = Number(summary[0].total_cargado);

    return NextResponse.json({
      movements,
      summary: {
        total_cobrado: totalCobrado,
        total_cargado: totalCargado,
        saldo: totalCobrado - totalCargado,
      },
    });
  } catch (error) {
    console.error("Error fetching cuenta corriente:", error);
    return NextResponse.json(
      { error: "Error al cargar cuenta corriente" },
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
    const body = await request.json();
    const {
      type,
      amount,
      payment_method,
      concept,
      date,
      notes,
      project_id,
    } = body;

    if (!type || !amount || !concept) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO cuenta_corriente (client_id, type, amount, payment_method, concept, date, notes, project_id)
      VALUES (${id}, ${type}, ${amount}, ${payment_method || null}, ${concept}, ${date || new Date().toISOString().split("T")[0]}, ${notes || null}, ${project_id || null})
      RETURNING *
    `;

    // If it's a cobro, also register it as an ingreso in caja general
    if (type === "cobro") {
      const client = await sql`SELECT apellido_nombre FROM clients WHERE id = ${id}`;
      const clientName = client[0]?.apellido_nombre || "Cliente";

      await sql`
        INSERT INTO cash_movements (type, amount, payment_method, concept, category, client_id, date, notes)
        VALUES ('ingreso', ${amount}, ${payment_method || "banco"}, ${`Cobro CC: ${clientName} - ${concept}`}, 'Cobro cliente', ${id}, ${date || new Date().toISOString().split("T")[0]}, ${notes || null})
      `;
    }

    return NextResponse.json({ movement: result[0] });
  } catch (error) {
    console.error("Error creating CC movement:", error);
    return NextResponse.json(
      { error: "Error al registrar movimiento" },
      { status: 500 }
    );
  }
}
