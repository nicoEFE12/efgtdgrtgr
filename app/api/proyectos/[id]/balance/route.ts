import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const projectId = parseInt(id);

  if (isNaN(projectId)) {
    return NextResponse.json({ error: "ID de proyecto inválido" }, { status: 400 });
  }

  try {
    const sql = getDb();
    
    // Get project info to find client
    const projectInfo = await sql`
      SELECT p.client_id FROM projects p WHERE p.id = ${projectId}
    `;
    
    if (projectInfo.length === 0) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const clientId = projectInfo[0].client_id;

    // Get total collected (cobros) from cuenta_corriente for this project
    const cobrosResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_cobrado
      FROM cuenta_corriente
      WHERE client_id = ${clientId}
        AND type = 'cobro'
        AND (project_id = ${projectId} OR project_id IS NULL)
    `;

    // Get total spent (egresos) from project_cash_movements
    const gastosResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_gastado
      FROM project_cash_movements
      WHERE project_id = ${projectId}
        AND type = 'egreso'
    `;

    const totalCobrado = parseFloat(cobrosResult[0].total_cobrado.toString());
    const totalGastado = parseFloat(gastosResult[0].total_gastado.toString());
    const balance = totalCobrado - totalGastado;
    
    return NextResponse.json({ 
      balance,
      totalCobrado,
      totalGastado
    });
  } catch (error) {
    console.error("Error getting project balance:", error);
    return NextResponse.json(
      { error: "Error al obtener balance del proyecto" },
      { status: 500 }
    );
  }
}