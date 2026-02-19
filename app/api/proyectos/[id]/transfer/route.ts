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
    const projectId = parseInt(id);
    const amount = body.amount;
    const transferType = body.transfer_type || "from_general";
    const concept = body.concept || "Transferencia de fondos";
    const notes = body.notes || null;
    const date = body.date || new Date().toISOString().split("T")[0];

    if (transferType === "from_general") {
      // Transfer from general cash to this project
      const paymentMethodLabel = {
        banco: "Banco",
        mercado_pago: "Mercado Pago",
        efectivo_pesos: "Efectivo $",
        efectivo_usd: "Efectivo USD",
        cheque: "Cheque",
      }[body.from_payment_method] || body.from_payment_method;

      // 1. Create egreso in cash_movements (salida de caja general)
      const cajaMovement = await sql`
        INSERT INTO cash_movements (
          type, amount, payment_method, concept, project_id, date, notes, created_by
        ) VALUES (
          'egreso', ${amount}, ${body.from_payment_method},
          ${concept}, ${projectId}, ${date}, ${notes}, ${session.userId}
        )
        RETURNING *
      `;

      // 2. Create ingreso in project_cash_movements
      await sql`
        INSERT INTO project_cash_movements (
          project_id, type, amount, payment_method, concept, date, notes,
          source_cash_movement_id, created_by
        ) VALUES (
          ${projectId}, 'transferencia_in', ${amount}, 'transferencia',
          ${concept}, ${date}, ${notes},
          ${cajaMovement[0].id}, ${session.userId}
        )
      `;
    } else if (transferType === "between_projects") {
      // Transfer between two projects
      // projectId is the SOURCE (where money is being taken from)
      // body.to_project_id is the DESTINATION (where money is going to)
      const toProjectId = body.to_project_id;

      if (!toProjectId) {
        return NextResponse.json(
          { error: "Proyecto destino requerido" },
          { status: 400 }
        );
      }

      if (toProjectId === projectId) {
        return NextResponse.json(
          { error: "No se puede transferir a la misma obra" },
          { status: 400 }
        );
      }

      // Verify both projects exist
      const projects = await sql`
        SELECT id, nombre FROM projects WHERE id IN (${projectId}, ${toProjectId})
      `;

      if (projects.length !== 2) {
        return NextResponse.json(
          { error: "Una o ambas obras no existen" },
          { status: 404 }
        );
      }

      const sourceProject = projects.find((p: any) => p.id === projectId);
      const destinationProject = projects.find((p: any) => p.id === toProjectId);

      // 1. Create egreso in source project (the current project we're in)
      const egresoMovement = await sql`
        INSERT INTO project_cash_movements (
          project_id, type, amount, payment_method, concept, date, notes, created_by
        ) VALUES (
          ${projectId}, 'egreso', ${amount}, 'transferencia',
          ${`Transferencia a ${destinationProject.nombre}: ${concept}`}, ${date}, ${notes}, ${session.userId}
        )
        RETURNING *
      `;

      // 2. Create ingreso in destination project
      await sql`
        INSERT INTO project_cash_movements (
          project_id, type, amount, payment_method, concept, date, notes, created_by
        ) VALUES (
          ${toProjectId}, 'transferencia_in', ${amount}, 'transferencia',
          ${`Transferencia desde ${sourceProject.nombre}: ${concept}`}, ${date}, ${notes}, ${session.userId}
        )
      `;
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Error transferring:", error);
    return NextResponse.json(
      { error: "Error al realizar la transferencia" },
      { status: 500 }
    );
  }
}

