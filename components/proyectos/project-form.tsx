"use client";

import React from "react"

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ProjectForm({ onSuccess }: { onSuccess: () => void }) {
  const { data: clientsData } = useSWR("/api/clientes", fetcher);
  const [clientId, setClientId] = useState("");
  const [nombre, setNombre] = useState("");
  const [contrato, setContrato] = useState("");
  const [presupuesto, setPresupuesto] = useState("");
  const [reservado, setReservado] = useState("");
  const [estado, setEstado] = useState("pendiente");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaCierre, setFechaCierre] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/proyectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: parseInt(clientId),
          nombre,
          numero_contrato: contrato,
          presupuesto_total: parseFloat(presupuesto) || 0,
          importe_reservado: parseFloat(reservado) || 0,
          estado,
          fecha_inicio: fechaInicio || null,
          fecha_cierre: fechaCierre || null,
          observaciones: observaciones || null,
        }),
      });

      if (!res.ok) throw new Error("Error al crear el proyecto");
      toast.success("Proyecto creado correctamente");
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al crear el proyecto"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>
          Cliente <span className="text-destructive">*</span>
        </Label>
        <Select value={clientId} onValueChange={setClientId} required>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar cliente" />
          </SelectTrigger>
          <SelectContent>
            {clientsData?.clients?.map(
              (c: { id: number; apellido_nombre: string }) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.apellido_nombre}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>
          Nombre del Proyecto <span className="text-destructive">*</span>
        </Label>
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          placeholder="Ej: Casa Fischer - Godoy Cruz"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>
          N de Contrato <span className="text-destructive">*</span>
        </Label>
        <Input
          value={contrato}
          onChange={(e) => setContrato(e.target.value)}
          required
          placeholder="Ej: CONTR-001"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Presupuesto Total</Label>
          <Input
            type="number"
            step="0.01"
            value={presupuesto}
            onChange={(e) => setPresupuesto(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Importe Reservado</Label>
          <Input
            type="number"
            step="0.01"
            value={reservado}
            onChange={(e) => setReservado(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Estado</Label>
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="activo">Activo</SelectItem>
            <SelectItem value="cerrado">Cerrado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Fecha Inicio</Label>
          <Input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Fecha Cierre</Label>
          <Input
            type="date"
            value={fechaCierre}
            onChange={(e) => setFechaCierre(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Observaciones</Label>
        <Textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Notas sobre el proyecto..."
          rows={2}
        />
      </div>

      <Button type="submit" disabled={loading} className="mt-2">
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Crear Proyecto
      </Button>
    </form>
  );
}
