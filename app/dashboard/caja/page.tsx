"use client";

import React from "react"

import { useState } from "react";
import useSWR from "swr";
import jsPDF from "jspdf";
import {
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  Landmark,
  Smartphone,
  Banknote,
  DollarSign,
  FileText,
  Download,
  Filter,
  Trash2,
  FileSpreadsheet,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CashMovementForm } from "@/components/caja/cash-movement-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { numberToText } from "@/lib/number-to-text";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const WALLET_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string; currency: "ARS" | "USD" }
> = {
  banco: {
    label: "Banco",
    icon: Landmark,
    color: "bg-primary/10 text-primary",
    currency: "ARS",
  },
  mercado_pago: {
    label: "Mercado Pago",
    icon: Smartphone,
    color: "bg-accent/10 text-accent",
    currency: "ARS",
  },
  efectivo_pesos: {
    label: "Efectivo $",
    icon: Banknote,
    color: "bg-chart-3/10 text-chart-3",
    currency: "ARS",
  },
  efectivo_usd: {
    label: "Efectivo USD",
    icon: DollarSign,
    color: "bg-chart-4/10 text-chart-4",
    currency: "USD",
  },
  cheque: {
    label: "Cheques",
    icon: FileText,
    color: "bg-muted-foreground/10 text-muted-foreground",
    currency: "ARS",
  },
};

function formatCurrency(amount: number, currency: "ARS" | "USD" = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

export default function CajaPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterMethod, setFilterMethod] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"ingreso" | "egreso">(
    "ingreso"
  );
  const [previewMovement, setPreviewMovement] = useState<any>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [showExchangeDialog, setShowExchangeDialog] = useState(false);

  // Load company logo as base64 for PDF generation
  React.useEffect(() => {
    fetch("/logo.png")
      .then((res) => res.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => console.log("Logo not available"));
  }, []);

  // Fetch exchange rate when accessing USD (for wallet transfers only)
  React.useEffect(() => {
    if (currency === "USD" && exchangeRate === 1) {
      fetch("https://dolarapi.com/v1/dolares/oficial")
        .then((res) => res.json())
        .then((data) => {
          const rate = data.venta || data.compra;
          if (rate) setExchangeRate(rate);
        })
        .catch(() => console.log("Could not fetch exchange rate"));
    }
  }, [currency, exchangeRate]);

  const query = new URLSearchParams();
  if (fromDate) query.set("from", fromDate);
  if (toDate) query.set("to", toDate);
  if (filterMethod !== "all") query.set("method", filterMethod);
  query.set("currency", currency);

  const { data, mutate, isLoading } = useSWR(
    `/api/caja?${query.toString()}`,
    fetcher
  );

  // Session (to check role for exchange-rate editing)
  const { data: sessionData } = useSWR(`/api/auth/session`, fetcher);
  const currentUserRole = sessionData?.user?.role || null;

  const balances: Record<string, number> = {};
  if (data?.balances) {
    for (const b of data.balances) {
      balances[b.payment_method] = Number(b.ingresos) - Number(b.egresos);
    }
  }
  const totalCaja = Object.values(balances).reduce((a, b) => a + b, 0);
  const totalEnProyectos = Number(data?.totalEnProyectos || 0);
  const totalEmpresa = totalCaja + totalEnProyectos;
  const movements = data?.movements || [];

  function openDialog(type: "ingreso" | "egreso") {
    setDialogType(type);
    setDialogOpen(true);
  }

  function applyPresetFilter(preset: string) {
    const today = new Date();
    let from = "";
    let to = new Date().toISOString().split("T")[0];

    switch (preset) {
      case "today":
        from = to;
        break;
      case "7days":
        const date7 = new Date();
        date7.setDate(date7.getDate() - 7);
        from = date7.toISOString().split("T")[0];
        break;
      case "15days":
        const date15 = new Date();
        date15.setDate(date15.getDate() - 15);
        from = date15.toISOString().split("T")[0];
        break;
      case "30days":
        const date30 = new Date();
        date30.setDate(date30.getDate() - 30);
        from = date30.toISOString().split("T")[0];
        break;
      case "thismonth":
        from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
        break;
      case "lastmonth":
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        from = lastMonth.toISOString().split("T")[0];
        to = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split("T")[0];
        break;
      default:
        from = "";
        to = "";
    }

    setFromDate(from);
    setToDate(to);
  }

  function generateMovementReceipt(movement: any, withComprobante: boolean = false) {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;

    // Header with company logo
    pdf.setFillColor(37, 99, 235);
    pdf.rect(0, 0, pageWidth, 45, "F");

    // Add logo
    try {
      if (logoBase64) {
        pdf.addImage(logoBase64, "PNG", margin, 5, 22, 22);
        pdf.setFontSize(20);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.text("AM SOLUCIONES", margin + 26, 16);
        pdf.text("CONSTRUCTIVAS", margin + 26, 26);
      } else {
        pdf.setFontSize(24);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.text("AM SOLUCIONES", margin, 18);
        pdf.text("CONSTRUCTIVAS", margin, 30);
      }
    } catch (e) {
      pdf.setFontSize(24);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.text("AM SOLUCIONES", margin, 18);
      pdf.text("CONSTRUCTIVAS", margin, 30);
    }

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text("Sistema de Gestión", margin, 38);

    let yPos = 60;

    // Receipt title
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text(
      movement.type === "ingreso" ? "RECIBO DE INGRESO" : "COMPROBANTE DE EGRESO",
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
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 70);

    yPos += 10;

    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("CONCEPTO:", margin + 5, yPos);
    pdf.setFont("helvetica", "normal");
    const conceptLines = pdf.splitTextToSize(movement.concept || "", pageWidth - 2 * margin - 40);
    pdf.text(conceptLines, margin + 35, yPos);

    yPos += Math.max(conceptLines.length * 5, 7) + 5;

    if (movement.project_name) {
      pdf.setFont("helvetica", "bold");
      pdf.text("CONTRATO:", margin + 5, yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(movement.numero_contrato || movement.project_name, margin + 35, yPos);
      yPos += 7;
    }

    if (movement.client_name) {
      pdf.setFont("helvetica", "bold");
      pdf.text("CLIENTE:", margin + 5, yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(movement.client_name, margin + 35, yPos);
      yPos += 7;
    }

    pdf.setFont("helvetica", "bold");
    pdf.text("MÉTODO:", margin + 5, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(WALLET_CONFIG[movement.payment_method]?.label || movement.payment_method, margin + 35, yPos);

    yPos += 7;

    // Show linked project (if this cash movement was the source for a project transfer)
    if (movement.linked_project_name) {
      pdf.setFont("helvetica", "bold");
      pdf.text("DESTINO:", margin + 5, yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Caja de Obra - ${movement.linked_project_name}`, margin + 35, yPos);
      yPos += 7;
    }

    // If concept contains transfer text, show counterparty wallet
    const transferToMatch = movement.concept ? /Transferencia a (.+)/i.exec(movement.concept) : null;
    const transferFromMatch = movement.concept ? /Transferencia desde (.+)/i.exec(movement.concept) : null;
    const transferCounter = transferToMatch ? transferToMatch[1] : transferFromMatch ? transferFromMatch[1] : null;
    if (transferCounter) {
      pdf.setFont("helvetica", "bold");
      pdf.text(transferToMatch ? "DESTINO:" : "ORIGEN:", margin + 5, yPos);
      pdf.setFont("helvetica", "normal");
      const cpLabel = WALLET_CONFIG[transferCounter]?.label || transferCounter;
      pdf.text(cpLabel, margin + 35, yPos);
      yPos += 7;
    }

    if (movement.category) {
      pdf.setFont("helvetica", "bold");
      pdf.text("CATEGORIA:", margin + 5, yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(movement.category, margin + 35, yPos);
      yPos += 7;
    }

    yPos += 5;

    // Amount box
    pdf.setFillColor(movement.type === "ingreso" ? 34 : 239, movement.type === "ingreso" ? 197 : 68, movement.type === "ingreso" ? 94 : 68);
    pdf.rect(margin, yPos + 5, pageWidth - 2 * margin, 20, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("MONTO:", margin + 5, yPos + 17);
    pdf.setFontSize(16);
    pdf.text(formatCurrency(Number(movement.amount), movement.currency || currency), pageWidth - margin - 5, yPos + 17, { align: "right" });

    yPos += 35;

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
      yPos = pageHeight / 2 + 10;

      // Separator
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(1);
      pdf.setLineDash([5, 3]);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      pdf.setLineDash([]);

      yPos += 15;

      // Comprobante header
      pdf.setFillColor(37, 99, 235);
      pdf.rect(margin, yPos, pageWidth - 2 * margin, 12, "F");

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.text("COMPROBANTE", pageWidth / 2, yPos + 8, { align: "center" });

      yPos += 20;

      // Simple receipt format
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Recibí de: ${movement.client_name || "_____________________________"}`, margin, yPos);
      yPos += 10;
      pdf.text(`La suma de: ${formatCurrency(Number(movement.amount), movement.currency || currency)}`, margin, yPos);
      yPos += 7;
      pdf.setFontSize(9);
      const amountInText = numberToText(Number(movement.amount), movement.currency || currency);
      pdf.setFont("helvetica", "italic");
      pdf.text(`(${amountInText})`, margin, yPos);
      yPos += 7;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`En concepto de: ${movement.concept || "_____________________________"}`, margin, yPos);
      yPos += 10;
      pdf.text(`Contrato N°: ${movement.numero_contrato || "_____________________________"}`, margin, yPos);
      yPos += 10;
      pdf.text(`Fecha: ${new Date(movement.date).toLocaleDateString("es-AR")}`, margin, yPos);

      yPos += 25;

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

  function previewMovementPDF(movement: any, withComprobante: boolean = false) {
    const pdf = generateMovementReceipt(movement, withComprobante);
    const pdfBlob = pdf.output("blob");
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, "_blank");
  }

  function downloadMovementPDF(movement: any, withComprobante: boolean = false) {
    const pdf = generateMovementReceipt(movement, withComprobante);
    const fileName = `${movement.type}_${movement.id}_${new Date().toISOString().split("T")[0]}.pdf`;
    pdf.save(fileName);
    toast.success("Recibo descargado correctamente");
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/caja?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Movimiento eliminado");
      mutate();
    } else {
      toast.error("Error al eliminar movimiento");
    }
  }

  function generatePDFReport() {
    if (!movements || movements.length === 0) {
      toast.error("No hay movimientos para exportar");
      return;
    }

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (2 * margin);
    
    // Set up page number tracking
    let pageNum = 1;
    
    const addHeader = () => {
      // Background header
      pdf.setFillColor(37, 99, 235);
      pdf.rect(0, 0, pageWidth, 35, "F");
      
      // Company title
      pdf.setFontSize(22);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", 'bold');
      pdf.text("AM SOLUCIONES CONSTRUCTIVAS", margin, 15);
      
      // Subtitle
      pdf.setFontSize(10);
      pdf.setFont("helvetica", 'normal');
      pdf.text("Reporte de Movimientos de Caja", margin, 24);
      
      // Date on header
      pdf.setFontSize(9);
      pdf.text(`${new Date().toLocaleDateString('es-AR')}`, pageWidth - margin - 50, 24);
      
      // Page number
      pdf.setFontSize(8);
      pdf.setTextColor(200, 200, 200);
      pdf.text(`P\u00E1gina ${pageNum}`, pageWidth - margin - 15, 28);
      
      pdf.setTextColor(0, 0, 0);
    };
    
    addHeader();
    
    let yPos = 45;
    
    // Filters section
    if (fromDate || toDate || filterMethod !== "all") {
      pdf.setFontSize(10);
      pdf.setFont("helvetica", 'bold');
      pdf.setTextColor(100, 100, 100);
      pdf.text("FILTROS APLICADOS:", margin, yPos);
      yPos += 7;
      
      pdf.setFont("helvetica", 'normal');
      pdf.setFontSize(9);
      
      if (fromDate && toDate) {
        pdf.text(`\u2022 Periodo: ${new Date(fromDate).toLocaleDateString('es-AR')} - ${new Date(toDate).toLocaleDateString('es-AR')}`, margin + 5, yPos);
        yPos += 5;
      } else if (fromDate) {
        pdf.text(`\u2022 Desde: ${new Date(fromDate).toLocaleDateString('es-AR')}`, margin + 5, yPos);
        yPos += 5;
      } else if (toDate) {
        pdf.text(`\u2022 Hasta: ${new Date(toDate).toLocaleDateString('es-AR')}`, margin + 5, yPos);
        yPos += 5;
      }
      
      if (filterMethod !== "all") {
        pdf.text(`\u2022 Medio de pago: ${WALLET_CONFIG[filterMethod]?.label || filterMethod}`, margin + 5, yPos);
        yPos += 5;
      }
      
      yPos += 5;
    }
    
    // Summary box
    const totalIngresos = movements.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + Number(m.amount), 0);
    const totalEgresos = movements.filter(m => m.type === 'egreso').reduce((sum, m) => sum + Number(m.amount), 0);
    const neto = totalIngresos - totalEgresos;
    
    // Summary background
    pdf.setDrawColor(37, 99, 235);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, yPos, contentWidth, 25);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", 'bold');
    
    // Ingresos (green)
    pdf.setTextColor(34, 197, 94);
    pdf.text("INGRESOS:", margin + 5, yPos + 7);
    pdf.setFontSize(11);
    pdf.text(formatCurrency(totalIngresos, currency), margin + 35, yPos + 7);
    
    // Egresos (red)
    pdf.setFontSize(10);
    pdf.setTextColor(239, 68, 68);
    pdf.text("EGRESOS:", margin + 5, yPos + 14);
    pdf.setFontSize(11);
    pdf.text(formatCurrency(totalEgresos, currency), margin + 35, yPos + 14);
    
    // Neto (blue)
    pdf.setFontSize(10);
    pdf.setTextColor(37, 99, 235);
    pdf.text("NETO:", margin + 5, yPos + 21);
    pdf.setFontSize(12);
    pdf.text(formatCurrency(neto, currency), margin + 35, yPos + 21);
    
    yPos += 32;
    
    // Table header with background
    pdf.setDrawColor(37, 99, 235);
    pdf.setLineWidth(0.3);
    pdf.setFillColor(37, 99, 235);
    pdf.rect(margin, yPos - 1, contentWidth, 8, "F");
    
    pdf.setFontSize(9);
    pdf.setFont("helvetica", 'bold');
    pdf.setTextColor(255, 255, 255);
    
    pdf.text("FECHA", margin + 2, yPos + 4);
    pdf.text("TIPO", margin + 16, yPos + 4);
    pdf.text("CONCEPTO", margin + 30, yPos + 4);
    pdf.text("CATEGORIA", margin + 68, yPos + 4);
    pdf.text("MEDIO", margin + 103, yPos + 4);
    pdf.text("MONTO", pageWidth - margin - 3, yPos + 4, { align: "right" });
    
    yPos += 10;
    
    // Table rows
    pdf.setFont("helvetica", 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(0, 0, 0);
    
    let rowCount = 0;
    movements.forEach((movement, index) => {
      // Check if we need a new page (accounting for footer)
      if (yPos > pageHeight - 25) {
        // Add page number to footer
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text("AM Soluciones Constructivas", pageWidth / 2, pageHeight - 10, { align: "center" });
        
        // Add new page
        pdf.addPage();
        pageNum++;
        addHeader();
        yPos = 45;
      }
      
      const fecha = new Date(movement.date).toLocaleDateString('es-AR', { 
        day: '2-digit', 
        month: '2-digit',
        year: '2-digit'
      });
      const tipo = movement.type === 'ingreso' ? 'INGRESO' : 'EGRESO';
      const concepto = movement.concept?.substring(0, 28) || '';
      const categoria = movement.category?.substring(0, 18) || '';
      const medio = WALLET_CONFIG[movement.payment_method]?.label?.substring(0, 14) || movement.payment_method.substring(0, 14);
      const monto = formatCurrency(Number(movement.amount), movement.currency || currency);
      
      // Alternate row background for readability
      if (rowCount % 2 === 0) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(margin, yPos - 2, contentWidth, 6, "F");
      }
      
      // Draw cell borders
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.1);
      pdf.rect(margin, yPos - 2, contentWidth, 6);
      
      pdf.text(fecha, margin + 2, yPos + 1.5);
      
      // Color code the type
      if (movement.type === 'ingreso') {
        pdf.setTextColor(34, 197, 94);
      } else {
        pdf.setTextColor(239, 68, 68);
      }
      pdf.text(tipo, margin + 16, yPos + 1.5);
      pdf.setTextColor(0, 0, 0);
      
      pdf.text(concepto, margin + 30, yPos + 1.5);
      pdf.text(categoria, margin + 68, yPos + 1.5);
      pdf.text(medio, margin + 103, yPos + 1.5);
      
      // Color monto
      if (movement.type === 'ingreso') {
        pdf.setTextColor(34, 197, 94);
      } else {
        pdf.setTextColor(239, 68, 68);
      }
      pdf.text(monto, pageWidth - margin - 3, yPos + 1.5, { align: "right" });
      pdf.setTextColor(0, 0, 0);
      
      yPos += 7;
      rowCount++;
    });
    
    // Footer on last page
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text("AM Soluciones Constructivas - Reporte Automatizado", pageWidth / 2, pageHeight - 10, { align: "center" });
    pdf.text(`Total de movimientos: ${movements.length}`, margin, pageHeight - 10);
    
    const fileName = `reporte-movimientos-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    
    toast.success("Reporte PDF generado exitosamente");
  }

  function generateExcelReport() {
    if (!movements || movements.length === 0) {
      toast.error("No hay movimientos para exportar");
      return;
    }

    try {
      // Import ExcelJS for professional Excel generation
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Movimientos", { pageSetup: { paperSize: 9, orientation: 'landscape' } });

      // Color palette from the app
      const primaryBlue = 'FF2563EB';   // rgb(37, 99, 235)
      const darkBlue = 'FF1F2937';      // rgb(31, 41, 55)
      const successGreen = 'FF22C55E';  // rgb(34, 197, 94)
      const errorRed = 'FFEF4444';      // rgb(239, 68, 68)
      const lightGray = 'FFF3F4F6';     // rgb(243, 244, 246)
      const borderGray = 'FFD1D5DB';    // rgb(209, 213, 219)

      // Set column widths
      worksheet.columns = [
        { header: 'Fecha', width: 14, key: 'fecha' },
        { header: 'Tipo', width: 12, key: 'tipo' },
        { header: 'Concepto', width: 40, key: 'concepto' },
        { header: 'Categoría', width: 18, key: 'categoria' },
        { header: 'Medio de Pago', width: 16, key: 'medio' },
        { header: 'Cliente', width: 22, key: 'cliente' },
        { header: 'Proyecto', width: 35, key: 'proyecto' },
        { header: 'Monto', width: 16, key: 'monto' }
      ];

      // Title row (merged cells)
      const titleRow = worksheet.insertRow(1, []);
      titleRow.height = 28;
      worksheet.mergeCells('A1:H1');
      const titleCell = titleRow.getCell(1);
      titleCell.value = 'REPORTE DE MOVIMIENTOS DE CAJA';
      titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryBlue } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Subtitle with date row
      const subtitleRow = worksheet.insertRow(2, []);
      subtitleRow.height = 20;
      worksheet.mergeCells('A2:H2');
      const subtitleCell = subtitleRow.getCell(1);
      subtitleCell.value = `Generado: ${new Date().toLocaleDateString('es-AR')} - ${new Date().toLocaleTimeString('es-AR')}`;
      subtitleCell.font = { name: 'Calibri', size: 11, color: { argb: 'FF6B7280' } };
      subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };

      // Empty row
      worksheet.insertRow(3, []);

      // Header row (starts at row 4)
      const headerRow = worksheet.getRow(4);
      headerRow.height = 22;
      headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryBlue } };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

      // Apply header border
      for (let col = 1; col <= 8; col++) {
        const cell = headerRow.getCell(col);
        cell.border = {
          top: { style: 'thin', color: { argb: primaryBlue } },
          bottom: { style: 'thin', color: { argb: primaryBlue } },
          left: { style: 'thin', color: { argb: primaryBlue } },
          right: { style: 'thin', color: { argb: primaryBlue } }
        };
      }

      // Data rows
      let rowNum = 5;
      const totalIngresos = movements.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + Number(m.amount), 0);
      const totalEgresos = movements.filter(m => m.type === 'egreso').reduce((sum, m) => sum + Number(m.amount), 0);
      const neto = totalIngresos - totalEgresos;

      movements.forEach((movement, index) => {
        const row = worksheet.getRow(rowNum);
        row.height = 25;

        // Alternate row coloring
        const isEven = index % 2 === 0;
        const bgColor = isEven ? 'FFFFFFFF' : lightGray;

        row.getCell(1).value = new Date(movement.date).toLocaleDateString('es-AR');
        row.getCell(2).value = movement.type === 'ingreso' ? 'INGRESO' : 'EGRESO';
        row.getCell(3).value = movement.concept || '';
        row.getCell(4).value = movement.category || '';
        row.getCell(5).value = WALLET_CONFIG[movement.payment_method]?.label || movement.payment_method;
        row.getCell(6).value = movement.client_name || '';
        row.getCell(7).value = movement.project_name || '';
        row.getCell(8).value = Number(movement.amount);

        // Format row style
        for (let col = 1; col <= 8; col++) {
          const cell = row.getCell(col);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
          cell.border = {
            top: { style: 'thin', color: { argb: borderGray } },
            bottom: { style: 'thin', color: { argb: borderGray } },
            left: { style: 'thin', color: { argb: borderGray } },
            right: { style: 'thin', color: { argb: borderGray } }
          };
          cell.font = { name: 'Calibri', size: 10, color: { argb: darkBlue } };
        }

        // Color code the type
        const typeCell = row.getCell(2);
        typeCell.font = { 
          name: 'Calibri', 
          size: 10, 
          bold: true,
          color: { argb: movement.type === 'ingreso' ? successGreen : errorRed } 
        };

        // Format monto (currency)
        const montoCell = row.getCell(8);
        montoCell.numFmt = '"$"#,##0.00';
        montoCell.alignment = { horizontal: 'right' };
        montoCell.font = { 
          name: 'Calibri', 
          size: 10, 
          bold: true,
          color: { argb: movement.type === 'ingreso' ? successGreen : errorRed } 
        };

        // Center alignment for fecha y tipo
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(2).alignment = { horizontal: 'center' };

        // Enable text wrapping for Concepto and Proyecto columns
        row.getCell(3).alignment = { wrapText: true, vertical: 'top' };
        row.getCell(7).alignment = { wrapText: true, vertical: 'top' };

        rowNum++;
      });

      // Empty row before summary
      worksheet.insertRow(rowNum, []);
      rowNum++;

      // SUMMARY SECTION
      const summaryStartRow = rowNum;

      // Total Ingresos
      const ingresosRow = worksheet.getRow(rowNum);
      ingresosRow.height = 20;
      worksheet.mergeCells(`A${rowNum}:G${rowNum}`);
      ingresosRow.getCell(1).value = 'TOTAL INGRESOS';
      ingresosRow.getCell(8).value = totalIngresos;
      ingresosRow.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      ingresosRow.getCell(8).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      ingresosRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: successGreen } };
      ingresosRow.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: successGreen } };
      ingresosRow.getCell(8).numFmt = '"$"#,##0.00';
      ingresosRow.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
      ingresosRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };

      for (let col = 1; col <= 8; col++) {
        const cell = ingresosRow.getCell(col);
        cell.border = { top: { style: 'thin', color: { argb: successGreen } }, bottom: { style: 'thin', color: { argb: successGreen } } };
      }
      rowNum++;

      // Total Egresos
      const egresosRow = worksheet.getRow(rowNum);
      egresosRow.height = 20;
      worksheet.mergeCells(`A${rowNum}:G${rowNum}`);
      egresosRow.getCell(1).value = 'TOTAL EGRESOS';
      egresosRow.getCell(8).value = totalEgresos;
      egresosRow.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      egresosRow.getCell(8).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      egresosRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: errorRed } };
      egresosRow.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: errorRed } };
      egresosRow.getCell(8).numFmt = '"$"#,##0.00';
      egresosRow.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
      egresosRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };

      for (let col = 1; col <= 8; col++) {
        const cell = egresosRow.getCell(col);
        cell.border = { top: { style: 'thin', color: { argb: errorRed } }, bottom: { style: 'thin', color: { argb: errorRed } } };
      }
      rowNum++;

      // Neto (Total)
      const netoRow = worksheet.getRow(rowNum);
      netoRow.height = 24;
      worksheet.mergeCells(`A${rowNum}:G${rowNum}`);
      netoRow.getCell(1).value = 'NETO';
      netoRow.getCell(8).value = neto;
      netoRow.getCell(1).font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      netoRow.getCell(8).font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      netoRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryBlue } };
      netoRow.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryBlue } };
      netoRow.getCell(8).numFmt = '"$"#,##0.00';
      netoRow.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
      netoRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };

      for (let col = 1; col <= 8; col++) {
        const cell = netoRow.getCell(col);
        cell.border = { top: { style: 'thin', color: { argb: primaryBlue } }, bottom: { style: 'thin', color: { argb: primaryBlue } } };
      }

      // Freeze panes
      worksheet.views = [{ state: 'frozen', ySplit: 4 }];

      // Generate and download
      const filename = `movimientos-caja-${new Date().toISOString().split('T')[0]}.xlsx`;
      
      workbook.xlsx.writeBuffer().then((buffer: any) => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("Archivo Excel profesional generado");
      }).catch((error: any) => {
        console.error("Error writing Excel:", error);
        toast.error("Error al generar el archivo Excel");
      });
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error("Error al generar el archivo Excel");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <PageHeader
          title={currency === "ARS" ? "Caja General" : "Caja de Ahorros USD"}
          description={
            currency === "ARS"
              ? "Tesorería — flujo de caja en pesos argentinos"
              : "Tesorería — caja de ahorro en dólares"
          }
        />
        {/* Prominent currency switcher */}
        <div className="flex gap-1 rounded-xl bg-muted p-1 w-fit">
          <button
            onClick={() => { setCurrency("ARS"); setFilterMethod("all"); }}
            className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
              currency === "ARS"
                ? "bg-background text-primary shadow-sm ring-1 ring-primary/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="font-bold text-base leading-none">$</span>
            Caja General
            <span className="text-xs font-normal opacity-60">ARS</span>
          </button>
          <button
            onClick={() => { setCurrency("USD"); setFilterMethod("all"); }}
            className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
              currency === "USD"
                ? "bg-amber-100 text-amber-800 shadow-sm ring-1 ring-amber-300 dark:bg-amber-900/60 dark:text-amber-200 dark:ring-amber-600"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <DollarSign className="h-4 w-4" />
            Caja Dólares
            <span className="text-xs font-normal opacity-60">USD</span>
            {currency === "USD" && (
              <span className="ml-1 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-800 dark:text-amber-100">
                TC ${exchangeRate.toFixed(0)}
              </span>
            )}
          </button>
        </div>
        {/* Exchange rate banner when USD is active */}
        {currency === "USD" && (
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <DollarSign className="h-4 w-4" />
            <span>
              Tasa de cambio oficial (dolarapi.com): <strong>1 USD = ${exchangeRate.toFixed(2)} ARS</strong>
            </span>
            <button
              onClick={() => setShowExchangeDialog(true)}
              className="ml-1 text-xs underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200"
            >
              Editar
            </button>
          </div>
        )}
      </div>

      {/* Total */}
      <Card className={currency === "USD" ? "border-amber-300/60 bg-amber-50/60 dark:border-amber-700/40 dark:bg-amber-950/30" : "border-primary/20 bg-primary/5"}>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {currency === "USD" ? "Disponible en Caja Dólares (USD)" : "Disponible en Caja General (ARS)"}
              </p>
              <p
                className={`text-3xl font-bold ${totalCaja >= 0 ? "text-foreground" : "text-destructive"}`}
              >
                {formatCurrency(totalCaja, currency)}
              </p>
            </div>
            {currency === "ARS" && (
              <div className="border-l pl-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Neto del Periodo
                </p>
                {(() => {
                  const ingresos = movements
                    .filter(m => m.type === 'ingreso')
                    .reduce((sum, m) => sum + Number(m.amount), 0);
                  const egresos = movements
                    .filter(m => m.type === 'egreso')
                    .reduce((sum, m) => sum + Number(m.amount), 0);
                  const neto = ingresos - egresos;
                  return (
                    <p className={`text-xl font-semibold ${neto >= 0 ? "text-accent" : "text-destructive"}`}>
                      {neto >= 0 ? "+" : "-"}{formatCurrency(Math.abs(neto), currency)}
                    </p>
                  );
                })()}
              </div>
            )}
            <div className="border-l pl-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Total Empresa
              </p>
              <p className={`text-xl font-semibold ${totalEmpresa >= 0 ? "text-foreground" : "text-destructive"}`}>
                {formatCurrency(totalEmpresa, currency)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => openDialog("ingreso")}
              className={currency === "USD" ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-accent text-accent-foreground hover:bg-accent/90"}
            >
              <ArrowDownCircle className="mr-2 h-4 w-4" />
              {currency === "USD" ? "Recibir Dólares" : "Ingreso"}
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => openDialog("egreso")}
              className={currency === "USD" ? "bg-amber-700 hover:bg-amber-800" : ""}
            >
              <ArrowUpCircle className="mr-2 h-4 w-4" />
              {currency === "USD" ? "Enviar Dólares" : "Egreso"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Cards */}
      <div className={currency === "USD" ? "flex gap-3" : "grid gap-3 md:grid-cols-3 lg:grid-cols-5"}>
        {Object.entries(WALLET_CONFIG)
          .filter(([_, config]) => config.currency === currency)
          .map(([key, config]) => {
            const amount = balances[key] || 0;
            // balances returned by the API are already in the selected currency
                  const displayAmount = amount;
            return (
              <Card key={key} className={currency === "USD" ? "border-amber-300/50 flex-1 max-w-xs" : ""}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.color}`}
                  >
                    <config.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {config.label}
                    </p>
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(displayAmount, currency)}
                    </p>
                    {currency === "USD" && exchangeRate > 0 && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        ≈ {formatCurrency(displayAmount * exchangeRate, "ARS")}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Filtros</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* Preset filters */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPresetFilter("today")}
                className="h-8 text-xs"
              >
                Hoy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPresetFilter("7days")}
                className="h-8 text-xs"
              >
                Últimos 7 días
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPresetFilter("15days")}
                className="h-8 text-xs"
              >
                Últimos 15 días
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPresetFilter("30days")}
                className="h-8 text-xs"
              >
                Últimos 30 días
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPresetFilter("thismonth")}
                className="h-8 text-xs"
              >
                Este mes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPresetFilter("lastmonth")}
                className="h-8 text-xs"
              >
                Mes anterior
              </Button>
            </div>

            {/* Custom filters */}
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Desde</Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-9 w-40"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Hasta</Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-9 w-40"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Medio de Pago</Label>
                <Select value={filterMethod} onValueChange={setFilterMethod}>
                  <SelectTrigger className="h-9 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {currency === "ARS" ? (
                      <>
                        <SelectItem value="banco">Banco</SelectItem>
                        <SelectItem value="mercado_pago">Mercado Pago</SelectItem>
                        <SelectItem value="efectivo_pesos">Efectivo $</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </>
                    ) : (
                      <SelectItem value="efectivo_usd">Efectivo USD</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {(fromDate || toDate || filterMethod !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                    setFilterMethod("all");
                  }}
                >
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movements Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-medium">
            Movimientos{" "}
            <span className="text-muted-foreground">
              ({movements.length})
            </span>
          </CardTitle>
          {movements.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={generatePDFReport}
                className="h-8 px-3 text-xs"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={generateExcelReport}
                className="h-8 px-3 text-xs"
              >
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                Excel
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : movements.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay movimientos registrados
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {movements.map((m: {
                id: number;
                type: string;
                amount: number;
                payment_method: string;
                concept: string;
                category: string | null;
                date: string;
                client_name: string | null;
                project_name: string | null;
              }) => {
                const movementRate = m.exchange_rate || exchangeRate;
                      let displayAmount = Number(m.amount);
                      // If movement currency differs from the selected page currency, convert using recorded exchange rate
                      if (m.currency && m.currency !== currency) {
                        if (m.currency === "ARS" && currency === "USD") displayAmount = Number(m.amount) / movementRate;
                        if (m.currency === "USD" && currency === "ARS") displayAmount = Number(m.amount) * movementRate;
                      }
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        m.type === "ingreso"
                          ? "bg-accent/10 text-accent"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {m.type === "ingreso" ? (
                        <ArrowDownCircle className="h-4 w-4" />
                      ) : (
                        <ArrowUpCircle className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {m.concept}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {new Date(m.date).toLocaleDateString("es-AR")}
                        </span>
                        <span>&middot;</span>
                        <span>
                          {WALLET_CONFIG[m.payment_method]?.label ||
                            m.payment_method}
                        </span>
                        {m.client_name && (
                          <>
                            <span>&middot;</span>
                            <span>{m.client_name}</span>
                          </>
                        )}

                        {/* If this cash_movement was the SOURCE for a project transfer, show destination obra */}
                        {m.linked_project_name && (
                          <>
                            <span>&middot;</span>
                            <span>Transferencia a obra: {m.linked_project_name}</span>
                          </>
                        )}

                        {/* Parse transfer concept to show counterparty wallet when explicit link not stored */}
                        {(() => {
                          const concept = m.concept || "";
                          const toMatch = /Transferencia a (.+)/i.exec(concept);
                          const fromMatch = /Transferencia desde (.+)/i.exec(concept);
                          const counter = toMatch ? toMatch[1] : fromMatch ? fromMatch[1] : null;
                          if (!counter) return null;
                          const label = WALLET_CONFIG[counter]?.label || counter;
                          return (
                            <>
                              <span>&middot;</span>
                              <span>{toMatch ? `A: ${label}` : `Desde: ${label}`}</span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => previewMovementPDF(m, false)}
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => previewMovementPDF(m, true)}
                        title="Ver con comprobante"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Â¿Eliminar movimiento?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. El movimiento
                              serÃ¡ eliminado permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(m.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="flex flex-col items-end">
                      <span
                        className={`text-sm font-bold ${
                          m.type === "ingreso"
                            ? "text-accent"
                            : "text-destructive"
                        }`}
                      >
                        {m.type === "ingreso" ? "+" : "-"}
                        {formatCurrency(Number(displayAmount), currency)}
                      </span>
                      {m.currency === "USD" && currency === "USD" && movementRate ? (
                        <span className="text-xs text-muted-foreground mt-1">
                          {formatCurrency(Number(m.amount) * Number(movementRate), "ARS")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {movements.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No hay movimientos registrados
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Movement Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogType === "ingreso"
                ? "Registrar Ingreso"
                : "Registrar Egreso"}
            </DialogTitle>
          </DialogHeader>
          <CashMovementForm
            type={dialogType}
            currency={currency}
            onSuccess={() => {
              setDialogOpen(false);
              mutate();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Exchange Rate Dialog */}
      <Dialog open={showExchangeDialog} onOpenChange={setShowExchangeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar Tasa de Cambio</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="exchange-rate">Tasa de Cambio ($/USD)</Label>
              <Input
                id="exchange-rate"
                type="number"
                step="0.01"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1)}
                placeholder="Ingrese la tasa de cambio"
                disabled={currentUserRole !== 'admin'}
              />
              <p className="text-xs text-muted-foreground">
                Tasa oficial actual: ${exchangeRate.toFixed(2)}
              </p>
              {currentUserRole !== 'admin' && (
                <p className="text-xs text-muted-foreground">Sólo administradores pueden editar la tasa; el valor mostrado proviene de dolarapi.com.</p>
              )}
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const res = await fetch("https://dolarapi.com/v1/dolares/oficial");
                  const data = await res.json();
                  const rate = data.venta || data.compra;
                  if (rate) setExchangeRate(rate);
                } catch (err) {
                  console.error("Error fetching exchange rate:", err);
                }
              }}
              size="sm"
            >
              Obtener Tasa Actual
            </Button>
            <Button
              onClick={() => setShowExchangeDialog(false)}
              className="w-full"
              disabled={currentUserRole !== 'admin'}
            >
              Confirmar
            </Button>
            {currentUserRole !== 'admin' && (
              <p className="text-xs text-muted-foreground mt-2">No tienes permisos para modificar la tasa.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
