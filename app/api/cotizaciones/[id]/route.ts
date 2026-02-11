import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const sql = getDb();
  try {
    const [quotation] = await sql`
      SELECT q.*, c.apellido_nombre as client_name, c.email as client_email, c.telefono as client_phone
      FROM quotations q
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE q.id = ${id}
    `;
    if (!quotation) {
      return NextResponse.json(
        { error: "Cotizacion no encontrada" },
        { status: 404 }
      );
    }

    const items = await sql`
      SELECT qi.*, st.nombre as service_name
      FROM quotation_items qi
      LEFT JOIN service_types st ON qi.service_type_id = st.id
      WHERE qi.quotation_id = ${id}
      ORDER BY qi.id
    `;

    return NextResponse.json({ quotation: { ...quotation, items } });
  } catch (error) {
    console.error("Error fetching quotation:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const sql = getDb();
  try {
    const body = await req.json();
    const { client_id, nombre, notas, estado, items, total_override } = body;

    // If only the status is being updated, do a simple update
    if (estado && Object.keys(body).length === 1) {
      await sql`
        UPDATE quotations
        SET estado = ${estado},
            updated_at = NOW()
        WHERE id = ${id}
      `;
      return NextResponse.json({ message: "Estado actualizado" });
    }

    let total = 0;
    let costo_total = 0;
    if (total_override) {
      total = total_override;
    } else if (items) {
      total = items.reduce(
        (sum: number, i: { subtotal: number }) => sum + (i.subtotal || 0),
        0
      );
    }
    if (items) {
      costo_total = items.reduce(
        (sum: number, i: { subtotal: number }) => sum + (i.subtotal || 0),
        0
      );
    }

    await sql`
      UPDATE quotations
      SET client_id = ${client_id || null},
          nombre = ${nombre},
          total = ${total},
          costo_total = ${costo_total},
          notas = ${notas || null},
          estado = ${estado || 'borrador'},
          updated_at = NOW()
      WHERE id = ${id}
    `;

    // Replace items
    await sql`DELETE FROM quotation_items WHERE quotation_id = ${id}`;

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
            ${id},
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating quotation:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const sql = getDb();
  try {
    await sql`DELETE FROM quotation_items WHERE quotation_id = ${id}`;
    await sql`DELETE FROM quotations WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting quotation:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
