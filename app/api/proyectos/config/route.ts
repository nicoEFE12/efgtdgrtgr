import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sql = getDb();
  try {
    const rows = await sql`SELECT * FROM project_config ORDER BY key`;
    const config: Record<string, any> = {};
    for (const r of rows) {
      config[r.key] = r.value;
    }
    return NextResponse.json({ config });
  } catch {
    // Table might not exist yet, return defaults
    return NextResponse.json({
      config: {
        gastos_comunes: ["Transporte de personal", "Comida/Viandas", "Combustible", "Peaje", "Alquiler de herramientas", "Limpieza", "Seguridad e higiene", "Varios"],
        medios_pago: ["banco", "mercado_pago", "efectivo_pesos", "efectivo_usd", "cheque"],
        categorias_egreso: ["Materiales", "Mano de obra", "Flete", "Herramientas", "Combustible", "Varios"],
        cuota_conceptos: ["Cuota mensual", "Anticipo", "Refuerzo", "Certificado de obra", "Ajuste", "Otro"],
      },
    });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sql = getDb();
  try {
    const body = await request.json();
    for (const [key, value] of Object.entries(body)) {
      await sql`
        INSERT INTO project_config (key, value, updated_at)
        VALUES (${key}, ${JSON.stringify(value)}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(value)}, updated_at = NOW()
      `;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating project config:", error);
    return NextResponse.json({ error: "Error al actualizar configuración" }, { status: 500 });
  }
}
