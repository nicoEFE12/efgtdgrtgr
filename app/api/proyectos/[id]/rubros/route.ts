import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST /api/proyectos/[id]/rubros/apply
// Body: { materialId: number } OR { rubroId: number, type: "mano_obra" }
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
    // CASE 1: Apply a material (partial or full)
    if (body.materialId) {
      const materialId = body.materialId;
      const cantidadAAplicar = body.cantidad; // Could be partial or full

      // Get the material details
      const materials = await sql`
        SELECT prm.*, pr.project_id, pr.id as rubro_id, pr.descripcion as rubro_desc,
               pr.costo_mano_obra, pr.costo_materiales
        FROM project_rubro_materials prm
        JOIN project_rubros pr ON prm.project_rubro_id = pr.id
        WHERE prm.id = ${materialId} AND pr.project_id = ${id}
      `;

      if (materials.length === 0) {
        return NextResponse.json({ error: "Material no encontrado" }, { status: 404 });
      }

      const mat = materials[0];
      const cantidadTotal = Number(mat.cantidad);
      const cantidadAplicadaActual = Number(mat.cantidad_aplicada || 0);
      const cantidadRestante = cantidadTotal - cantidadAplicadaActual;

      if (cantidadAAplicar > cantidadRestante) {
        return NextResponse.json({ error: "Cantidad supera lo restante" }, { status: 400 });
      }

      const nuevaCantidadAplicada = cantidadAplicadaActual + cantidadAAplicar;
      const isFullyApplied = nuevaCantidadAplicada >= cantidadTotal;

      // Calculate proportional cost
      const costoUnitario = Number(mat.precio_unitario);
      const costoAAplicar = cantidadAAplicar * costoUnitario;

      // Update applied quantity
      await sql`
        UPDATE project_rubro_materials
        SET 
          cantidad_aplicada = ${nuevaCantidadAplicada},
          applied = ${isFullyApplied},
          applied_at = ${isFullyApplied ? sql`NOW()` : mat.applied_at}
        WHERE id = ${materialId}
      `;

      // Register as egreso in project caja (proportional)
      await sql`
        INSERT INTO project_cash_movements (
          project_id, type, amount, payment_method, concept, category, date, notes, created_by
        ) VALUES (
          ${id}, 'egreso', ${costoAAplicar}, 'efectivo_pesos',
          ${`Material: ${mat.nombre} - ${mat.rubro_desc}`},
          'Materiales',
          ${new Date().toISOString().split("T")[0]},
          ${`Rubro: ${mat.rubro_desc} | Aplicado: ${cantidadAAplicar} ${mat.unidad} de ${cantidadTotal} (${((nuevaCantidadAplicada/cantidadTotal)*100).toFixed(0)}%)`},
          ${session.userId}
        )
      `;

      // Check if ALL materials in this rubro are now fully applied
      const pending = await sql`
        SELECT COUNT(*) as count FROM project_rubro_materials
        WHERE project_rubro_id = ${mat.rubro_id} AND applied = FALSE
      `;

      const allApplied = Number(pending[0].count) === 0;

      // If all materials applied, auto-apply mano de obra
      if (allApplied && Number(mat.costo_mano_obra) > 0) {
        const rubroCheck = await sql`
          SELECT mano_obra_applied FROM project_rubros WHERE id = ${mat.rubro_id}
        `;

        if (!rubroCheck[0].mano_obra_applied) {
          await sql`
            UPDATE project_rubros
            SET mano_obra_applied = TRUE, mano_obra_applied_at = NOW()
            WHERE id = ${mat.rubro_id}
          `;

          await sql`
            INSERT INTO project_cash_movements (
              project_id, type, amount, payment_method, concept, category, date, notes, created_by
            ) VALUES (
              ${id}, 'egreso', ${Number(mat.costo_mano_obra)}, 'efectivo_pesos',
              ${`Mano de Obra: ${mat.rubro_desc}`},
              'Mano de obra',
              ${new Date().toISOString().split("T")[0]},
              ${`Auto-aplicado al completar todos los materiales del rubro`},
              ${session.userId}
            )
          `;
        }
      }

      return NextResponse.json({
        ok: true,
        allMaterialsApplied: allApplied,
        manoObraAutoApplied: allApplied && Number(mat.costo_mano_obra) > 0,
      });
    }

    // CASE 2: Update rubro direct progress (for rubros without materials)
    if (body.rubroId && body.cantidadAplicada !== undefined) {
      const rubroId = body.rubroId;
      const cantidadAplicada = body.cantidadAplicada;

      const rubros = await sql`
        SELECT * FROM project_rubros
        WHERE id = ${rubroId} AND project_id = ${id}
      `;

      if (rubros.length === 0) {
        return NextResponse.json({ error: "Rubro no encontrado" }, { status: 404 });
      }

      const rubro = rubros[0];
      const cantidadTotal = Number(rubro.m2) || 0;
      const cantidadAnterior = Number(rubro.cantidad_aplicada) || 0;

      if (cantidadAplicada > cantidadTotal) {
        return NextResponse.json({ error: "Cantidad supera el total" }, { status: 400 });
      }

      // Calculate cost difference for this update
      const subtotal = Number(rubro.subtotal);
      const costoUnitario = cantidadTotal > 0 ? subtotal / cantidadTotal : 0;
      const diferenciaCantidad = cantidadAplicada - cantidadAnterior;
      const costoAAplicar = diferenciaCantidad * costoUnitario;

      await sql`
        UPDATE project_rubros
        SET cantidad_aplicada = ${cantidadAplicada}
        WHERE id = ${rubroId}
      `;

      // If there's a cost difference, register as egreso
      if (costoAAplicar > 0) {
        await sql`
          INSERT INTO project_cash_movements (
            project_id, type, amount, payment_method, concept, category, date, notes, created_by
          ) VALUES (
            ${id}, 'egreso', ${costoAAplicar}, 'efectivo_pesos',
            ${`Avance: ${rubro.descripcion}`},
            'Avance de obra',
            ${new Date().toISOString().split("T")[0]},
            ${`${cantidadAnterior} → ${cantidadAplicada} ${rubro.unidad || 'm2'} (${((cantidadAplicada/cantidadTotal)*100).toFixed(0)}%)`},
            ${session.userId}
          )
        `;
      }

      // Auto-apply mano de obra when 100%
      const isComplete = cantidadAplicada >= cantidadTotal;
      if (isComplete && !rubro.mano_obra_applied && Number(rubro.costo_mano_obra) > 0) {
        await sql`
          UPDATE project_rubros
          SET mano_obra_applied = TRUE, mano_obra_applied_at = NOW()
          WHERE id = ${rubroId}
        `;

        await sql`
          INSERT INTO project_cash_movements (
            project_id, type, amount, payment_method, concept, category, date, notes, created_by
          ) VALUES (
            ${id}, 'egreso', ${Number(rubro.costo_mano_obra)}, 'efectivo_pesos',
            ${`Mano de Obra: ${rubro.descripcion}`},
            'Mano de obra',
            ${new Date().toISOString().split("T")[0]},
            ${`Auto-aplicado al completar el rubro al 100%`},
            ${session.userId}
          )
        `;
      }

      return NextResponse.json({ ok: true, isComplete });
    }

    // CASE 3: Manually apply mano de obra for a rubro
    if (body.rubroId && body.type === "mano_obra") {
      const rubroId = body.rubroId;

      const rubros = await sql`
        SELECT * FROM project_rubros
        WHERE id = ${rubroId} AND project_id = ${id}
      `;

      if (rubros.length === 0) {
        return NextResponse.json({ error: "Rubro no encontrado" }, { status: 404 });
      }

      const rubro = rubros[0];

      if (rubro.mano_obra_applied) {
        return NextResponse.json({ error: "Mano de obra ya aplicada" }, { status: 400 });
      }

      await sql`
        UPDATE project_rubros
        SET mano_obra_applied = TRUE, mano_obra_applied_at = NOW()
        WHERE id = ${rubroId}
      `;

      if (Number(rubro.costo_mano_obra) > 0) {
        await sql`
          INSERT INTO project_cash_movements (
            project_id, type, amount, payment_method, concept, category, date, notes, created_by
          ) VALUES (
            ${id}, 'egreso', ${Number(rubro.costo_mano_obra)}, 'efectivo_pesos',
            ${`Mano de Obra: ${rubro.descripcion}`},
            'Mano de obra',
            ${new Date().toISOString().split("T")[0]},
            ${null},
            ${session.userId}
          )
        `;
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    console.error("Error applying rubro:", error);
    return NextResponse.json(
      { error: "Error al aplicar" },
      { status: 500 }
    );
  }
}
