import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sql = getDb();
  try {
    const quotations = await sql`
      SELECT q.*, c.apellido_nombre as client_name
      FROM quotations q
      LEFT JOIN clients c ON q.client_id = c.id
      ORDER BY q.created_at DESC
    `;
    return NextResponse.json({ quotations });
  } catch (error) {
    console.error("Error fetching quotations:", error);
    return NextResponse.json(
      { error: "Error fetching quotations" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sql = getDb();
  try {
    const body = await req.json();
    const { client_id, nombre, notas, items, estado, total_override } = body;

    // Calculate total from items or use override (with margin)
    let total = 0;
    if (total_override) {
      total = total_override;
    } else if (items) {
      total = items.reduce(
        (sum: number, i: { subtotal: number }) => sum + (i.subtotal || 0),
        0
      );
    }

    const costo_total = items.reduce(
      (sum: number, i: { subtotal: number }) => sum + (i.subtotal || 0),
      0
    );

    const [quotation] = await sql`
      INSERT INTO quotations (client_id, nombre, total, costo_total, estado, notas, created_by)
      VALUES (${client_id || null}, ${nombre}, ${total}, ${costo_total}, ${estado || 'borrador'}, ${notas || null}, ${session.userId})
      RETURNING *
    `;

    if (items && items.length > 0) {
      for (const item of items) {
        await sql`
          INSERT INTO quotation_items (
            quotation_id, 
            service_type_id, 
            descripcion, 
            m2, 
            unidad,
            dias_estimados, 
            costo_materiales, 
            costo_mano_obra, 
            costo_fijos_prorrateados, 
            subtotal
          )
          VALUES (
            ${quotation.id},
            ${item.service_type_id || null},
            ${item.descripcion},
            ${item.m2 || null},
            ${item.unidad || 'm2'},
            ${item.dias_estimados || null},
            ${item.costo_materiales || 0},
            ${item.costo_mano_obra || 0},
            ${item.costo_fijos_prorrateados || 0},
            ${item.subtotal || 0}
          )
        `;
      }
    }

    return NextResponse.json({ quotation }, { status: 201 });
  } catch (error) {
    console.error("Error creating quotation:", error);
    return NextResponse.json(
      { error: "Error creating quotation" },
      { status: 500 }
    );
  }
}
