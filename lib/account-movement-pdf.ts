import jsPDF from 'jspdf';
import { numberToText } from "@/lib/number-to-text";

const WALLET_LABELS: Record<string, string> = {
  banco: 'Banco',
  mercado_pago: 'Mercado Pago',
  efectivo_pesos: 'Efectivo $',
  efectivo_usd: 'Efectivo USD',
  cheque: 'Cheques',
};

const WALLET_CONFIG: Record<
  string,
  { label: string; currency: "ARS" | "USD" }
> = {
  banco: {
    label: "Banco",
    currency: "ARS",
  },
  mercado_pago: {
    label: "Mercado Pago",
    currency: "ARS",
  },
  efectivo_pesos: {
    label: "Efectivo $",
    currency: "ARS",
  },
  efectivo_usd: {
    label: "Efectivo USD",
    currency: "USD",
  },
  cheque: {
    label: "Cheques",
    currency: "ARS",
  },
};

function formatCurrency(amount: number, currency: "ARS" | "USD" = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

export function generateAccountMovementReceipt(movement: any, clientName: string, withComprobante: boolean = false) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;

  // Header with company info
  pdf.setFillColor(37, 99, 235);
  pdf.rect(0, 0, pageWidth, 45, "F");

  pdf.setFontSize(24);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.text("AM SOLUCIONES", margin, 18);
  pdf.text("CONSTRUCTIVAS", margin, 30);

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text("Sistema de Gestión", margin, 38);

  let yPos = 60;

  // Receipt title
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(
    movement.type === "cobro" ? "RECIBO DE COBRO" : "COMPROBANTE DE CARGO",
    pageWidth / 2,
    yPos,
    { align: "center" }
  );

  yPos += 15;

  // Date and movement ID
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Fecha: ${new Date(movement.date).toLocaleDateString("es-AR")}`, margin, yPos);
  pdf.text(`N° ${movement.id}`, pageWidth - margin, yPos, { align: "right" });

  yPos += 15;

  // Movement details box
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.rect(margin, yPos, pageWidth - 2 * margin, 100);

  yPos += 10;

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("CONCEPTO:", margin + 5, yPos);
  pdf.setFont("helvetica", "normal");
  const conceptLines = pdf.splitTextToSize(movement.concept || "", pageWidth - 2 * margin - 40);
  pdf.text(conceptLines, margin + 35, yPos);
  
  yPos += 8;
  
  pdf.setFont("helvetica", "bold");
  pdf.text("CLIENTE:", margin + 5, yPos);
  pdf.setFont("helvetica", "normal");
  pdf.text(clientName || "-", margin + 35, yPos);
  
  yPos += 8;
  
  pdf.setFont("helvetica", "bold");
  pdf.text("MÉTODO:", margin + 5, yPos);
  pdf.setFont("helvetica", "normal");
  const methodLabel = WALLET_LABELS[movement.payment_method] || movement.payment_method || "-";
  pdf.text(methodLabel, margin + 35, yPos);
  
  yPos += 8;
  
  if (movement.project_name) {
    pdf.setFont("helvetica", "bold");
    pdf.text("PROYECTO:", margin + 5, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(movement.project_name, margin + 35, yPos);
    yPos += 8;
  }
  
  yPos += 15;

  // Amount box
  const isIncome = movement.type === "cobro";
  pdf.setFillColor(isIncome ? 34 : 239, isIncome ? 197 : 68, isIncome ? 94 : 68);
  pdf.rect(margin, yPos, pageWidth - 2 * margin, 20, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("MONTO:", margin + 5, yPos + 14);
  pdf.setFontSize(16);
  pdf.text(formatCurrency(Number(movement.amount), "ARS"), pageWidth - margin - 5, yPos + 14, { align: "right" });

  yPos += 28;

  // Notes if any
  if (movement.notes) {
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("NOTAS:", margin, yPos);
    yPos += 5;
    pdf.setFont("helvetica", "normal");
    const notesLines = pdf.splitTextToSize(movement.notes, pageWidth - 2 * margin);
    pdf.text(notesLines, margin, yPos);
    yPos += notesLines.length * 5 + 10;
  }

  // Add comprobante section if requested
  if (withComprobante) {
    yPos += 8;

    // Separator
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(1);
    pdf.setLineDash([5, 3]);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    pdf.setLineDash([]);

    yPos += 12;

    // Comprobante header
    pdf.setFillColor(37, 99, 235);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 12, "F");

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text("COMPROBANTE", pageWidth / 2, yPos + 8, { align: "center" });

    yPos += 18;

    // Simple receipt format
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Recibí de: ${clientName}`, margin, yPos);
    yPos += 8;
    pdf.text(`La suma de: ${formatCurrency(Number(movement.amount), "ARS")}`, margin, yPos);
    yPos += 6;
    pdf.setFontSize(9);
    const amountInText = numberToText(Number(movement.amount), "ARS");
    pdf.setFont("helvetica", "italic");
    pdf.text(`(${amountInText})`, margin, yPos);
    yPos += 6;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`En concepto de: ${movement.concept || "_____________________________"}`, margin, yPos);
    yPos += 8;
    pdf.text(`Fecha: ${new Date(movement.date).toLocaleDateString("es-AR")}`, margin, yPos);

    yPos += 18;

    // Signature line
    pdf.setLineWidth(0.5);
    pdf.line(pageWidth / 2 + 20, yPos, pageWidth - margin - 20, yPos);
    yPos += 5;
    pdf.setFontSize(9);
    pdf.text("Firma y Aclaración", pageWidth / 2 + 30, yPos);
  }

  // Footer
  pdf.setTextColor(128, 128, 128);
  pdf.setFontSize(8);
  pdf.text(
    "AM Soluciones Constructivas - Documento generado automáticamente",
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  return pdf;
}

export function previewAccountMovementPDF(movement: any, clientName: string, withComprobante: boolean = false) {
  const pdf = generateAccountMovementReceipt(movement, clientName, withComprobante);
  const pdfBlob = pdf.output("blob");
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, "_blank");
}

export function downloadAccountMovementPDF(movement: any, clientName: string, withComprobante: boolean = false) {
  const pdf = generateAccountMovementReceipt(movement, clientName, withComprobante);
  const fileName = `${movement.type}_${movement.id}_${new Date().toISOString().split("T")[0]}.pdf`;
  pdf.save(fileName);
}
