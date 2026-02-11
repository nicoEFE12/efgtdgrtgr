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
      </Tabs>
    </div>
  );
}

function CuentaCorrienteTab({ clientId }: { clientId: number }) {
  const { data, mutate, isLoading } = useSWR(
    `/api/clientes/${clientId}/cuenta-corriente`,
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

      <div className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddingMovement(!addingMovement)}
        >
          <Plus className="mr-2 h-4 w-4" />
          {addingMovement ? "Cancelar" : "Registrar Movimiento"}
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
