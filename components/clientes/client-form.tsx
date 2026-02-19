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
  observaciones: string;
}

const EMPTY_FORM: ClientFormData = {
  apellido_nombre: "",
  numero_contrato: "",
  dni: "",
  domicilio_legal: "",
  domicilio_obra: "",
  telefono: "",
  email: "",
  observaciones: "",
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

      {/* Observaciones Generales */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wide">
          Observaciones
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
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
