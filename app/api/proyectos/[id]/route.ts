import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const sql = getDb();

  const projects = await sql`
    SELECT p.*, c.apellido_nombre as client_name, c.dni, c.domicilio_obra, c.telefono, c.email as client_email
    FROM projects p
    JOIN clients c ON p.client_id = c.id
    WHERE p.id = ${id}
  `;

  if (projects.length === 0) {
    return NextResponse.json(
      { error: "Proyecto no encontrado" },
      { status: 404 }
    );
  }

  // Get project cash movements (including cobros from cuenta_corriente)
  const movements = await sql`
    SELECT 
      id, 
      type, 
      amount, 
      concept, 
      date, 
      payment_method, 
      category, 
      created_at,
      'project_cash_movements' as source
    FROM project_cash_movements
    WHERE project_id = ${id}
    
    UNION ALL
    
    SELECT 
      id,
      type as type, 
      amount, 
      concept, 
      date, 
      payment_method, 
      'Cobro' as category, 
      created_at,
      'cuenta_corriente' as source
    FROM cuenta_corriente
    WHERE client_id = ${projects[0].client_id}
      AND type = 'cobro'
      AND (project_id = ${id} OR project_id IS NULL)
    
    ORDER BY date DESC, created_at DESC
  `;

  // Get project documents
  const documents = await sql`
    SELECT * FROM project_documents
    WHERE project_id = ${id}
    ORDER BY category, created_at DESC
  `;

  // Financial summary
  const summary = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN type IN ('transferencia_in', 'ingreso') THEN amount ELSE 0 END), 0) as total_ingresado,
      COALESCE(SUM(CASE WHEN type = 'egreso' THEN amount ELSE 0 END), 0) as total_gastado
    FROM project_cash_movements
    WHERE project_id = ${id}
  `;

  // Total collected from client via cuenta corriente
  const cobrosResult = await sql`
    SELECT COALESCE(SUM(amount), 0) as total_cobrado
    FROM cuenta_corriente
    WHERE client_id = ${projects[0].client_id}
      AND type = 'cobro'
      AND (project_id = ${id} OR project_id IS NULL)
  `;

  // Get project rubros with materials
  const rubros = await sql`
    SELECT pr.*, st.nombre as service_name
    FROM project_rubros pr
    LEFT JOIN service_types st ON pr.service_type_id = st.id
    WHERE pr.project_id = ${id}
    ORDER BY pr.id
  `;

  const rubroMaterials = await sql`
    SELECT prm.*
    FROM project_rubro_materials prm
    JOIN project_rubros pr ON prm.project_rubro_id = pr.id
    WHERE pr.project_id = ${id}
    ORDER BY prm.id
  `;

  // Attach materials to each rubro
  const rubrosWithMaterials = rubros.map((r: any) => ({
    ...r,
    materiales: rubroMaterials.filter((m: any) => m.project_rubro_id === r.id),
  }));

  return NextResponse.json({
    project: projects[0],
    movements,
    documents,
    rubros: rubrosWithMaterials,
    summary: {
      total_ingresado: Number(summary[0].total_ingresado),
      total_gastado: Number(summary[0].total_gastado),
      total_cobrado: Number(cobrosResult[0].total_cobrado),
      saldo: Number(summary[0].total_ingresado) - Number(summary[0].total_gastado),
    },
  });
}

export async function PUT(
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
    // If only observaciones is being updated (from the observations tab)
    let result;
    if (body._updateObservaciones) {
      result = await sql`
        UPDATE projects SET
          observaciones = ${body.observaciones || null},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else {
      result = await sql`
        UPDATE projects SET
          nombre = ${body.nombre},
          presupuesto_total = ${body.presupuesto_total || 0},
          estado = ${body.estado},
          observaciones = ${body.observaciones || null},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    }

    return NextResponse.json({ project: result[0] });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Error al actualizar el proyecto" },
      { status: 500 }
    );
  }
}
