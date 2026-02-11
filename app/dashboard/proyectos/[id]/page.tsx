"use client";

import React from "react";
import { use } from "react";
import { useState, useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  TrendingUp,
  TrendingDown,
  FileText,
  Upload,
  Loader2,
  Save,
  Trash2,
  Download,
  File,
  ImageIcon,
  FileSpreadsheet,
  Package,
  Wand2,
  ChevronDown,
  ChevronUp,
  Receipt,
  Truck,
  Check,
  CheckCircle2,
  Circle,
  History,
  Printer,
  Eye,
} from "lucide-react";
import jsPDF from 'jspdf';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
import { Separator } from "@/components/ui/separator";
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
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(amount);
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  activo: { label: "Activo", className: "bg-accent text-accent-foreground" },
  pendiente: { label: "Pendiente", className: "bg-chart-4/20 text-chart-4" },
  cerrado: {
    label: "Cerrado",
    className: "bg-muted text-muted-foreground",
  },
};

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, mutate, isLoading } = useSWR(
    `/api/proyectos/${id}`,
    fetcher
  );
  const { data: configData } = useSWR("/api/proyectos/config", fetcher);
  const projectConfig = configData?.config || {};
  const [transferOpen, setTransferOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [ingresoObraOpen, setIngresoObraOpen] = useState(false);
  const [cobrarCuotaOpen, setCobrarCuotaOpen] = useState(false);
  const [gastoComunOpen, setGastoComunOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.project) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Proyecto no encontrado
      </div>
    );
  }

  const { project, movements, summary, rubros } = data;
  const status = STATUS_CONFIG[project.estado] || STATUS_CONFIG.pendiente;
  const totalCobrado = summary.total_cobrado || 0;
  const resultado = totalCobrado - summary.total_gastado;
  const presupuesto = Number(project.presupuesto_total);
  const rentabilidad = totalCobrado > 0 ? ((totalCobrado - summary.total_gastado) / totalCobrado) * 100 : 0;

  async function handleDeleteMovement(movementId: number) {
    const res = await fetch(`/api/proyectos/${id}/expenses?movementId=${movementId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Movimiento eliminado");
      mutate();
    } else {
      toast.error("Error al eliminar movimiento");
    }
  }

  async function generateHistorialPDF() {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Colors
      const primaryBlue = [37, 99, 235];
      const darkGray = [31, 41, 55];
      const lightGray = [156, 163, 175];
      const greenColor = [34, 197, 94];
      const redColor = [239, 68, 68];
  
      // Header
      doc.setFillColor(...primaryBlue);
      doc.rect(0, 0, pageWidth, 50, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text("AM SOLUCIONES CONSTRUCTIVAS", 15, 22);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text("Historial de Caja de Proyecto", 15, 32);
  
      // Project info
      let yPos = 65;
      doc.setTextColor(...darkGray);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(`${project.nombre}`, 15, yPos);
      
      yPos += 8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Cliente: ${project.client_name} | Contrato: ${project.numero_contrato}`, 15, yPos);
      
      // Summary box
      yPos += 15;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(...lightGray);
      doc.roundedRect(15, yPos, pageWidth - 30, 30, 3, 3, 'DF');
      
      doc.setTextColor(...primaryBlue);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text("RESUMEN FINANCIERO", 20, yPos + 10);
      
      doc.setTextColor(...darkGray);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Cobrado: ${formatCurrency(totalCobrado)}`, 20, yPos + 18);
      doc.text(`Total Gastado: ${formatCurrency(summary.total_gastado)}`, 20, yPos + 24);
      
      const resultColor = resultado >= 0 ? greenColor : redColor;
      doc.setTextColor(...resultColor);
      doc.setFont('helvetica', 'bold');
      doc.text(`Resultado: ${formatCurrency(resultado)}`, pageWidth - 20, yPos + 21, { align: 'right' });
      
      // Movements table header
      yPos += 45;
      doc.setTextColor(...primaryBlue);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("MOVIMIENTOS", 15, yPos);
      
      yPos += 10;
      doc.setFillColor(248, 250, 252);
      doc.rect(15, yPos, pageWidth - 30, 12, 'F');
      
      doc.setTextColor(...darkGray);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text("FECHA", 20, yPos + 8);
      doc.text("CONCEPTO", 50, yPos + 8);
      doc.text("TIPO", 120, yPos + 8);
      doc.text("IMPORTE", pageWidth - 20, yPos + 8, { align: 'right' });
      
      yPos += 15;
      
      // Movements list
      const sortedMovements = [...movements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      for (const movement of sortedMovements) {
        // Check if we need a new page
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 30;
        }
        
        const isIncome = movement.type === "transferencia_in" || movement.type === "ingreso" || movement.type === "cobro";
        const movementColor = isIncome ? greenColor : redColor;
        
        doc.setTextColor(...darkGray);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        
        // Date
        doc.text(new Date(movement.date).toLocaleDateString('es-AR'), 20, yPos);
        
        // Concept (truncate if too long)
        const concept = movement.concept.length > 35 ? movement.concept.substring(0, 32) + "..." : movement.concept;
        doc.text(concept, 50, yPos);
        
        // Type
        doc.text(isIncome ? "Ingreso" : "Egreso", 120, yPos);
        
        // Amount
        doc.setTextColor(...movementColor);
        doc.setFont('helvetica', 'bold');
        const amount = `${isIncome ? "+" : "-"}${formatCurrency(Number(movement.amount))}`;
        doc.text(amount, pageWidth - 20, yPos, { align: 'right' });
        
        yPos += 8;
      }
      
      // Footer
      doc.setTextColor(...lightGray);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const footerY = pageHeight - 15;
      
      doc.setDrawColor(...lightGray);
      doc.setLineWidth(0.3);
      doc.line(15, footerY - 3, pageWidth - 15, footerY - 3);
      
      const genDate = new Date().toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(`Generado: ${genDate}`, 15, footerY);
      doc.text("AM Soluciones Constructivas", pageWidth - 15, footerY, { align: 'right' });
      
      // Download
      const fileName = `Historial_${project.nombre.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}.pdf`;
      doc.save(fileName);
      toast.success("Historial PDF generado correctamente");
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link
          href="/dashboard/proyectos"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Proyectos
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {project.nombre}
              </h1>
              <Badge className={status.className}>{status.label}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {project.client_name} &middot; {project.numero_contrato}
            </p>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Presupuesto
            </p>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(presupuesto)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Cobrado al Cliente
            </p>
            <p className="text-xl font-bold text-accent">
              {formatCurrency(totalCobrado)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Ingresado a Obra
            </p>
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(summary.total_ingresado)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Total Gastado
            </p>
            <p className="text-xl font-bold text-destructive">
              {formatCurrency(summary.total_gastado)}
            </p>
            {presupuesto > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {((summary.total_gastado / presupuesto) * 100).toFixed(0)}% del presupuesto
              </p>
            )}
          </CardContent>
        </Card>
        <Card className={rentabilidad >= 0 ? "border-accent/30" : "border-destructive/30"}>
          <CardContent className="flex items-center gap-3 p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Rentabilidad
              </p>
              <p
                className={`text-xl font-bold ${rentabilidad >= 0 ? "text-accent" : "text-destructive"}`}
              >
                {formatCurrency(totalCobrado - summary.total_gastado)}
              </p>
              {totalCobrado > 0 && (
                <p className={`text-xs ${rentabilidad >= 0 ? "text-accent" : "text-destructive"}`}>
                  {rentabilidad.toFixed(1)}%
                </p>
              )}
            </div>
            {rentabilidad >= 0 ? (
              <TrendingUp className="ml-auto h-5 w-5 text-accent" />
            ) : (
              <TrendingDown className="ml-auto h-5 w-5 text-destructive" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Saldo de obra card */}
      <Card className={resultado >= 0 ? "border-accent/20" : "border-destructive/20"}>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ganancia Total del Proyecto</p>
              <p className={`text-lg font-bold ${resultado >= 0 ? "text-accent" : "text-destructive"}`}>
                {formatCurrency(resultado)}
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Cobrado: {formatCurrency(totalCobrado)}</p>
            <p>Gastado: {formatCurrency(summary.total_gastado)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="caja" className="w-full">
        <TabsList>
          <TabsTrigger value="caja">Caja de Obra</TabsTrigger>
          <TabsTrigger value="historial" className="gap-1.5">
            <History className="h-3.5 w-3.5" />
            Historial
          </TabsTrigger>
          {rubros && rubros.length > 0 && (
            <TabsTrigger value="rubros" className="gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Rubros ({rubros.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="ficha">Ficha Cliente</TabsTrigger>
          <TabsTrigger value="observaciones">Observaciones</TabsTrigger>
        </TabsList>

        {/* CAJA DE OBRA TAB */}
        <TabsContent value="caja" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => setCobrarCuotaOpen(true)}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Receipt className="mr-2 h-4 w-4" />
              Cobrar Cuota
            </Button>
            <Button
              size="sm"
              onClick={() => setGastoComunOpen(true)}
              variant="outline"
            >
              <Truck className="mr-2 h-4 w-4" />
              Gasto Común
            </Button>
            <Button
              size="sm"
              onClick={() => setTransferOpen(true)}
              variant="outline"
            >
              <ArrowDownCircle className="mr-2 h-4 w-4" />
              Transferir a Obra
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setExpenseOpen(true)}
            >
              <ArrowUpCircle className="mr-2 h-4 w-4" />
              Registrar Egreso
            </Button>
          </div>

          {movements?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No hay movimientos en esta obra
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {movements?.map(
                (m: {
                  id: number;
                  type: string;
                  amount: number;
                  concept: string;
                  date: string;
                  payment_method: string;
                  category: string | null;
                }) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        m.type === "transferencia_in" || m.type === "ingreso" || m.type === "cobro"
                          ? "bg-accent/10 text-accent"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {m.type === "transferencia_in" || m.type === "ingreso" || m.type === "cobro" ? (
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
                        {m.category && (
                          <>
                            <span>&middot;</span>
                            <span>{m.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        m.type === "transferencia_in" || m.type === "ingreso" || m.type === "cobro"
                          ? "text-accent"
                          : "text-destructive"
                      }`}
                    >
                      {m.type === "transferencia_in" || m.type === "ingreso" || m.type === "cobro" ? "+" : "-"}
                      {formatCurrency(Number(m.amount))}
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminar Movimiento</AlertDialogTitle>
                          <AlertDialogDescription>
                            ¿Estás seguro de eliminar este movimiento? Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteMovement(m.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )
              )}
            </div>
          )}
        </TabsContent>

        {/* HISTORIAL TAB */}
        <TabsContent value="historial" className="mt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Historial de Movimientos</h3>
              <p className="text-sm text-muted-foreground">Registro completo de todos los movimientos de caja del proyecto</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => window.print()} variant="outline" size="sm">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
              <Button onClick={generateHistorialPDF} size="sm">
                <Download className="mr-2 h-4 w-4" />
                Descargar PDF
              </Button>
            </div>
          </div>

          {/* Financial Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumen Financiero</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Cobrado</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(totalCobrado)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Gastado</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(summary.total_gastado)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Resultado</p>
                  <p className={`text-lg font-bold ${resultado >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(resultado)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Rentabilidad</p>
                  <p className={`text-lg font-bold ${rentabilidad >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {rentabilidad.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Movements Table */}
          {movements?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No hay movimientos registrados en este proyecto
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Movimientos ({movements?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden">
                  <div className="grid grid-cols-5 pb-3 text-xs font-medium text-muted-foreground border-b">
                    <div>Fecha</div>
                    <div className="col-span-2">Concepto</div>
                    <div>Tipo</div>
                    <div className="text-right">Importe</div>
                  </div>
                  <div className="divide-y">
                    {movements?.slice().sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(
                      (m: {
                        id: number;
                        type: string;
                        amount: number;
                        concept: string;
                        date: string;
                        payment_method: string;
                        category: string | null;
                      }) => (
                        <div key={m.id} className="grid grid-cols-5 py-3 items-center text-sm">
                          <div className="text-xs text-muted-foreground">
                            {new Date(m.date).toLocaleDateString("es-AR")}
                          </div>
                          <div className="col-span-2">
                            <div className="font-medium">{m.concept}</div>
                            {m.category && (
                              <div className="text-xs text-muted-foreground">{m.category}</div>
                            )}
                            {m.payment_method && (
                              <div className="text-xs text-muted-foreground">{m.payment_method}</div>
                            )}
                          </div>
                          <div>
                            <Badge
                              variant={
                                m.type === "transferencia_in" || m.type === "ingreso" || m.type === "cobro"
                                  ? "default"
                                  : "destructive"
                              }
                              className="text-xs"
                            >
                              {m.type === "transferencia_in" || m.type === "ingreso" || m.type === "cobro" ? "Ingreso" : "Egreso"}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <span
                              className={`font-bold ${
                                m.type === "transferencia_in" || m.type === "ingreso" || m.type === "cobro"
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {m.type === "transferencia_in" || m.type === "ingreso" || m.type === "cobro" ? "+" : "-"}
                              {formatCurrency(Number(m.amount))}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* RUBROS TAB */}
        {rubros && rubros.length > 0 && (
          <TabsContent value="rubros" className="mt-4">
            <ProjectRubros rubros={rubros} presupuesto={presupuesto} projectId={Number(id)} onUpdate={mutate} />
          </TabsContent>
        )}

        {/* DOCUMENTOS TAB */}
        <TabsContent value="documentos" className="mt-4">
          <ProjectDocuments projectId={Number(id)} />
        </TabsContent>

        {/* FICHA CLIENTE TAB */}
        <TabsContent value="ficha" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos del Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow label="Nombre" value={project.client_name} />
                <InfoRow label="DNI" value={project.dni} />
                <InfoRow label="Domicilio Obra" value={project.domicilio_obra} />
                <InfoRow
                  label="Telefono"
                  value={project.telefono || "No registrado"}
                />
                <InfoRow
                  label="Email"
                  value={project.client_email || "No registrado"}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OBSERVACIONES TAB */}
        <TabsContent value="observaciones" className="mt-4">
          <ProjectObservations
            projectId={Number(id)}
            initialValue={project.observaciones || ""}
            onSave={() => mutate()}
          />
        </TabsContent>
      </Tabs>

      {/* Ingreso Obra Dialog */}
      <Dialog open={ingresoObraOpen} onOpenChange={setIngresoObraOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Ingreso a Obra</DialogTitle>
          </DialogHeader>
          <IngresoObraForm
            projectId={Number(id)}
            onSuccess={() => {
              setIngresoObraOpen(false);
              mutate();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transferencia entre Cajas</DialogTitle>
          </DialogHeader>
          <TransferForm
            projectId={Number(id)}
            projectName={project.nombre}
            onSuccess={() => {
              setTransferOpen(false);
              mutate();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Egreso de Obra</DialogTitle>
          </DialogHeader>
          <ExpenseForm
            projectId={Number(id)}
            categorias={Array.isArray(projectConfig.categorias_egreso)
              ? projectConfig.categorias_egreso
              : ["Materiales", "Mano de obra", "Flete", "Herramientas", "Combustible", "Varios"]
            }
            onSuccess={() => {
              setExpenseOpen(false);
              mutate();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Cobrar Cuota Dialog */}
      <Dialog open={cobrarCuotaOpen} onOpenChange={setCobrarCuotaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cobrar Cuota</DialogTitle>
          </DialogHeader>
          <CobrarCuotaForm
            projectId={Number(id)}
            clientName={project.client_name}
            projectName={project.nombre}
            presupuesto={presupuesto}
            totalCobrado={totalCobrado}
            conceptos={Array.isArray(projectConfig.cuota_conceptos)
              ? projectConfig.cuota_conceptos
              : ["Cuota mensual", "Anticipo", "Refuerzo", "Certificado de obra", "Ajuste", "Otro"]
            }
            onSuccess={() => {
              setCobrarCuotaOpen(false);
              mutate();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Gasto Comun Dialog */}
      <Dialog open={gastoComunOpen} onOpenChange={setGastoComunOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Gasto Común</DialogTitle>
          </DialogHeader>
          <GastoComunForm
            projectId={Number(id)}
            categorias={Array.isArray(projectConfig.gastos_comunes)
              ? projectConfig.gastos_comunes
              : ["Transporte de personal", "Comida/Viandas", "Combustible", "Peaje", "Varios"]
            }
            onSuccess={() => {
              setGastoComunOpen(false);
              mutate();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

function TransferForm({
  projectId,
  projectName,
  onSuccess,
}: {
  projectId: number;
  projectName: string;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("banco");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/proyectos/${projectId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          project_name: projectName,
          date,
        }),
      });
      if (!res.ok) throw new Error("Error en la transferencia");
      toast.success("Transferencia realizada");
      onSuccess();
    } catch {
      toast.error("Error al realizar la transferencia");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Se descontara el monto de la Caja General y se acreditara en la caja de
        esta obra.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label>Monto</Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          placeholder="0.00"
          className="text-lg font-semibold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Desde (medio de pago)</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="banco">Banco</SelectItem>
            <SelectItem value="mercado_pago">Mercado Pago</SelectItem>
            <SelectItem value="efectivo_pesos">Efectivo $</SelectItem>
            <SelectItem value="efectivo_usd">Efectivo USD</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Fecha</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Confirmar Transferencia
      </Button>
    </form>
  );
}

function ExpenseForm({
  projectId,
  categorias,
  onSuccess,
}: {
  projectId: number;
  categorias: string[];
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo_pesos");
  const [concept, setConcept] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const CATEGORIES = categorias.length > 0
    ? categorias
    : ["Materiales", "Mano de obra", "Flete", "Herramientas", "Combustible", "Varios"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/proyectos/${projectId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          concept,
          category: category || null,
          date,
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error("Error al registrar");
      toast.success("Egreso registrado");
      onSuccess();
    } catch {
      toast.error("Error al registrar el egreso");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Monto</Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="text-lg font-semibold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Medio de Pago</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="banco">Banco</SelectItem>
            <SelectItem value="mercado_pago">Mercado Pago</SelectItem>
            <SelectItem value="efectivo_pesos">Efectivo $</SelectItem>
            <SelectItem value="efectivo_usd">Efectivo USD</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Concepto</Label>
        <Input
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          required
          placeholder="Descripcion del gasto"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Categoria</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c.toLowerCase()}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Fecha</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Notas</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Notas adicionales..."
        />
      </div>
      <Button type="submit" variant="destructive" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Registrar Egreso
      </Button>
    </form>
  );
}

function IngresoObraForm({
  projectId,
  onSuccess,
}: {
  projectId: number;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo_pesos");
  const [concept, setConcept] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/proyectos/${projectId}/ingreso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          concept: concept || "Ingreso a obra",
          category: "ingreso",
          date,
          notes,
        }),
      });
      if (!res.ok) throw new Error("Error en el ingreso");
      toast.success("Ingreso registrado exitosamente");
      onSuccess();
    } catch {
      toast.error("Error al registrar el ingreso");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Registra ingresos de dinero a la caja de obra.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label>Monto</Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          placeholder="0.00"
          className="text-lg font-semibold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Medio de pago</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="banco">Banco</SelectItem>
            <SelectItem value="mercado_pago">Mercado Pago</SelectItem>
            <SelectItem value="efectivo_pesos">Efectivo $</SelectItem>
            <SelectItem value="efectivo_usd">Efectivo USD</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Concepto</Label>
        <Input
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="Descripción del ingreso"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Fecha</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Notas</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Notas adicionales..."
        />
      </div>
      <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Registrar Ingreso
      </Button>
    </form>
  );
}

function CobrarCuotaForm({
  projectId,
  clientName,
  projectName,
  presupuesto,
  totalCobrado,
  conceptos,
  onSuccess,
}: {
  projectId: number;
  clientName: string;
  projectName: string;
  presupuesto: number;
  totalCobrado: number;
  conceptos: string[];
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("banco");
  const [concept, setConcept] = useState(conceptos[0] || "Cuota mensual");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [cuotas, setCuotas] = useState<string>("");

  const saldoPendiente = presupuesto - totalCobrado;

  function handleCuotasChange(value: string) {
    setCuotas(value);
    if (value && saldoPendiente > 0) {
      const numCuotas = parseInt(value);
      const montoPorCuota = saldoPendiente / numCuotas;
      setAmount(montoPorCuota.toFixed(2));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/proyectos/${projectId}/cobrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          concept,
          date,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al cobrar");
      }
      toast.success("Cobro registrado exitosamente");
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al registrar el cobro";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="rounded-lg bg-muted/50 p-3 space-y-1">
        <p className="text-sm text-muted-foreground">
          Cliente: <span className="font-medium text-foreground">{clientName}</span>
        </p>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Presupuesto:</span>
          <span className="font-medium">{formatCurrency(presupuesto)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Cobrado:</span>
          <span className="font-medium text-accent">{formatCurrency(totalCobrado)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Saldo pendiente:</span>
          <span className="font-semibold">{formatCurrency(saldoPendiente)}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Dividir saldo en cuotas</Label>
        <Select value={cuotas} onValueChange={handleCuotasChange}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar cantidad de cuotas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 cuota (pago completo)</SelectItem>
            <SelectItem value="2">2 cuotas</SelectItem>
            <SelectItem value="3">3 cuotas</SelectItem>
            <SelectItem value="4">4 cuotas</SelectItem>
            <SelectItem value="6">6 cuotas</SelectItem>
            <SelectItem value="12">12 cuotas</SelectItem>
            <SelectItem value="24">24 cuotas</SelectItem>
            <SelectItem value="36">36 cuotas</SelectItem>
          </SelectContent>
        </Select>
        {cuotas && (
          <p className="text-xs text-muted-foreground">
            {formatCurrency(saldoPendiente)} ÷ {cuotas} = {formatCurrency(saldoPendiente / parseInt(cuotas))} por cuota
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Monto a cobrar</Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          placeholder="0.00"
          className="text-lg font-semibold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Concepto</Label>
        <Select value={concept} onValueChange={setConcept}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {conceptos.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Medio de pago</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="banco">Banco</SelectItem>
            <SelectItem value="mercado_pago">Mercado Pago</SelectItem>
            <SelectItem value="efectivo_pesos">Efectivo $</SelectItem>
            <SelectItem value="efectivo_usd">Efectivo USD</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Fecha</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Notas</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Notas adicionales..."
        />
      </div>
      <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Registrar Cobro
      </Button>
    </form>
  );
}

function GastoComunForm({
  projectId,
  categorias,
  onSuccess,
}: {
  projectId: number;
  categorias: string[];
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo_pesos");
  const [category, setCategory] = useState(categorias[0] || "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/proyectos/${projectId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          concept: category,
          category: "gasto_comun",
          date,
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error("Error al registrar");
      toast.success("Gasto común registrado");
      onSuccess();
    } catch {
      toast.error("Error al registrar el gasto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Registra gastos recurrentes de la obra como transporte, viandas, combustible, etc.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label>Tipo de gasto</Label>
        <div className="flex flex-wrap gap-2">
          {categorias.map((c) => (
            <Badge
              key={c}
              variant={category === c ? "default" : "outline"}
              className="cursor-pointer text-sm py-1.5 px-3"
              onClick={() => setCategory(c)}
            >
              {c}
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Monto</Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          placeholder="0.00"
          className="text-lg font-semibold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Medio de Pago</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="efectivo_pesos">Efectivo $</SelectItem>
            <SelectItem value="banco">Banco</SelectItem>
            <SelectItem value="mercado_pago">Mercado Pago</SelectItem>
            <SelectItem value="efectivo_usd">Efectivo USD</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Fecha</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Notas</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Notas adicionales..."
        />
      </div>
      <Button type="submit" variant="outline" disabled={loading || !category}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Registrar Gasto Común
      </Button>
    </form>
  );
}

function ProjectObservations({
  projectId,
  initialValue,
  onSave,
}: {
  projectId: number;
  initialValue: string;
  onSave: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch(`/api/proyectos/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _updateObservaciones: true,
          observaciones: value,
        }),
      });
      if (!res.ok) throw new Error("Error");
      toast.success("Observaciones guardadas");
      onSave();
    } catch {
      toast.error("Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={6}
          placeholder="Notas y observaciones del proyecto..."
          className="resize-y"
        />
        <Button
          onClick={handleSave}
          disabled={loading}
          size="sm"
          className="ml-auto"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar
        </Button>
      </CardContent>
    </Card>
  );
}

const DOC_CATEGORIES = [
  { value: "contrato", label: "Contrato" },
  { value: "presupuesto", label: "Presupuesto" },
  { value: "plano", label: "Plano" },
  { value: "comprobante", label: "Comprobante de Pago" },
  { value: "complementario", label: "Complementario" },
  { value: "ficha_cliente", label: "Ficha Cliente" },
];

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <File className="h-5 w-5" />;
  if (mimeType.startsWith("image/")) return <ImageIcon className="h-5 w-5" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return <FileSpreadsheet className="h-5 w-5" />;
  return <FileText className="h-5 w-5" />;
}

function ProjectDocuments({ projectId }: { projectId: number }) {
  const [mounted, setMounted] = useState(false);
  const { data, mutate, isLoading } = useSWR(
    mounted ? `/api/proyectos/${projectId}/documents` : null,
    fetcher
  );
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("complementario");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; filename: string } | null>(null);
  const [previewPdf, setPreviewPdf] = useState<{ url: string; filename: string } | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleImageClose = () => {
    setPreviewImage(null);
    setImageZoom(1);
    setImagePan({ x: 0, y: 0 });
  };

  const handleMouseWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setImageZoom((prev) => Math.max(1, Math.min(prev + delta, 4)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - imagePan.x, y: e.clientY - imagePan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setImagePan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      setDragStart({ x: distance, y: 0 });
    } else if (e.touches.length === 1) {
      // Pan
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - imagePan.x, y: e.touches[0].clientY - imagePan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const scale = distance / dragStart.x;
      setImageZoom((prev) => Math.max(1, Math.min(prev * scale, 4)));
      setDragStart({ x: distance, y: 0 });
    } else if (e.touches.length === 1 && isDragging) {
      // Pan
      setImagePan({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  function isImage(mimeType: string | null): boolean {
    return mimeType ? mimeType.startsWith("image/") : false;
  }

  function isPdf(mimeType: string | null): boolean {
    return mimeType === "application/pdf";
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);

      const res = await fetch(`/api/proyectos/${projectId}/documents`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Error al subir");
      toast.success("Documento subido correctamente");
      mutate();
    } catch {
      toast.error("Error al subir el documento");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(docId: number) {
    setDeletingId(docId);
    try {
      const res = await fetch(`/api/proyectos/${projectId}/documents`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId }),
      });
      if (!res.ok) throw new Error("Error al eliminar");
      toast.success("Documento eliminado");
      mutate();
    } catch {
      toast.error("Error al eliminar el documento");
    } finally {
      setDeletingId(null);
    }
  }

  const documents = data?.documents || [];

  return (
    <div className="flex flex-col gap-4">
      {/* Upload section */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-upload" className="cursor-pointer">
              <Button
                asChild
                size="sm"
                disabled={uploading}
                className="bg-primary text-primary-foreground"
              >
                <span>
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {uploading ? "Subiendo..." : "Subir Archivo"}
                </span>
              </Button>
            </Label>
            <Input
              id="doc-upload"
              type="file"
              className="hidden"
              onChange={handleUpload}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.dwg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Documents list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <Upload className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No hay documentos. Suba contratos, presupuestos, planos y
              documentos complementarios.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {documents.map(
            (doc: {
              id: number;
              category: string;
              filename: string;
              url: string;
              mime_type: string | null;
              created_at: string;
            }) => {
              const catLabel =
                DOC_CATEGORIES.find((c) => c.value === doc.category)?.label ||
                doc.category;
              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    {getFileIcon(doc.mime_type)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-foreground">
                      {doc.filename}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge
                        variant="outline"
                        className="px-1.5 py-0 text-xs"
                      >
                        {catLabel}
                      </Badge>
                      <span>
                        {new Date(doc.created_at).toLocaleDateString("es-AR")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isImage(doc.mime_type) && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setPreviewImage({ url: doc.url, filename: doc.filename })}
                        title="Ver imagen"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {isPdf(doc.mime_type) && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setPreviewPdf({ url: doc.url, filename: doc.filename })}
                        title="Ver PDF"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" asChild>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Descargar"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      className="text-destructive hover:text-destructive"
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* Image Preview Modal */}
      <Dialog open={previewImage !== null} onOpenChange={handleImageClose}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 border-0 bg-black/90 flex flex-col">
          <DialogHeader className="flex-shrink-0 p-4 border-b border-white/10">
            <DialogTitle className="text-white text-sm truncate pr-8">{previewImage?.filename}</DialogTitle>
            <p className="text-xs text-white/60 mt-1">
              Zoom: {(imageZoom * 100).toFixed(0)}% | Usa la rueda del mouse o pinch para zoom | Arrastra para mover
            </p>
          </DialogHeader>
          <div 
            className="flex-1 flex items-center justify-center overflow-hidden bg-black relative"
            onWheel={handleMouseWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {previewImage && (
              <img
                src={previewImage.url}
                alt={previewImage.filename}
                className="select-none"
                style={{
                  transform: `translate(${imagePan.x}px, ${imagePan.y}px) scale(${imageZoom})`,
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                }}
                draggable={false}
              />
            )}
          </div>
          <div className="flex-shrink-0 flex items-center justify-between gap-2 p-4 border-t border-white/10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setImageZoom(1);
                setImagePan({ x: 0, y: 0 });
              }}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Reiniciar
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImageZoom((prev) => Math.max(1, prev - 0.2))}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                −
              </Button>
              <span className="text-white text-sm min-w-16 text-center">{(imageZoom * 100).toFixed(0)}%</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImageZoom((prev) => Math.min(4, prev + 0.2))}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                +
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Modal */}
      <Dialog open={previewPdf !== null} onOpenChange={() => setPreviewPdf(null)}>
        <DialogContent className="max-w-6xl w-[95vw] h-[95vh] p-0 border-0 bg-black/90 flex flex-col">
          <DialogHeader className="flex-shrink-0 p-4 border-b border-white/10">
            <DialogTitle className="text-white text-sm truncate pr-8">{previewPdf?.filename}</DialogTitle>
            <p className="text-xs text-white/60 mt-1">
              Visualizador de PDF | Usa los controles del navegador para navegar
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-white">
            {previewPdf && (
              <iframe
                src={previewPdf.url}
                className="w-full h-full"
                title={previewPdf.filename}
                style={{ border: 'none' }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectRubros({
  rubros,
  presupuesto,
  projectId,
  onUpdate,
}: {
  rubros: any[];
  presupuesto: number;
  projectId: number;
  onUpdate: () => void;
}) {
  const [expandedRubros, setExpandedRubros] = useState<Set<number>>(new Set());
  const [applyingId, setApplyingId] = useState<number | string | null>(null);
  const [cantidadesToApply, setCantidadesToApply] = useState<Record<number, string>>({});
  const [rubroProgressInputs, setRubroProgressInputs] = useState<Record<number, string>>({});

  function toggleRubro(idx: number) {
    setExpandedRubros((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  async function handleApplyRubroProgress(rubroId: number, cantidadAplicada: number) {
    if (cantidadAplicada < 0) {
      toast.error("Cantidad no válida");
      return;
    }
    setApplyingId(`rubro-${rubroId}`);
    try {
      const res = await fetch(`/api/proyectos/${projectId}/rubros`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rubroId, cantidadAplicada }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error");
      }
      const result = await res.json();
      if (result.isComplete) {
        toast.success("Rubro completado al 100%");
      } else {
        toast.success("Progreso guardado");
      }
      setRubroProgressInputs((prev) => ({ ...prev, [rubroId]: "" }));
      onUpdate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar";
      toast.error(msg);
    } finally {
      setApplyingId(null);
    }
  }

  async function handleApplyMaterial(materialId: number, cantidad: number) {
    if (!cantidad || cantidad <= 0) {
      toast.error("Ingresa una cantidad válida");
      return;
    }
    setApplyingId(materialId);
    try {
      const res = await fetch(`/api/proyectos/${projectId}/rubros`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId, cantidad }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error");
      }
      const result = await res.json();
      if (result.manoObraAutoApplied) {
        toast.success("Material aplicado. Mano de obra auto-aplicada al completar el rubro.");
      } else {
        toast.success("Material aplicado");
      }
      setCantidadesToApply((prev) => ({ ...prev, [materialId]: "" }));
      onUpdate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al aplicar";
      toast.error(msg);
    } finally {
      setApplyingId(null);
    }
  }

  async function handleApplyManoObra(rubroId: number) {
    setApplyingId(-rubroId); // negative to differentiate
    try {
      const res = await fetch(`/api/proyectos/${projectId}/rubros`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rubroId, type: "mano_obra" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error");
      }
      toast.success("Mano de obra aplicada");
      onUpdate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al aplicar";
      toast.error(msg);
    } finally {
      setApplyingId(null);
    }
  }

  const UNIDADES_MAP: Record<string, string> = {
    m2: "m²",
    ml: "ml",
    m3: "m³",
    un: "Unidad",
    kg: "Kg",
    global: "Global",
  };

  function formatM(n: number) {
    return Math.round(n).toLocaleString("es-AR");
  }

  // Totals
  const totalCostoBase = rubros.reduce((s: number, r: any) => s + Number(r.subtotal), 0);
  const totalMateriales = rubros.reduce((s: number, r: any) => s + Number(r.costo_materiales), 0);
  const totalManoObra = rubros.reduce((s: number, r: any) => s + Number(r.costo_mano_obra), 0);
  const totalFijos = rubros.reduce((s: number, r: any) => s + Number(r.costo_fijos_prorrateados), 0);

  // Progress calculations
  const totalMaterialesAplicados = rubros.reduce((s: number, r: any) => {
    return s + (r.materiales || []).reduce((ms: number, m: any) => {
      const cantidadAplicada = Number(m.cantidad_aplicada || 0);
      const cantidadTotal = Number(m.cantidad);
      const costoTotal = Number(m.total);
      const costoAplicado = cantidadTotal > 0 ? (cantidadAplicada / cantidadTotal) * costoTotal : 0;
      return ms + costoAplicado;
    }, 0);
  }, 0);
  const totalManoObraAplicada = rubros.reduce((s: number, r: any) => {
    return s + (r.mano_obra_applied ? Number(r.costo_mano_obra) : 0);
  }, 0);
  const totalAplicado = totalMaterialesAplicados + totalManoObraAplicada;
  const progressPercent = totalCostoBase > 0 ? (totalAplicado / totalCostoBase) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Avance de Obra</p>
            <span className="text-sm font-bold text-primary">{progressPercent.toFixed(1)}%</span>
          </div>
          <Progress value={progressPercent} className="h-3" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 pt-1">
            <div>
              <p className="text-xs text-muted-foreground">Materiales</p>
              <p className="text-lg font-bold font-mono">${formatM(totalMateriales)}</p>
              <p className="text-xs text-muted-foreground">
                Aplicado: <span className="text-accent font-medium">${formatM(totalMaterialesAplicados)}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mano de Obra</p>
              <p className="text-lg font-bold font-mono">${formatM(totalManoObra)}</p>
              <p className="text-xs text-muted-foreground">
                Aplicado: <span className="text-accent font-medium">${formatM(totalManoObraAplicada)}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Costos Fijos</p>
              <p className="text-lg font-bold font-mono">${formatM(totalFijos)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Costo Base</p>
              <p className="text-lg font-bold font-mono text-primary">${formatM(totalCostoBase)}</p>
              <p className="text-xs text-muted-foreground">
                Aplicado: <span className="text-accent font-medium">${formatM(totalAplicado)}</span>
              </p>
            </div>
            {presupuesto > 0 && totalCostoBase > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Ganancia Est.</p>
                <p className="text-lg font-bold font-mono text-emerald-600">
                  ${formatM(presupuesto - totalCostoBase)}
                </p>
                <p className="text-xs text-emerald-600">
                  {(((presupuesto - totalCostoBase) / totalCostoBase) * 100).toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rubros List */}
      <div className="space-y-3">
        {rubros.map((rubro: any, idx: number) => {
          const isExpanded = expandedRubros.has(idx);
          const unidadLabel = UNIDADES_MAP[rubro.unidad || "m2"] || rubro.unidad;
          const materiales = rubro.materiales || [];
          const materialesApplied = materiales.filter((m: any) => m.applied).length;
          const materialesTotal = materiales.length;
          const allMaterialsApplied = materialesTotal > 0 && materialesApplied === materialesTotal;
          const manoObraApplied = rubro.mano_obra_applied;
          
          // Rubro-level progress calculation
          let rubroProgress = 0;
          let rubroComplete = false;

          if (materialesTotal > 0) {
            // Rubro has materials - calculate based on materials
            const rubroMatCost = materiales.reduce((s: number, m: any) => s + Number(m.total), 0);
            const rubroMatApplied = materiales.reduce((s: number, m: any) => {
              const cantidadAplicada = Number(m.cantidad_aplicada || 0);
              const cantidadTotal = Number(m.cantidad);
              const costoTotal = Number(m.total);
              const costoAplicado = cantidadTotal > 0 ? (cantidadAplicada / cantidadTotal) * costoTotal : 0;
              return s + costoAplicado;
            }, 0);
            const rubroTotalCost = rubroMatCost + Number(rubro.costo_mano_obra);
            const rubroAppliedCost = rubroMatApplied + (manoObraApplied ? Number(rubro.costo_mano_obra) : 0);
            rubroProgress = rubroTotalCost > 0 ? (rubroAppliedCost / rubroTotalCost) * 100 : 0;
            rubroComplete = allMaterialsApplied && (manoObraApplied || Number(rubro.costo_mano_obra) === 0);
          } else {
            // Rubro without materials - calculate based on cantidad_aplicada / m2
            const cantidadTotal = Number(rubro.m2) || 0;
            const cantidadAplicada = Number(rubro.cantidad_aplicada) || 0;
            if (cantidadTotal > 0) {
              rubroProgress = (cantidadAplicada / cantidadTotal) * 100;
            }
            rubroComplete = rubroProgress >= 100;
          }

          return (
            <Card key={rubro.id || idx} className={rubroComplete ? "border-accent/50" : ""}>
              <CardContent className="p-0">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleRubro(idx)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${
                      rubroComplete
                        ? "bg-accent/20 text-accent"
                        : "bg-primary/10 text-primary"
                    }`}>
                      {rubroComplete ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {rubro.descripcion || "Sin descripción"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        {rubro.service_name && (
                          <Badge variant="secondary" className="text-xs gap-1 h-5">
                            <Wand2 className="h-3 w-3" />
                            {rubro.service_name}
                          </Badge>
                        )}
                        {rubro.m2 && (
                          <span>{Number(rubro.m2)} {unidadLabel}</span>
                        )}
                        {rubro.dias_estimados && (
                          <span>~{Number(rubro.dias_estimados)} días</span>
                        )}
                        {materialesTotal > 0 && (
                          <Badge variant={allMaterialsApplied ? "default" : "outline"} className="text-xs h-5">
                            {materialesApplied}/{materialesTotal} materiales
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-mono font-bold text-sm">
                        ${formatM(Number(rubro.subtotal))}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {rubroProgress.toFixed(0)}% aplicado
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Rubro progress bar + Material controls (collapsed view) */}
                {!isExpanded && (
                  <div className="px-4 pb-3 space-y-2">
                    {/* Progress bar - always show for rubros without materials, or when progress > 0 */}
                    {(rubroProgress > 0 || materiales.length === 0) && (
                      <Progress value={rubroProgress} className="h-1.5" />
                    )}
                    {/* Material application controls */}
                    {materiales.length > 0 && (
                      <div className="space-y-2">
                        {materiales.map((mat: any) => {
                          const cantidadTotal = Number(mat.cantidad);
                          const cantidadAplicada = Number(mat.cantidad_aplicada || 0);
                          const cantidadRestante = cantidadTotal - cantidadAplicada;
                          const porcentajeAplicado = cantidadTotal > 0 ? (cantidadAplicada / cantidadTotal) * 100 : 0;
                          const currentInput = cantidadesToApply[mat.id] || "";

                          return (
                            <div 
                              key={mat.id} 
                              className={`p-3 rounded-md text-xs ${
                                mat.applied ? "bg-accent/10" : "bg-muted/30"
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center gap-2 mb-3">
                                {mat.applied ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                                ) : porcentajeAplicado > 0 ? (
                                  <div className="h-3.5 w-3.5 rounded-full border-2 border-accent flex-shrink-0 flex items-center justify-center">
                                    <div className="h-1.5 w-1.5 rounded-full bg-accent"></div>
                                  </div>
                                ) : (
                                  <Circle className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
                                )}
                                <span className={`font-medium truncate ${mat.applied ? "text-accent" : ""}`}>
                                  {mat.nombre}
                                </span>
                                <span className="text-muted-foreground flex-shrink-0">
                                  {cantidadAplicada.toFixed(1)}/{cantidadTotal.toFixed(1)} {mat.unidad}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-center gap-2">
                                {mat.applied ? (
                                  <Badge variant="default" className="text-xs h-6">100% Completado</Badge>
                                ) : (
                                  <>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      max={cantidadRestante}
                                      value={currentInput}
                                      onChange={(e) => setCantidadesToApply((prev) => ({ ...prev, [mat.id]: e.target.value }))}
                                      placeholder={`${cantidadRestante.toFixed(1)}`}
                                      className="h-7 text-xs w-20 text-center"
                                      disabled={applyingId === mat.id}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <span className="text-xs text-muted-foreground">{mat.unidad}</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs px-3"
                                      disabled={applyingId === mat.id || !currentInput}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleApplyMaterial(mat.id, parseFloat(currentInput));
                                      }}
                                    >
                                      {applyingId === mat.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <>
                                          <Save className="h-3 w-3 mr-1" />
                                          Guardar
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="h-7 text-xs px-3"
                                      disabled={applyingId === mat.id || cantidadRestante <= 0}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleApplyMaterial(mat.id, cantidadRestante);
                                      }}
                                    >
                                      100%
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Rubro direct progress control (for rubros without materials) */}
                    {materiales.length === 0 && Number(rubro.m2) > 0 && (
                      <div 
                        className={`p-3 rounded-md text-xs ${
                          rubroProgress >= 100 ? "bg-accent/10" : "bg-muted/30"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          {rubroProgress >= 100 ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                          ) : rubroProgress > 0 ? (
                            <div className="h-3.5 w-3.5 rounded-full border-2 border-accent flex-shrink-0 flex items-center justify-center">
                              <div className="h-1.5 w-1.5 rounded-full bg-accent"></div>
                            </div>
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
                          )}
                          <span className={`font-medium ${rubroProgress >= 100 ? "text-accent" : ""}`}>
                            Avance del rubro
                          </span>
                          <span className="text-muted-foreground">
                            {Number(rubro.cantidad_aplicada || 0).toFixed(1)}/{Number(rubro.m2).toFixed(1)} {unidadLabel}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-center gap-2">
                          {rubroProgress >= 100 ? (
                            <Badge variant="default" className="text-xs h-6">100% Completado</Badge>
                          ) : (
                            <>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max={Number(rubro.m2)}
                                value={rubroProgressInputs[rubro.id] || ""}
                                onChange={(e) => setRubroProgressInputs((prev) => ({ ...prev, [rubro.id]: e.target.value }))}
                                placeholder={`${Number(rubro.cantidad_aplicada || 0).toFixed(1)}`}
                                className="h-7 text-xs w-20 text-center"
                                disabled={applyingId === `rubro-${rubro.id}`}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="text-xs text-muted-foreground">{unidadLabel}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-3"
                                disabled={applyingId === `rubro-${rubro.id}` || !rubroProgressInputs[rubro.id]}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApplyRubroProgress(rubro.id, parseFloat(rubroProgressInputs[rubro.id]));
                                }}
                              >
                                {applyingId === `rubro-${rubro.id}` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <Save className="h-3 w-3 mr-1" />
                                    Guardar
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs px-3"
                                disabled={applyingId === `rubro-${rubro.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApplyRubroProgress(rubro.id, Number(rubro.m2));
                                }}
                              >
                                100%
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    <Separator />

                    {/* Progress bar */}
                    <div className="flex items-center gap-3">
                      <Progress value={rubroProgress} className="h-2 flex-1" />
                      <span className="text-xs font-medium text-muted-foreground w-12 text-right">
                        {rubroProgress.toFixed(0)}%
                      </span>
                    </div>

                    {/* Cost Breakdown */}
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className={`rounded-lg p-3 ${allMaterialsApplied ? "bg-accent/10" : "bg-muted/50"}`}>
                        <p className="text-xs text-muted-foreground mb-1">Materiales</p>
                        <p className="font-mono font-medium">${formatM(Number(rubro.costo_materiales))}</p>
                        {allMaterialsApplied && (
                          <p className="text-xs text-accent flex items-center gap-1 mt-1">
                            <Check className="h-3 w-3" /> Aplicado
                          </p>
                        )}
                      </div>
                      <div className={`rounded-lg p-3 ${manoObraApplied ? "bg-accent/10" : "bg-muted/50"}`}>
                        <p className="text-xs text-muted-foreground mb-1">Mano de Obra</p>
                        <p className="font-mono font-medium">${formatM(Number(rubro.costo_mano_obra))}</p>
                        {manoObraApplied ? (
                          <p className="text-xs text-accent flex items-center gap-1 mt-1">
                            <Check className="h-3 w-3" /> Aplicado
                          </p>
                        ) : allMaterialsApplied && Number(rubro.costo_mano_obra) > 0 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs mt-1"
                            disabled={applyingId === -rubro.id}
                            onClick={() => handleApplyManoObra(rubro.id)}
                          >
                            {applyingId === -rubro.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Check className="h-3 w-3 mr-1" />
                            )}
                            Aplicar
                          </Button>
                        ) : null}
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground mb-1">Costos Fijos</p>
                        <p className="font-mono font-medium">${formatM(Number(rubro.costo_fijos_prorrateados))}</p>
                      </div>
                    </div>

                    {/* Materials List */}
                    {materiales.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Materiales ({materialesApplied}/{materialesTotal} aplicados):
                        </p>
                        <div className="rounded-lg border overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="text-left p-2 font-medium w-8"></th>
                                <th className="text-left p-2 font-medium">Material</th>
                                <th className="text-right p-2 font-medium">Cantidad Total</th>
                                <th className="text-right p-2 font-medium">Aplicado</th>
                                <th className="text-left p-2 font-medium">Unidad</th>
                                <th className="text-right p-2 font-medium">P. Unit.</th>
                                <th className="text-right p-2 font-medium">Total</th>
                                <th className="text-center p-2 font-medium w-48">Aplicar</th>
                              </tr>
                            </thead>
                            <tbody>
                              {materiales.map((mat: any) => {
                                const cantidadTotal = Number(mat.cantidad);
                                const cantidadAplicada = Number(mat.cantidad_aplicada || 0);
                                const cantidadRestante = cantidadTotal - cantidadAplicada;
                                const porcentajeAplicado = cantidadTotal > 0 ? (cantidadAplicada / cantidadTotal) * 100 : 0;
                                const currentInput = cantidadesToApply[mat.id] || "";

                                return (
                                  <tr key={mat.id} className={`border-t border-border/50 ${mat.applied ? "bg-accent/5" : ""}`}>
                                    <td className="p-2 text-center">
                                      {mat.applied ? (
                                        <CheckCircle2 className="h-4 w-4 text-accent inline-block" />
                                      ) : porcentajeAplicado > 0 ? (
                                        <div className="h-4 w-4 rounded-full border-2 border-accent inline-flex items-center justify-center">
                                          <div className="h-2 w-2 rounded-full bg-accent"></div>
                                        </div>
                                      ) : (
                                        <Circle className="h-4 w-4 text-muted-foreground/40 inline-block" />
                                      )}
                                    </td>
                                    <td className={`p-2 font-medium ${mat.applied ? "text-accent" : ""}`}>
                                      {mat.nombre}
                                      {porcentajeAplicado > 0 && !mat.applied && (
                                        <span className="ml-2 text-xs text-accent">({porcentajeAplicado.toFixed(0)}%)</span>
                                      )}
                                    </td>
                                    <td className="p-2 text-right font-mono">{cantidadTotal.toFixed(1)}</td>
                                    <td className="p-2 text-right font-mono text-accent font-medium">{cantidadAplicada.toFixed(1)}</td>
                                    <td className="p-2">{mat.unidad}</td>
                                    <td className="p-2 text-right font-mono">${formatM(Number(mat.precio_unitario))}</td>
                                    <td className="p-2 text-right font-mono font-medium">${formatM(Number(mat.total))}</td>
                                    <td className="p-2">
                                      {mat.applied ? (
                                        <Badge variant="default" className="text-xs h-6 w-full justify-center">
                                          100% Aplicado
                                        </Badge>
                                      ) : (
                                        <div className="flex items-center gap-1">
                                          <Input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max={cantidadRestante}
                                            value={currentInput}
                                            onChange={(e) => setCantidadesToApply((prev) => ({ ...prev, [mat.id]: e.target.value }))}
                                            placeholder={`Max: ${cantidadRestante.toFixed(1)}`}
                                            className="h-6 text-xs w-20"
                                            disabled={applyingId === mat.id}
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-6 text-xs px-2"
                                            disabled={applyingId === mat.id || !currentInput}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleApplyMaterial(mat.id, parseFloat(currentInput));
                                            }}
                                          >
                                            {applyingId === mat.id ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <Save className="h-3 w-3" />
                                            )}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="default"
                                            className="h-6 text-xs px-2"
                                            disabled={applyingId === mat.id || cantidadRestante <= 0}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleApplyMaterial(mat.id, cantidadRestante);
                                            }}
                                          >
                                            100%
                                          </Button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}