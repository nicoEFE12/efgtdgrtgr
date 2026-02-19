import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

// Función para convertir números a palabras en español
function numberToWords(num: number): string {
  if (num === 0) return "cero";

  const units = ["", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
  const teens = ["diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve"];
  const twenties = ["veinte", "veintiún", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
  const tens = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
  const hundreds = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

  function convertBelowThousand(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "cien";

    let result = "";

    // Centenas
    if (n >= 100) {
      result += hundreds[Math.floor(n / 100)];
      n %= 100;
      if (n > 0) result += " ";
    }

    // Decenas y unidades
    if (n >= 30) {
      result += tens[Math.floor(n / 10)];
      if (n % 10 !== 0) result += " y " + units[n % 10];
    } else if (n >= 20) {
      result += twenties[n - 20];
    } else if (n >= 10) {
      result += teens[n - 10];
    } else if (n > 0) {
      result += units[n];
    }

    return result.trim();
  }

  let result: string[] = [];

  // Millones
  if (num >= 1000000) {
    const millions = Math.floor(num / 1000000);
    if (millions === 1) {
      result.push("UN MILLÓN");
    } else {
      const millionText = convertBelowThousand(millions).toUpperCase();
      result.push(millionText + " MILLONES");
    }
    num %= 1000000;
  }

  // Miles
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    if (thousands === 1) {
      result.push("MIL");
    } else {
      const thousandText = convertBelowThousand(thousands).toUpperCase();
      result.push(thousandText + " MIL");
    }
    num %= 1000;
  }

  // Unidades, decenas y centenas
  if (num > 0) {
    result.push(convertBelowThousand(num).toUpperCase());
  }

  return result.join(" ").trim();
}

export interface ReceiptData {
  clientName: string;
  amount: number;
  date: string;
  concept: string;
  projectName?: string;
  companyName?: string;
  cuit?: string;
  referenceCode?: string;
}

export function generateReceiptPDF(data: ReceiptData): Uint8Array {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 15;

  // Leer el logo y convertir a base64
  let logoBase64 = "";
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    const logoBuffer = fs.readFileSync(logoPath);
    logoBase64 = logoBuffer.toString("base64");
  } catch (error) {
    console.error("Error cargando logo:", error);
  }

  // Encabezado con logo
  pdf.setFillColor(37, 99, 235);
  pdf.rect(0, 0, pageWidth, 30, "F");
  
  // Agregar logo si está disponible
  if (logoBase64) {
    try {
      pdf.addImage(`data:image/png;base64,${logoBase64}`, "PNG", 15, 5, 20, 20);
    } catch (error) {
      console.error("Error agregando logo al PDF:", error);
    }
  }
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("AM SOLUCIONES CONSTRUCTIVAS", pageWidth / 2, 13, { align: "center" });
  
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Comprobante de Pago", pageWidth / 2, 22, { align: "center" });
  
  yPosition = 35;

  // Fecha
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(9);
  pdf.text(`Fecha: ${formatDateForDisplay(data.date)}`, 15, yPosition);
  yPosition += 10;

  // Línea separadora
  pdf.setDrawColor(200);
  pdf.line(15, yPosition, pageWidth - 15, yPosition);
  yPosition += 8;

  // Datos del cliente
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("DESTINATARIO:", 15, yPosition);
  yPosition += 6;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(data.clientName.toUpperCase(), 15, yPosition);
  yPosition += 6;

  if (data.projectName) {
    pdf.text(`Obra: ${data.projectName}`, 15, yPosition);
    yPosition += 6;
  }

  yPosition += 4;

  // Línea separadora
  pdf.setDrawColor(200);
  pdf.line(15, yPosition, pageWidth - 15, yPosition);
  yPosition += 8;

  // Concepto
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("CONCEPTO:", 15, yPosition);
  yPosition += 6;

  pdf.setFont("helvetica", "normal");
  const conceptText = `El pago se efectuó en concepto de: ${data.concept}`;
  const conceptLines = pdf.splitTextToSize(conceptText, pageWidth - 30);
  pdf.text(conceptLines, 15, yPosition);
  yPosition += conceptLines.length * 5 + 4;

  // Monto
  yPosition += 4;
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text(`MONTO: $${data.amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 15, yPosition);
  yPosition += 8;

  // Monto en letras
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  const wholeAmount = Math.floor(data.amount);
  const amountInWords = numberToWords(wholeAmount);
  const letterText = `SON PESOS: ${amountInWords}`;
  const letterLines = pdf.splitTextToSize(letterText, pageWidth - 30);
  
  pdf.text(letterLines, 15, yPosition);
  yPosition += letterLines.length * 5 + 10;

  // Espacio para firma
  yPosition = Math.max(yPosition + 10, pageHeight - 40);
  pdf.setDrawColor(0);
  pdf.line(15, yPosition, 60, yPosition);
  pdf.setFontSize(8);
  pdf.text("Firma de quien recibe", 15, yPosition + 4);

  // Pie de página
  pdf.setFontSize(7);
  pdf.setTextColor(100);
  pdf.text("Este documento fue generado automáticamente por el sistema de gestión de contratos.", pageWidth / 2, pageHeight - 8, { align: "center" });

  // Return as Uint8Array
  return pdf.output("arraybuffer") as unknown as Uint8Array;
}

function formatDateForDisplay(dateInput: string | Date): string {
  let dateString: string;
  
  // Convert Date object to string if necessary
  if (dateInput instanceof Date) {
    dateString = dateInput.toISOString().split("T")[0];
  } else {
    dateString = String(dateInput);
  }
  
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}
