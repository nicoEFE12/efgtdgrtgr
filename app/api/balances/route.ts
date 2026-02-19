import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getGeneralCashBalance, getAllProjectBalances } from "@/lib/cash-utils";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const [generalBalance, projectBalances] = await Promise.all([
      getGeneralCashBalance(),
      getAllProjectBalances()
    ]);

    return NextResponse.json({
      general: generalBalance,
      projects: projectBalances
    });
  } catch (error) {
    console.error("Error getting balances:", error);
    return NextResponse.json(
      { error: "Error al obtener balances" },
      { status: 500 }
    );
  }
}