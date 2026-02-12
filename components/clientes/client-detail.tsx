"use client";

import React from "react"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Edit,
  MapPin,
  Phone,
  Mail,
  Calendar,
  FileText,
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  Plus,
  DollarSign,
  Download,
  Trash2,
  Upload,
  StickyNote,
  Paperclip,
  ExternalLink,
  Eye,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useSWR from "swr";
import { toast } from "sonner";
import { ClientForm } from "./client-form";
import jsPDF from "jspdf";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(amount);
}

interface Client {
  id: number;
  apellido_nombre: string;
  numero_contrato: string;
  dni: string;
  domicilio_legal: string;
  domicilio_obra: string;
  telefono: string | null;
  email: string | null;
  denominacion: string | null;
  estado: string;
  fecha_alta: string;
  plan_pago: string | null;
  observaciones: string | null;
  presupuesto_observacion: string | null;
  tiempo_obra_estimado: string | null;
  agenda_inicio: string | null;
  agenda_cierre: string | null;
}

export function ClientDetail({
  client,
  onUpdate,
}: {
  client: Client;
  onUpdate: () => void;
}) {
  const [editing, setEditing] = useState(false);

  const generatePDF = async () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Colors - Professional palette
      const primaryBlue = [37, 99, 235]; // rgb(37, 99, 235) - primary blue
      const darkGray = [31, 41, 55];     // rgb(31, 41, 55) - text
      const lightGray = [156, 163, 175]; // rgb(156, 163, 175) - muted
      const accentBlue = [59, 130, 246]; // rgb(59, 130, 246) - accent
      
      // Header section with primary color background - using full width
      doc.setFillColor(...primaryBlue);
      doc.rect(0, 0, pageWidth, 50, 'F');
      
      // Company name in header - without logo
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text("AM SOLUCIONES CONSTRUCTIVAS", 15, 22);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text("Sistema Integral de Gestión", 15, 32);
      
      // Document title
      doc.setTextColor(...darkGray);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text("FICHA TÉCNICA DE CLIENTE", 10, 70);
      
      // Decorative line under title
      doc.setDrawColor(...accentBlue);
      doc.setLineWidth(2);
      doc.line(10, 75, 120, 75);
      
      // Client main info box - using more page width
      let yPos = 90;
      doc.setFillColor(248, 250, 252); // Very light gray background
      doc.setDrawColor(...lightGray);
      doc.roundedRect(10, yPos, pageWidth - 20, 35, 3, 3, 'DF');
      
      // Client name (prominent)
      doc.setTextColor(...primaryBlue);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(client.apellido_nombre.toUpperCase(), 15, yPos + 12);
      
      // Contract and DNI
      doc.setTextColor(...darkGray);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Contrato: ${client.numero_contrato}`, 15, yPos + 22);
      doc.text(`DNI: ${client.dni}`, 15, yPos + 30);
      
      // Status badge
      const statusX = pageWidth - 60;
      const statusColor = client.estado === 'activo' ? [34, 197, 94] : lightGray; // Green or gray
      doc.setFillColor(...statusColor);
      doc.roundedRect(statusX, yPos + 8, 35, 12, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(client.estado.toUpperCase(), statusX + 3, yPos + 16);
      
      yPos += 50;
      
      // Section: Contact Information
      addSection(doc, "INFORMACIÓN DE CONTACTO", yPos, primaryBlue, darkGray);
      yPos += 20;
      
      if (client.telefono || client.email) {
        doc.setTextColor(...darkGray);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        if (client.telefono) {
          doc.setFont('helvetica', 'bold');
          doc.text("Teléfono:", 15, yPos);
          doc.setFont('helvetica', 'normal');
          doc.text(client.telefono, 45, yPos);
          yPos += 8;
        }
        
        if (client.email) {
          doc.setFont('helvetica', 'bold');
          doc.text("Email:", 15, yPos);
          doc.setFont('helvetica', 'normal');
          doc.text(client.email, 45, yPos);
          yPos += 8;
        }
      } else {
        doc.setTextColor(...lightGray);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text("No se ha registrado información de contacto.", 15, yPos);
        yPos += 8;
      }
      
      yPos += 10;
      
      // Section: Addresses
      addSection(doc, "DOMICILIOS", yPos, primaryBlue, darkGray);
      yPos += 20;
      
      // Legal address
      doc.setTextColor(...darkGray);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("Domicilio Legal:", 15, yPos);
      yPos += 8;
      
      doc.setFont('helvetica', 'normal');
      const legalLines = doc.splitTextToSize(client.domicilio_legal, pageWidth - 30);
      doc.text(legalLines, 15, yPos);
      yPos += legalLines.length * 6 + 8;
      
      // Work address
      doc.setFont('helvetica', 'bold');
      doc.text("Domicilio de Obra:", 15, yPos);
      yPos += 8;
      
      doc.setFont('helvetica', 'normal');
      const workLines = doc.splitTextToSize(client.domicilio_obra, pageWidth - 30);
      doc.text(workLines, 15, yPos);
      yPos += workLines.length * 6 + 15;
      
      // Section: Additional Information
      if (client.denominacion || client.plan_pago || client.tiempo_obra_estimado) {
        addSection(doc, "INFORMACIÓN DEL PROYECTO", yPos, primaryBlue, darkGray);
        yPos += 20;
        
        doc.setTextColor(...darkGray);
        doc.setFontSize(11);
        
        if (client.denominacion) {
          doc.setFont('helvetica', 'bold');
          doc.text("Denominación:", 15, yPos);
          doc.setFont('helvetica', 'normal');
          const denomLines = doc.splitTextToSize(client.denominacion, pageWidth - 60);
          doc.text(denomLines, 60, yPos);
          yPos += Math.max(denomLines.length * 6, 8);
        }
        
        if (client.plan_pago) {
          doc.setFont('helvetica', 'bold');
          doc.text("Plan de Pago:", 15, yPos);
          doc.setFont('helvetica', 'normal');
          const planLines = doc.splitTextToSize(client.plan_pago, pageWidth - 60);
          doc.text(planLines, 60, yPos);
          yPos += Math.max(planLines.length * 6, 8);
        }
        
        if (client.tiempo_obra_estimado) {
          doc.setFont('helvetica', 'bold');
          doc.text("Tiempo Estimado:", 15, yPos);
          doc.setFont('helvetica', 'normal');
          doc.text(client.tiempo_obra_estimado, 65, yPos);
          yPos += 8;
        }
        
        yPos += 10;
      }
      
      // Section: Observations
      if (client.observaciones || client.presupuesto_observacion) {
        addSection(doc, "OBSERVACIONES", yPos, primaryBlue, darkGray);
        yPos += 20;
        
        doc.setTextColor(...darkGray);
        doc.setFontSize(11);
        
        if (client.presupuesto_observacion) {
          doc.setFont('helvetica', 'bold');
          doc.text("Presupuesto:", 15, yPos);
          yPos += 8;
          
          doc.setFont('helvetica', 'normal');
          const presupLines = doc.splitTextToSize(client.presupuesto_observacion, pageWidth - 30);
          doc.text(presupLines, 15, yPos);
          yPos += presupLines.length * 6 + 8;
        }
        
        if (client.observaciones) {
          doc.setFont('helvetica', 'bold');
          doc.text("Generales:", 15, yPos);
          yPos += 8;
          
          doc.setFont('helvetica', 'normal');
          const obsLines = doc.splitTextToSize(client.observaciones, pageWidth - 30);
          doc.text(obsLines, 15, yPos);
        }
      }
      
      // Footer
      doc.setTextColor(...lightGray);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const footerY = pageHeight - 25;
      
      // Separator line
      doc.setDrawColor(...lightGray);
      doc.setLineWidth(0.5);
      doc.line(10, footerY - 5, pageWidth - 10, footerY - 5);
      
      // Generation info
      const genDate = new Date().toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(`Documento generado el ${genDate}`, 10, footerY);
      doc.text("AM Soluciones Constructivas - Sistema de Gestión", pageWidth - 10, footerY, { align: 'right' });
      
      // Download
      const fileName = `Ficha_${client.apellido_nombre.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}.pdf`;
      doc.save(fileName);
      toast.success("Ficha PDF generada correctamente");
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    }
  };
  
  // Helper function for section headers
  const addSection = (doc: any, title: string, yPos: number, primaryColor: number[], textColor: number[]) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Section background - using more width
    doc.setFillColor(248, 250, 252);
    doc.rect(10, yPos - 8, pageWidth - 20, 16, 'F');
    
    // Section title
    doc.setTextColor(...primaryColor);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 15, yPos);
    
    // Decorative line
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(1);
    doc.line(15, yPos + 3, 15 + title.length * 2.5, yPos + 3);
  };

  if (editing) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Editar Cliente</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(false)}
          >
            Cancelar
          </Button>
        </div>
        <ClientForm
          clientId={client.id}
          initialData={{
            apellido_nombre: client.apellido_nombre,
            numero_contrato: client.numero_contrato,
            dni: client.dni,
            domicilio_legal: client.domicilio_legal,
            domicilio_obra: client.domicilio_obra,
            telefono: client.telefono || "",
            email: client.email || "",
            presupuesto_observacion: client.presupuesto_observacion || "",
            fecha_alta: client.fecha_alta
              ? client.fecha_alta.split("T")[0]
              : "",
            denominacion: client.denominacion || "",
            plan_pago: client.plan_pago || "",
            observaciones: client.observaciones || "",
            tiempo_obra_estimado: client.tiempo_obra_estimado || "",
            agenda_inicio: client.agenda_inicio
              ? client.agenda_inicio.split("T")[0]
              : "",
            agenda_cierre: client.agenda_cierre
              ? client.agenda_cierre.split("T")[0]
              : "",
          }}
          onSuccess={() => {
            setEditing(false);
            onUpdate();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {client.apellido_nombre}
          </h2>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              {client.numero_contrato}
            </span>
            <span>DNI: {client.dni}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={client.estado === "activo" ? "default" : "secondary"}
            className={
              client.estado === "activo"
                ? "bg-accent text-accent-foreground"
                : ""
            }
          >
            {client.estado}
          </Badge>
          <Button variant="outline" size="sm" onClick={generatePDF}>
            <Download className="mr-2 h-3.5 w-3.5" />
            Exportar PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit className="mr-2 h-3.5 w-3.5" />
            Editar
          </Button>
        </div>
      </div>

      <Separator />

      <Tabs defaultValue="datos" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="datos">Datos Personales</TabsTrigger>
          <TabsTrigger value="operacion">Operacion</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="cuenta_corriente">Cuenta Corriente</TabsTrigger>
          <TabsTrigger value="notas">
            <StickyNote className="mr-2 h-4 w-4" />
            Notas
          </TabsTrigger>
          <TabsTrigger value="archivos">
            <Paperclip className="mr-2 h-4 w-4" />
            Archivos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="datos" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoRow
              icon={<MapPin className="h-4 w-4" />}
              label="Domicilio Legal"
              value={client.domicilio_legal}
            />
            <InfoRow
              icon={<MapPin className="h-4 w-4" />}
              label="Domicilio de Obra"
              value={client.domicilio_obra}
            />
            <InfoRow
              icon={<Phone className="h-4 w-4" />}
              label="Telefono"
              value={client.telefono || "No registrado"}
            />
            <InfoRow
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              value={client.email || "No registrado"}
            />
          </div>
        </TabsContent>

        <TabsContent value="operacion" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label="Fecha de Alta"
              value={
                client.fecha_alta
                  ? new Date(client.fecha_alta).toLocaleDateString("es-AR")
                  : "No registrada"
              }
            />
            <InfoRow
              icon={<FileText className="h-4 w-4" />}
              label="Denominacion"
              value={client.denominacion || "Sin denominacion"}
            />
            <div className="sm:col-span-2">
              <InfoRow
                label="Plan de Pago"
                value={client.plan_pago || "No especificado"}
              />
            </div>
            <div className="sm:col-span-2">
              <InfoRow
                label="Presupuesto - Observaciones"
                value={
                  client.presupuesto_observacion || "Sin observaciones"
                }
              />
            </div>
            <InfoRow
              label="Tiempo Estimado"
              value={client.tiempo_obra_estimado || "No especificado"}
            />
            <div className="sm:col-span-2">
              <InfoRow
                label="Observaciones"
                value={client.observaciones || "Sin observaciones"}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="agenda" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label="Fecha Inicio Prevista"
              value={
                client.agenda_inicio
                  ? new Date(client.agenda_inicio).toLocaleDateString(
                      "es-AR"
                    )
                  : "No definida"
              }
            />
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label="Fecha Cierre Prevista"
              value={
                client.agenda_cierre
                  ? new Date(client.agenda_cierre).toLocaleDateString(
                      "es-AR"
                    )
                  : "No definida"
              }
            />
          </div>
        </TabsContent>

        <TabsContent value="cuenta_corriente" className="mt-4">
          <CuentaCorrienteTab clientId={client.id} />
        </TabsContent>

        <TabsContent value="notas" className="mt-4">
          <NotasTab clientId={client.id} clientName={client.apellido_nombre} />
        </TabsContent>

        <TabsContent value="archivos" className="mt-4">
          <ArchivosTab clientId={client.id} clientName={client.apellido_nombre} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CuentaCorrienteTab({ clientId }: { clientId: number }) {
  const { data, mutate, isLoading } = useSWR(
    `/api/clientes/${clientId}/cuenta-corriente`,
    fetcher
  );
  const { data: clientData } = useSWR(
    `/api/clientes/${clientId}`,
    fetcher
  );
  const { data: projectsData } = useSWR<{ projects: { id: number; nombre: string }[] }>(
    "/api/proyectos",
    fetcher
  );
  const clientProjects = (projectsData?.projects || []).filter(
    (p: { client_id?: number }) => (p as { client_id?: number }).client_id === clientId
  );
  const [addingMovement, setAddingMovement] = useState(false);
  const [formData, setFormData] = useState({
    type: "cargo",
    amount: "",
    payment_method: "banco",
    concept: "",
    project_id: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const movements = data?.movements || [];
  const summary = data?.summary || {
    total_cobrado: 0,
    total_cargado: 0,
    saldo: 0,
  };

  const generateAccountStatementPDF = () => {
    const client = clientData?.client;
    if (!client) {
      toast.error("Datos del cliente no disponibles");
      return;
    }

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (2 * margin);

    // Header with background
    pdf.setFillColor(37, 99, 235);
    pdf.rect(0, 0, pageWidth, 40, "F");

    // Company title
    pdf.setFontSize(22);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont(undefined, 'bold');
    pdf.text("AM SOLUCIONES CONSTRUCTIVAS", margin, 13);

    // Subtitle
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.text("Estado de Cuenta Corriente", margin, 23);

    // Date on header
    pdf.setFontSize(9);
    pdf.text(`${new Date().toLocaleDateString('es-AR')}`, pageWidth - margin - 50, 23);

    pdf.setTextColor(0, 0, 0);

    let yPos = 50;

    // Client info section
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    pdf.text("DATOS DEL CLIENTE", margin, yPos);
    yPos += 7;

    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(9);
    pdf.text(`Nombre: ${client.apellido_nombre}`, margin, yPos);
    yPos += 5;
    pdf.text(`Contrato: ${client.numero_contrato}`, margin, yPos);
    yPos += 5;
    pdf.text(`DNI: ${client.dni}`, margin, yPos);
    yPos += 5;
    pdf.text(`Email: ${client.email || 'No registrado'}`, margin, yPos);
    yPos += 10;

    // Summary section with colored boxes
    const summaryBoxY = yPos;
    const boxWidth = (contentWidth - 6) / 3;

    // Total Cobrado (Green)
    pdf.setDrawColor(34, 197, 94);
    pdf.setFillColor(220, 252, 231);
    pdf.rect(margin, summaryBoxY, boxWidth, 20, "FD");
    pdf.setTextColor(34, 197, 94);
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(9);
    pdf.text("TOTAL COBRADO", margin + 3, summaryBoxY + 6);
    pdf.setFontSize(11);
    pdf.text(formatCurrency(summary.total_cobrado), margin + 3, summaryBoxY + 14);

    // Total Cargado (Red)
    pdf.setDrawColor(239, 68, 68);
    pdf.setFillColor(254, 226, 226);
    pdf.rect(margin + boxWidth + 3, summaryBoxY, boxWidth, 20, "FD");
    pdf.setTextColor(239, 68, 68);
    pdf.text("TOTAL CARGADO", margin + boxWidth + 6, summaryBoxY + 6);
    pdf.text(formatCurrency(summary.total_cargado), margin + boxWidth + 6, summaryBoxY + 14);

    // Saldo (Blue)
    pdf.setDrawColor(37, 99, 235);
    pdf.setFillColor(219, 234, 254);
    pdf.rect(margin + (boxWidth + 3) * 2, summaryBoxY, boxWidth, 20, "FD");
    pdf.setTextColor(37, 99, 235);
    pdf.text("SALDO", margin + (boxWidth + 3) * 2 + 3, summaryBoxY + 6);
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text(formatCurrency(summary.saldo), margin + (boxWidth + 3) * 2 + 3, summaryBoxY + 15);

    yPos = summaryBoxY + 30;

    // Table header
    pdf.setDrawColor(37, 99, 235);
    pdf.setLineWidth(0.3);
    pdf.setFillColor(37, 99, 235);
    pdf.rect(margin, yPos - 1, contentWidth, 8, "F");

    pdf.setFontSize(9);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(255, 255, 255);

    pdf.text("FECHA", margin + 2, yPos + 4);
    pdf.text("TIPO", margin + 20, yPos + 4);
    pdf.text("CONCEPTO", margin + 35, yPos + 4);
    pdf.text("PROYECTO", margin + 90, yPos + 4);
    pdf.text("MONTO", pageWidth - margin - 3, yPos + 4, { align: "right" });

    yPos += 10;

    // Table rows
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(0, 0, 0);

    let rowCount = 0;
    movements.forEach((movement: any) => {
      if (yPos > pageHeight - 25) {
        // Add footer to current page
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text("AM Soluciones Constructivas", pageWidth / 2, pageHeight - 10, { align: "center" });

        // Add new page
        pdf.addPage();
        // Re-add header
        pdf.setFillColor(37, 99, 235);
        pdf.rect(0, 0, pageWidth, 40, "F");
        yPos = 30;
      }

      const fecha = new Date(movement.date).toLocaleDateString('es-AR', { 
        day: '2-digit', 
        month: '2-digit',
        year: '2-digit'
      });
      const tipo = movement.type === 'cobro' ? 'COBRO' : 'CARGO';
      const concepto = movement.concept?.substring(0, 35) || '';
      const proyecto = movement.project_name?.substring(0, 20) || '';
      const monto = formatCurrency(Number(movement.amount));

      // Alternate row background
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
      if (movement.type === 'cobro') {
        pdf.setTextColor(34, 197, 94);
      } else {
        pdf.setTextColor(239, 68, 68);
      }
      pdf.text(tipo, margin + 20, yPos + 1.5);
      pdf.setTextColor(0, 0, 0);

      pdf.text(concepto, margin + 35, yPos + 1.5);
      pdf.text(proyecto, margin + 90, yPos + 1.5);

      // Color monto
      if (movement.type === 'cobro') {
        pdf.setTextColor(34, 197, 94);
      } else {
        pdf.setTextColor(239, 68, 68);
      }
      pdf.text(monto, pageWidth - margin - 3, yPos + 1.5, { align: "right" });
      pdf.setTextColor(0, 0, 0);

      yPos += 7;
      rowCount++;
    });

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text("AM Soluciones Constructivas - Estado de Cuenta Automatizado", pageWidth / 2, pageHeight - 10, { align: "center" });
    pdf.text(`Total de movimientos: ${movements.length}`, margin, pageHeight - 10);

    const fileName = `estado-cuenta-${client.apellido_nombre.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);

    toast.success("Estado de cuenta exportado exitosamente");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clientes/${clientId}/cuenta-corriente`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          project_id: formData.project_id ? Number(formData.project_id) : null,
        }),
      });
      if (res.ok) {
        toast.success("Movimiento registrado");
        setAddingMovement(false);
        setFormData({
          type: "cargo",
          amount: "",
          payment_method: "banco",
          concept: "",
          project_id: "",
          date: new Date().toISOString().split("T")[0],
          notes: "",
        });
        mutate();
      } else {
        toast.error("Error al registrar movimiento");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowUpCircle className="h-4 w-4 text-accent" />
              Total Cobrado
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {formatCurrency(summary.total_cobrado)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowDownCircle className="h-4 w-4 text-destructive" />
              Total Cargado
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {formatCurrency(summary.total_cargado)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Saldo
            </div>
            <p
              className={`mt-2 text-2xl font-bold ${summary.saldo >= 0 ? "text-accent" : "text-destructive"}`}
            >
              {formatCurrency(summary.saldo)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddingMovement(!addingMovement)}
        >
          <Plus className="mr-2 h-4 w-4" />
          {addingMovement ? "Cancelar" : "Registrar Movimiento"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={generateAccountStatementPDF}
          disabled={movements.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {addingMovement && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) =>
                      setFormData({ ...formData, type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cargo">Cargo (Deuda)</SelectItem>
                      <SelectItem value="cobro">Cobro (Pago)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              {formData.type === "cobro" && (
                <div className="space-y-2">
                  <Label>Medio de Pago</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(v) =>
                      setFormData({ ...formData, payment_method: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="banco">Banco</SelectItem>
                      <SelectItem value="mercado_pago">
                        Mercado Pago
                      </SelectItem>
                      <SelectItem value="efectivo_pesos">
                        Efectivo Pesos
                      </SelectItem>
                      <SelectItem value="efectivo_usd">
                        Efectivo USD
                      </SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Proyecto (opcional)</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(v) =>
                    setFormData({ ...formData, project_id: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin proyecto asignado" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientProjects.map((p: { id: number; nombre: string }) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Concepto</Label>
                <Input
                  value={formData.concept}
                  onChange={(e) =>
                    setFormData({ ...formData, concept: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Notas (Opcional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Registrar
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {movements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              No hay movimientos registrados
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {movements.map((mov: any) => (
            <Card key={mov.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-start gap-3">
                  {mov.type === "cobro" ? (
                    <ArrowUpCircle className="mt-0.5 h-5 w-5 text-accent" />
                  ) : (
                    <ArrowDownCircle className="mt-0.5 h-5 w-5 text-destructive" />
                  )}
                  <div>
                    <p className="font-medium text-foreground">
                      {mov.concept}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {new Date(mov.date).toLocaleDateString("es-AR")}
                      </span>
                      {mov.payment_method && (
                        <span className="capitalize">
                          {mov.payment_method.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    {mov.notes && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {mov.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-lg font-bold ${mov.type === "cobro" ? "text-accent" : "text-destructive"}`}
                  >
                    {mov.type === "cobro" ? "+" : "-"}
                    {formatCurrency(Number(mov.amount))}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NotasTab({ clientId, clientName }: { clientId: number; clientName: string }) {
  const { data, mutate, isLoading } = useSWR(
    `/api/clientes/${clientId}/notes`,
    fetcher
  );
  const [addingNote, setAddingNote] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const notes = data?.notes || [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!noteContent.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/clientes/${clientId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent }),
      });
      if (res.ok) {
        toast.success("Nota agregada");
        setNoteContent("");
        setAddingNote(false);
        mutate();
      } else {
        toast.error("Error al agregar nota");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(noteId: number) {
    if (!confirm("¿Eliminar esta nota?")) return;

    try {
      const res = await fetch(`/api/clientes/${clientId}/notes?noteId=${noteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Nota eliminada");
        mutate();
      } else {
        toast.error("Error al eliminar nota");
      }
    } catch (error) {
      toast.error("Error al eliminar nota");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h3 className="text-lg font-semibold">Notas de {clientName}</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddingNote(!addingNote)}
        >
          <Plus className="mr-2 h-4 w-4" />
          {addingNote ? "Cancelar" : "Nueva Nota"}
        </Button>
      </div>

      {addingNote && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Contenido de la Nota</Label>
                <Textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Escribe tu nota aquí..."
                  rows={4}
                  required
                />
              </div>
              <Button type="submit" disabled={submitting || !noteContent.trim()}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Guardar Nota
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {notes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <StickyNote className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No hay notas registradas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note: any) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap text-sm text-foreground">
                      {note.content}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{new Date(note.created_at).toLocaleString("es-AR")}</span>
                      {note.created_by_name && (
                        <>
                          <span>•</span>
                          <span>{note.created_by_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(note.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ArchivosTab({ clientId, clientName }: { clientId: number; clientName: string }) {
  const { data, mutate, isLoading } = useSWR(
    `/api/clientes/${clientId}/attachments`,
    fetcher
  );
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const attachments = data?.attachments || [];

  function isPreviewable(mimeType: string) {
    return (
      mimeType?.startsWith("image/") ||
      mimeType === "application/pdf"
    );
  }

  function isImage(mimeType: string) {
    return mimeType?.startsWith("image/");
  }

  function isPDF(mimeType: string) {
    return mimeType === "application/pdf";
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await fetch(`/api/clientes/${clientId}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        toast.success("Archivo subido exitosamente");
        mutate();
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        toast.error("Error al subir archivo");
      }
    } catch (error) {
      toast.error("Error al subir archivo");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(attachmentId: number, filename: string) {
    if (!confirm(`¿Eliminar ${filename}?`)) return;

    try {
      const res = await fetch(
        `/api/clientes/${clientId}/attachments?attachmentId=${attachmentId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast.success("Archivo eliminado");
        mutate();
      } else {
        toast.error("Error al eliminar archivo");
      }
    } catch (error) {
      toast.error("Error al eliminar archivo");
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h3 className="text-lg font-semibold">Archivos de {clientName}</h3>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {uploading ? "Subiendo..." : "Subir Archivo"}
          </Button>
        </div>
      </div>

      {attachments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Paperclip className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No hay archivos adjuntos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {attachments.map((attachment: any) => (
            <Card key={attachment.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 flex-shrink-0 text-primary" />
                      <p className="truncate text-sm font-medium">
                        {attachment.original_filename}
                      </p>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <p>{formatFileSize(attachment.file_size)}</p>
                      <p>{new Date(attachment.created_at).toLocaleDateString("es-AR")}</p>
                      {attachment.created_by_name && (
                        <p>Por {attachment.created_by_name}</p>
                      )}
                    </div>
                    <div className="mt-3 flex gap-2">
                      {isPreviewable(attachment.mime_type) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewFile(attachment)}
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          Ver
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-1 h-3 w-3" />
                          Abrir
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(attachment.id, attachment.original_filename)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{previewFile?.original_filename}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {previewFile && isImage(previewFile.mime_type) && (
              <img
                src={previewFile.url}
                alt={previewFile.original_filename}
                className="w-full h-auto rounded-lg"
              />
            )}
            {previewFile && isPDF(previewFile.mime_type) && (
              <iframe
                src={previewFile.url}
                className="w-full h-[70vh] rounded-lg border"
                title={previewFile.original_filename}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3">
      <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}
