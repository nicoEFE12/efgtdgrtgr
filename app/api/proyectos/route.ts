import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sql = getDb();
  const projects = await sql`
    SELECT p.*, c.apellido_nombre as client_name,
      COALESCE(
        (SELECT SUM(cc.amount) 
         FROM cuenta_corriente cc 
         WHERE cc.client_id = p.client_id 
           AND cc.type = 'cobro' 
           AND (cc.project_id = p.id OR cc.project_id IS NULL)
        ), 0
      ) -
      COALESCE(
        (SELECT SUM(pcm.amount)
         FROM project_cash_movements pcm 
         WHERE pcm.project_id = p.id AND pcm.type = 'egreso'
        ), 0
      ) as saldo_caja,
      COALESCE(
        (SELECT SUM(pcm.amount)
         FROM project_cash_movements pcm WHERE pcm.project_id = p.id AND pcm.type = 'egreso'
        ), 0
      ) as total_gastado,
      COALESCE(
        (SELECT SUM(cc.amount) 
         FROM cuenta_corriente cc 
         WHERE cc.client_id = p.client_id 
           AND cc.type = 'cobro' 
           AND (cc.project_id = p.id OR cc.project_id IS NULL)
        ), 0
      ) as total_cobrado
    FROM projects p
    JOIN clients c ON p.client_id = c.id
    ORDER BY 
      CASE p.estado 
        WHEN 'activo' THEN 1 
        WHEN 'pendiente' THEN 2 
        WHEN 'cerrado' THEN 3 
      END,
      p.created_at DESC
  `;

  return NextResponse.json({ projects });
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
      INSERT INTO projects (
        client_id, nombre, numero_contrato, presupuesto_total,
        importe_reservado, estado, fecha_inicio, fecha_cierre, observaciones, quotation_id
      ) VALUES (
        ${body.client_id}, ${body.nombre}, ${body.numero_contrato || ''},
        ${body.presupuesto_total || 0}, ${body.importe_reservado || 0},
        ${body.estado || "pendiente"}, ${body.fecha_inicio || null},
        ${body.fecha_cierre || null}, ${body.observaciones || null},
        ${body.quotation_id || null}
      )
      RETURNING *
    `;

    const projectId = result[0].id;

    // Save rubros if provided (from quotation)
    if (body.rubros && body.rubros.length > 0) {
      for (const rubro of body.rubros) {
        const [insertedRubro] = await sql`
          INSERT INTO project_rubros (
            project_id, quotation_item_id, descripcion, service_type_id,
            m2, unidad, dias_estimados,
            costo_materiales, costo_mano_obra, costo_fijos_prorrateados, subtotal
          ) VALUES (
            ${projectId}, ${rubro.quotation_item_id || null}, ${rubro.descripcion},
            ${rubro.service_type_id || null}, ${rubro.m2 || null}, ${rubro.unidad || 'm2'},
            ${rubro.dias_estimados || null}, ${rubro.costo_materiales || 0},
            ${rubro.costo_mano_obra || 0}, ${rubro.costo_fijos_prorrateados || 0},
            ${rubro.subtotal || 0}
          )
          RETURNING id
        `;

        // Save material details for each rubro
        if (rubro.materiales && rubro.materiales.length > 0) {
          for (const mat of rubro.materiales) {
            await sql`
              INSERT INTO project_rubro_materials (
                project_rubro_id, material_id, nombre, cantidad, unidad, precio_unitario, total
              ) VALUES (
                ${insertedRubro.id}, ${mat.material_id || null}, ${mat.nombre},
                ${mat.cantidad}, ${mat.unidad}, ${mat.precio_unitario || 0}, ${mat.total || 0}
              )
            `;
          }
        }
      }
    }

    return NextResponse.json({ project: result[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Error al crear el proyecto" },
      { status: 500 }
    );
  }
}
