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
  const currency = searchParams.get("currency") || "ARS";
  const sql = getDb();

  // Get balances for selected currency
  const balances = await sql`
    SELECT 
      payment_method,
      COALESCE(SUM(CASE WHEN type = 'ingreso' THEN amount ELSE 0 END), 0) as ingresos,
      COALESCE(SUM(CASE WHEN type = 'egreso' THEN amount ELSE 0 END), 0) as egresos
    FROM cash_movements
    WHERE currency = ${currency}
    GROUP BY payment_method
  `;

  // Get total money allocated in project cajas for selected currency
  const projectCajas = await sql`
    SELECT 
      COALESCE(SUM(CASE WHEN pcm.type IN ('ingreso', 'transferencia_in') THEN pcm.amount ELSE 0 END), 0) as total_ingresado,
      COALESCE(SUM(CASE WHEN pcm.type = 'egreso' THEN pcm.amount ELSE 0 END), 0) as total_gastado
    FROM project_cash_movements pcm
    WHERE pcm.currency = ${currency}
  `;
  const totalEnProyectos = Number(projectCajas[0].total_ingresado) - Number(projectCajas[0].total_gastado);

  // Get movements with filters
  let movements;
  if (from && to && method) {
    movements = await sql`
      SELECT cm.*, c.apellido_nombre as client_name, p.nombre as project_name, p.numero_contrato, pcm.project_id as linked_project_id, p2.nombre as linked_project_name, pcm.payment_method as linked_project_payment_method
      FROM cash_movements cm
      LEFT JOIN project_cash_movements pcm ON pcm.source_cash_movement_id = cm.id
      LEFT JOIN projects p ON cm.project_id = p.id
      LEFT JOIN projects p2 ON pcm.project_id = p2.id
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE cm.date >= ${from} AND cm.date <= ${to} AND cm.payment_method = ${method} AND cm.currency = ${currency}
      ORDER BY cm.date DESC, cm.created_at DESC
    `;
  } else if (from && to) {
    movements = await sql`
      SELECT cm.*, c.apellido_nombre as client_name, p.nombre as project_name, p.numero_contrato, pcm.project_id as linked_project_id, p2.nombre as linked_project_name, pcm.payment_method as linked_project_payment_method
      FROM cash_movements cm
      LEFT JOIN project_cash_movements pcm ON pcm.source_cash_movement_id = cm.id
      LEFT JOIN projects p ON cm.project_id = p.id
      LEFT JOIN projects p2 ON pcm.project_id = p2.id
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE cm.date >= ${from} AND cm.date <= ${to} AND cm.currency = ${currency}
      ORDER BY cm.date DESC, cm.created_at DESC
    `;
  } else if (method) {
    movements = await sql`
      SELECT cm.*, c.apellido_nombre as client_name, p.nombre as project_name, p.numero_contrato, pcm.project_id as linked_project_id, p2.nombre as linked_project_name, pcm.payment_method as linked_project_payment_method
      FROM cash_movements cm
      LEFT JOIN project_cash_movements pcm ON pcm.source_cash_movement_id = cm.id
      LEFT JOIN projects p ON cm.project_id = p.id
      LEFT JOIN projects p2 ON pcm.project_id = p2.id
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE cm.payment_method = ${method} AND cm.currency = ${currency}
      ORDER BY cm.date DESC, cm.created_at DESC
      LIMIT 100
    `;
  } else {
    movements = await sql`
      SELECT cm.*, c.apellido_nombre as client_name, p.nombre as project_name, p.numero_contrato, pcm.project_id as linked_project_id, p2.nombre as linked_project_name, pcm.payment_method as linked_project_payment_method
      FROM cash_movements cm
      LEFT JOIN project_cash_movements pcm ON pcm.source_cash_movement_id = cm.id
      LEFT JOIN projects p ON cm.project_id = p.id
      LEFT JOIN projects p2 ON pcm.project_id = p2.id
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE cm.currency = ${currency}
      ORDER BY cm.date DESC, cm.created_at DESC
      LIMIT 100
    `;
  }

  return NextResponse.json({ balances, movements, totalEnProyectos });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const sql = getDb();

    // Determine currency based on payment_method if not specified
    let currency = body.currency || "ARS";
    if (body.payment_method === "efectivo_usd") {
      currency = "USD";
    }

    // USD savings account: forbid project assignments
    if (currency === "USD" && body.project_id) {
      return NextResponse.json(
        { error: "La Caja de Ahorros en Dólares no puede asignar dinero a proyectos" },
        { status: 400 }
      );
    }

    // If linked to a project, resolve client from the project
    let resolvedClientId: number | null = null;
    let projectInfo: { client_id: number; nombre: string; apellido_nombre: string } | null = null;

    if (body.project_id) {
      const projects = await sql`
        SELECT p.client_id, p.nombre, c.apellido_nombre
        FROM projects p
        JOIN clients c ON p.client_id = c.id
        WHERE p.id = ${body.project_id}
      `;
      if (projects.length > 0) {
        projectInfo = projects[0];
        resolvedClientId = projects[0].client_id;
      }
    }

    const result = await sql`
      INSERT INTO cash_movements (
        type, amount, payment_method, concept, category,
        project_id, date, notes, created_by, currency, exchange_rate
      ) VALUES (
        ${body.type}, ${body.amount}, ${body.payment_method},
        ${body.concept}, ${body.category || null},
        ${body.project_id || null},
        ${body.date || new Date().toISOString().split("T")[0]},
        ${body.notes || null}, ${session.userId}, ${currency}, ${body.exchange_rate || 1.0}
      )
      RETURNING *
    `;

    // If an ingreso is linked to a project, also record it in project_cash_movements
    // so the project caja balance reflects this income
    if (body.type === 'ingreso' && body.project_id && projectInfo) {
      await sql`
        INSERT INTO project_cash_movements (
          project_id, type, amount, payment_method, concept, date, notes, created_by, currency, exchange_rate
        ) VALUES (
          ${body.project_id}, 'ingreso', ${body.amount}, ${body.payment_method},
          ${body.concept || `Cobro - ${projectInfo.nombre}`},
          ${body.date || new Date().toISOString().split("T")[0]},
          ${body.notes || null}, ${session.userId}, ${currency}, ${body.exchange_rate || 1.0}
        )
      `;
    }

    // If this is an EGRESO from USD and the frontend requested conversion -> create ARS ingreso
    let counterpart: any = null;
    if (body.type === 'egreso' && currency === 'USD' && body.convert_to_ars) {
      // compute ARS amount: prefer supplied ars_amount, otherwise amount * exchange_rate
      const arsAmount = body.ars_amount ? Number(body.ars_amount) : (Number(body.amount) * Number(body.exchange_rate || 1));
      const arsRes = await sql`
        INSERT INTO cash_movements (
          type, amount, payment_method, concept, category, project_id, date, notes, created_by, currency, exchange_rate
        ) VALUES (
          'ingreso', ${arsAmount}, 'efectivo_pesos', ${body.concept ? `Converted - ${body.concept}` : 'Conversion from USD Egreso'}, ${body.category || null}, ${null}, ${body.date || new Date().toISOString().split("T")[0]}, ${body.notes || null}, ${session.userId}, 'ARS', ${body.exchange_rate || 1.0}
        ) RETURNING *
      `;
      counterpart = arsRes[0];
    }

    return NextResponse.json({ movement: result[0], counterpart }, { status: 201 });
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }
    
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
