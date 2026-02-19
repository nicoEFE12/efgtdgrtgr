import { getDb } from "@/lib/db";

// Calculate balance for general cash box
export async function getGeneralCashBalance(): Promise<number> {
  const sql = getDb();
  
  const result = await sql`
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'ingreso' THEN amount ELSE -amount END), 0) as balance
    FROM cash_movements
  `;
  
  return parseFloat(result[0].balance.toString());
}

// Calculate balance for a specific project cash box
// Balance = Total Collected (cobros) - Total Spent (egresos)
export async function getProjectCashBalance(projectId: number): Promise<number> {
  const sql = getDb();
  
  // Get project's client
  const projectInfo = await sql`
    SELECT client_id FROM projects WHERE id = ${projectId}
  `;
  
  if (projectInfo.length === 0) {
    return 0;
  }
  
  const clientId = projectInfo[0].client_id;
  
  // Get total collected (cobros) from cuenta_corriente
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
  
  return totalCobrado - totalGastado;
}

// Get balance for any cash box (general or project)
export async function getCashBoxBalance(type: 'general' | 'project', projectId?: number): Promise<number> {
  if (type === 'general') {
    return await getGeneralCashBalance();
  } else if (type === 'project' && projectId) {
    return await getProjectCashBalance(projectId);
  }
  return 0;
}

// Validate if a cash box has sufficient funds for a transfer
export async function validateSufficientFunds(
  sourceType: 'general' | 'project',
  amount: number,
  sourceProjectId?: number
): Promise<{ hasEnoughFunds: boolean; currentBalance: number }> {
  const currentBalance = await getCashBoxBalance(sourceType, sourceProjectId);
  
  return {
    hasEnoughFunds: currentBalance >= amount,
    currentBalance
  };
}

// Get all project balances for display
export async function getAllProjectBalances(): Promise<Array<{id: number; nombre: string; balance: number}>> {
  const sql = getDb();
  
  const projects = await sql`
    SELECT 
      p.id,
      p.nombre,
      p.client_id,
      COALESCE(SUM(CASE WHEN cc.type = 'cobro' THEN cc.amount ELSE 0 END), 0) as total_cobrado,
      COALESCE(SUM(CASE WHEN pcm.type = 'egreso' THEN pcm.amount ELSE 0 END), 0) as total_gastado
    FROM projects p
    LEFT JOIN cuenta_corriente cc ON p.client_id = cc.client_id AND cc.type = 'cobro' AND (cc.project_id = p.id OR cc.project_id IS NULL)
    LEFT JOIN project_cash_movements pcm ON p.id = pcm.project_id AND pcm.type = 'egreso'
    GROUP BY p.id, p.nombre, p.client_id
    ORDER BY p.nombre
  `;
  
  return projects.map(p => ({
    id: p.id,
    nombre: p.nombre,
    balance: parseFloat((p.total_cobrado - p.total_gastado).toString())
  }));
}