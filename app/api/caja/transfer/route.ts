import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from_method, to_method, amount, exchange_rate } = body;

    if (!from_method || !to_method || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Parámetros inválidos" },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Determine currencies
    const usdMethods = ["efectivo_usd"];
    const arsMethods = ["banco", "mercado_pago", "efectivo_pesos", "cheque"];

    const fromIsUSD = usdMethods.includes(from_method);
    const toIsUSD = usdMethods.includes(to_method);

    let actualAmount = amount;
    let convertedAmount = amount;

    // Calculate conversion if needed
    if (fromIsUSD && !toIsUSD) {
      // USD to ARS
      convertedAmount = amount * exchange_rate;
    } else if (!fromIsUSD && toIsUSD) {
      // ARS to USD
      convertedAmount = amount / exchange_rate;
    }

    // Create egreso (withdrawal) from source wallet
    const egresoResult = await sql`
      INSERT INTO cash_movements (
        type,
        payment_method,
        amount,
        concept,
        date,
        created_at,
        created_by
      )
      VALUES (
        'egreso',
        ${from_method},
        ${actualAmount},
        ${'Transferencia a ' + to_method},
        ${new Date().toISOString().split("T")[0]},
        ${new Date()},
        ${'system'}
      )
      RETURNING id
    `;

    // Create ingreso (deposit) to destination wallet
    await sql`
      INSERT INTO cash_movements (
        type,
        payment_method,
        amount,
        concept,
        date,
        created_at,
        created_by,
        exchange_rate
      )
      VALUES (
        'ingreso',
        ${to_method},
        ${convertedAmount},
        ${'Transferencia desde ' + from_method},
        ${new Date().toISOString().split("T")[0]},
        ${new Date()},
        ${'system'},
        ${exchange_rate}
      )
    `;

    return NextResponse.json(
      {
        success: true,
        from_amount: actualAmount,
        to_amount: convertedAmount,
        exchange_rate,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Transfer error:", error);
    return NextResponse.json(
      { error: "Error en la transferencia" },
      { status: 500 }
    );
  }
}
