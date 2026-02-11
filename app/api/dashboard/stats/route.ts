import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sql = getDb();
  try {
    const [clientCount] = await sql`SELECT COUNT(*) as count FROM clients WHERE estado = 'activo'`;
    const [projectCount] = await sql`SELECT COUNT(*) as count FROM projects WHERE estado = 'activo'`;

    const [cashBalance] = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'ingreso' THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN type = 'egreso' THEN amount ELSE 0 END), 0) as balance
      FROM cash_movements
    `;

    const [quotationCount] = await sql`SELECT COUNT(*) as count FROM quotations WHERE estado = 'enviada'`;

    const recentMovements = await sql`
      SELECT cm.*, c.apellido_nombre as client_name
      FROM cash_movements cm
      LEFT JOIN clients c ON cm.client_id = c.id
      ORDER BY cm.date DESC, cm.created_at DESC
      LIMIT 5
    `;

    const activeProjects = await sql`
      SELECT p.*,
        c.apellido_nombre as client_name,
        COALESCE(
          (SELECT SUM(CASE WHEN type = 'transferencia_in' THEN amount ELSE 0 END) -
           SUM(CASE WHEN type = 'egreso' THEN amount ELSE 0 END)
           FROM project_cash_movements WHERE project_id = p.id), 0
        ) as saldo_caja
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE p.estado = 'activo'
      ORDER BY p.created_at DESC
      LIMIT 5
    `;

    return NextResponse.json({
      clients: Number(clientCount.count),
      active_projects: Number(projectCount.count),
      cash_balance: Number(cashBalance.balance),
      pending_quotations: Number(quotationCount.count),
      recent_movements: recentMovements,
      active_projects_list: activeProjects,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Error fetching stats" },
      { status: 500 }
    );
  }
}
