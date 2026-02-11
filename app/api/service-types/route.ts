import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sql = getDb();
  const serviceTypes = await sql`
    SELECT st.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', stm.id,
            'material_id', stm.material_id,
            'cantidad_por_m2', stm.cantidad_por_m2,
            'material_nombre', m.nombre,
            'material_precio', m.precio_unitario,
            'material_unidad', m.unidad
          )
        ) FILTER (WHERE stm.id IS NOT NULL),
        '[]'
      ) as materiales
    FROM service_types st
    LEFT JOIN service_type_materials stm ON stm.service_type_id = st.id
    LEFT JOIN materials m ON m.id = stm.material_id
    GROUP BY st.id
    ORDER BY st.nombre
  `;

  return NextResponse.json({ serviceTypes });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const sql = getDb();

    const [serviceType] = await sql`
      INSERT INTO service_types (nombre, descripcion, rendimiento_m2_dia, costo_mano_obra_dia, incluye_cargas_sociales, porcentaje_cargas)
      VALUES (
        ${body.nombre},
        ${body.descripcion || null},
        ${body.rendimiento_m2_dia || null},
        ${body.costo_mano_obra_dia || null},
        ${body.incluye_cargas_sociales || false},
        ${body.porcentaje_cargas || 0}
      )
      RETURNING *
    `;

    // Insert materials
    if (body.materiales && body.materiales.length > 0) {
      for (const mat of body.materiales) {
        await sql`
          INSERT INTO service_type_materials (service_type_id, material_id, cantidad_por_m2)
          VALUES (${serviceType.id}, ${mat.material_id}, ${mat.cantidad_por_m2})
          ON CONFLICT (service_type_id, material_id) DO UPDATE SET cantidad_por_m2 = ${mat.cantidad_por_m2}
        `;
      }
    }

    return NextResponse.json({ serviceType }, { status: 201 });
  } catch (error) {
    console.error("Error creating service type:", error);
    return NextResponse.json({ error: "Error al crear" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const sql = getDb();

    await sql`
      UPDATE service_types SET
        nombre = ${body.nombre},
        descripcion = ${body.descripcion || null},
        rendimiento_m2_dia = ${body.rendimiento_m2_dia || null},
        costo_mano_obra_dia = ${body.costo_mano_obra_dia || null},
        incluye_cargas_sociales = ${body.incluye_cargas_sociales || false},
        porcentaje_cargas = ${body.porcentaje_cargas || 0},
        updated_at = NOW()
      WHERE id = ${body.id}
    `;

    // Replace materials
    await sql`DELETE FROM service_type_materials WHERE service_type_id = ${body.id}`;
    if (body.materiales && body.materiales.length > 0) {
      for (const mat of body.materiales) {
        await sql`
          INSERT INTO service_type_materials (service_type_id, material_id, cantidad_por_m2)
          VALUES (${body.id}, ${mat.material_id}, ${mat.cantidad_por_m2})
        `;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating service type:", error);
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
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
    await sql`DELETE FROM service_type_materials WHERE service_type_id = ${id}`;
    await sql`DELETE FROM service_types WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting service type:", error);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
