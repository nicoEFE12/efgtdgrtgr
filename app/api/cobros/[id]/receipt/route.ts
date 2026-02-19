import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateReceiptPDF } from "@/lib/receipt-generator";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const sql = getDb();

  try {
    // Get the cobro details
    const cobros = await sql`
      SELECT 
        cc.id, cc.amount, cc.concept, cc.date, cc.payment_method,
        c.apellido_nombre as client_name,
        cc.project_id,
        p.nombre as project_name
      FROM cuenta_corriente cc
      JOIN clients c ON cc.client_id = c.id
      LEFT JOIN projects p ON cc.project_id = p.id
      WHERE cc.id = ${parseInt(id)} AND cc.type = 'cobro'
      LIMIT 1
    `;

    if (cobros.length === 0) {
      return NextResponse.json({ error: "Cobro no encontrado" }, { status: 404 });
    }

    const cobro = cobros[0];

    // Ensure date is in string format (ISO format: YYYY-MM-DD)
    const dateStr = typeof cobro.date === 'string' 
      ? cobro.date 
      : new Date(cobro.date).toISOString().split('T')[0];

    // Generate the receipt PDF as Uint8Array
    const pdfData = generateReceiptPDF({
      clientName: cobro.client_name,
      amount: parseFloat(cobro.amount),
      date: dateStr,
      concept: cobro.concept,
      projectName: cobro.project_name,
      referenceCode: `REC-${cobro.id}-${new Date(cobro.date).getTime()}`,
    });

    // Convert to Buffer for response
    const pdfBuffer = Buffer.from(pdfData);

    // Return PDF with appropriate headers for download
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="recibo-${cobro.id}-${cobro.client_name.replace(/\s+/g, "-")}.pdf"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating receipt:", error);
    return NextResponse.json(
      { error: "Error al generar el recibo" },
      { status: 500 }
    );
  }
}
