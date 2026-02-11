"use client";

import React from "react"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface ClientFormData {
  apellido_nombre: string;
  numero_contrato: string;
  dni: string;
  domicilio_legal: string;
  domicilio_obra: string;
  telefono: string;
  email: string;
  presupuesto_observacion: string;
  fecha_alta: string;
  denominacion: string;
  plan_pago: string;
  observaciones: string;
  tiempo_obra_estimado: string;
  agenda_inicio: string;
  agenda_cierre: string;
}

const EMPTY_FORM: ClientFormData = {
  apellido_nombre: "",
  numero_contrato: "",
  dni: "",
  domicilio_legal: "",
  domicilio_obra: "",
  telefono: "",
  email: "",
  presupuesto_observacion: "",
  fecha_alta: new Date().toISOString().split("T")[0],
  denominacion: "",
  plan_pago: "",
  observaciones: "",
  tiempo_obra_estimado: "",
  agenda_inicio: "",
  agenda_cierre: "",
};

interface ClientFormProps {
  initialData?: Partial<ClientFormData>;
  clientId?: number;
  onSuccess: () => void;
}

export function ClientForm({
  initialData,
  clientId,
  onSuccess,
}: ClientFormProps) {
  const [form, setForm] = useState<ClientFormData>({
    ...EMPTY_FORM,
    ...initialData,
  });
  const [loading, setLoading] = useState(false);

  const isEdit = !!clientId;

  function updateField(field: keyof ClientFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEdit ? `/api/clientes/${clientId}` : "/api/clientes";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar");
      }

      toast.success(
        isEdit ? "Cliente actualizado" : "Cliente registrado correctamente"
      );
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al guardar el cliente"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Datos Obligatorios */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wide">
          Datos Obligatorios
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="apellido_nombre">
              Apellido y Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="apellido_nombre"
              value={form.apellido_nombre}
              onChange={(e) => updateField("apellido_nombre", e.target.value)}
              required
              placeholder="Ej: Fischer, Silvia"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="numero_contrato">
              N° de Contrato <span className="text-destructive">*</span>
            </Label>
            <Input
              id="numero_contrato"
              value={form.numero_contrato}
              onChange={(e) => updateField("numero_contrato", e.target.value)}
              required
              placeholder="Ej: CONTR-001"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dni">
              DNI <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dni"
              value={form.dni}
              onChange={(e) => updateField("dni", e.target.value)}
              required
              placeholder="Ej: 30.456.789"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="domicilio_legal">
              Domicilio Legal <span className="text-destructive">*</span>
            </Label>
            <Input
              id="domicilio_legal"
              value={form.domicilio_legal}
              onChange={(e) => updateField("domicilio_legal", e.target.value)}
              required
              placeholder="Direccion legal completa"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="domicilio_obra">
              Domicilio de Obra <span className="text-destructive">*</span>
            </Label>
            <Input
              id="domicilio_obra"
              value={form.domicilio_obra}
              onChange={(e) => updateField("domicilio_obra", e.target.value)}
              required
              placeholder="Direccion de la obra"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Datos de contacto */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wide">
          Contacto
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="telefono">Telefono</Label>
            <Input
              id="telefono"
              value={form.telefono}
              onChange={(e) => updateField("telefono", e.target.value)}
              placeholder="Ej: +54 9 261 555-1234"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="cliente@email.com"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Datos de la operacion */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wide">
          Datos de la Operacion
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fecha_alta">Fecha de Alta</Label>
            <Input
              id="fecha_alta"
              type="date"
              value={form.fecha_alta}
              onChange={(e) => updateField("fecha_alta", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="denominacion">Denominacion de Obra</Label>
            <Input
              id="denominacion"
              value={form.denominacion}
              onChange={(e) => updateField("denominacion", e.target.value)}
              placeholder="Nombre asignado a la obra"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="presupuesto_observacion">
              Presupuesto Consolidado - Observaciones
            </Label>
            <Textarea
              id="presupuesto_observacion"
              value={form.presupuesto_observacion}
              onChange={(e) =>
                updateField("presupuesto_observacion", e.target.value)
              }
              placeholder="Observaciones del presupuesto..."
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="plan_pago">Plan de Pago</Label>
            <Textarea
              id="plan_pago"
              value={form.plan_pago}
              onChange={(e) => updateField("plan_pago", e.target.value)}
              placeholder="Detalles del plan de pago segun contrato..."
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tiempo_obra_estimado">Tiempo de Obra Estimado</Label>
            <Input
              id="tiempo_obra_estimado"
              value={form.tiempo_obra_estimado}
              onChange={(e) =>
                updateField("tiempo_obra_estimado", e.target.value)
              }
              placeholder="Ej: 3 meses"
            />
          </div>
          <div className="flex flex-col gap-1.5" />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="agenda_inicio">Agenda - Fecha Inicio</Label>
            <Input
              id="agenda_inicio"
              type="date"
              value={form.agenda_inicio}
              onChange={(e) => updateField("agenda_inicio", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="agenda_cierre">Agenda - Fecha Cierre</Label>
            <Input
              id="agenda_cierre"
              type="date"
              value={form.agenda_cierre}
              onChange={(e) => updateField("agenda_cierre", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              value={form.observaciones}
              onChange={(e) => updateField("observaciones", e.target.value)}
              placeholder="Notas adicionales..."
              rows={3}
            />
          </div>
        </div>
      </div>

      <Button type="submit" className="ml-auto" disabled={loading}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        {isEdit ? "Guardar Cambios" : "Registrar Cliente"}
      </Button>
    </form>
  );
}
