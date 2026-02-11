import { getDb } from "@/lib/db";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

async function getDashboardData() {
  const sql = getDb();

  const [clientCount, projectStats, cashSummary] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM clients WHERE estado = 'activo'`,
    sql`
      SELECT 
        COUNT(*) FILTER (WHERE estado = 'activo') as activos,
        COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes,
        COUNT(*) FILTER (WHERE estado = 'cerrado') as cerrados
      FROM projects
    `,
    sql`
      SELECT 
        payment_method,
        COALESCE(SUM(CASE WHEN type = 'ingreso' THEN amount ELSE 0 END), 0) as total_ingresos,
        COALESCE(SUM(CASE WHEN type = 'egreso' THEN amount ELSE 0 END), 0) as total_egresos
      FROM cash_movements
      GROUP BY payment_method
    `,
  ]);

  const wallets: Record<string, number> = {
    banco: 0,
    mercado_pago: 0,
    efectivo_pesos: 0,
    efectivo_usd: 0,
    cheque: 0,
  };

  for (const row of cashSummary) {
    const method = row.payment_method as string;
    wallets[method] =
      Number(row.total_ingresos) - Number(row.total_egresos);
  }

  const totalCaja = Object.values(wallets).reduce((a, b) => a + b, 0);

  return {
    clientesActivos: Number(clientCount[0].count),
    proyectos: {
      activos: Number(projectStats[0].activos),
      pendientes: Number(projectStats[0].pendientes),
      cerrados: Number(projectStats[0].cerrados),
    },
    wallets,
    totalCaja,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  return <DashboardContent data={data} />;
}
