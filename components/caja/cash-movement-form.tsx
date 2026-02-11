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

interface CashMovementFormProps {
  type: "ingreso" | "egreso";
  projectId?: number;
  isProjectCash?: boolean;
  onSuccess: () => void;
}

export function CashMovementForm({
  type,
  projectId,
  isProjectCash,
  onSuccess,
}: CashMovementFormProps) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("banco");
  const [concept, setConcept] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [clientId, setClientId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: clientsData } = useSWR(
    type === "ingreso" && !isProjectCash ? "/api/clientes" : null,
    fetcher
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          concept,
          category: category || null,
          client_id: clientId ? parseInt(clientId) : null,
          project_id: projectId || null,
          date,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      toast.success(
        type === "ingreso" ? "Ingreso registrado" : "Egreso registrado"
      );
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al registrar movimiento"
      );
    } finally {
      setLoading(false);
    }
  }

  const EGRESO_CATEGORIES = [
    "Materiales",
    "Mano de obra",
    "Flete",
    "Herramientas",
    "Servicios",
    "Impuestos",
    "Alquiler",
    "Combustible",
    "Varios",
  ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>
          Monto <span className="text-destructive">*</span>
        </Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="text-lg font-semibold"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>
          Medio de Pago <span className="text-destructive">*</span>
        </Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="banco">Banco / Transferencia</SelectItem>
            <SelectItem value="mercado_pago">Mercado Pago</SelectItem>
            <SelectItem value="efectivo_pesos">Efectivo Pesos</SelectItem>
            <SelectItem value="efectivo_usd">Efectivo USD</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>
          Concepto <span className="text-destructive">*</span>
        </Label>
        <Input
          placeholder="Descripcion del movimiento"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          required
        />
      </div>

      {type === "egreso" && (
        <div className="flex flex-col gap-1.5">
          <Label>Categoria</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar categoria" />
            </SelectTrigger>
            <SelectContent>
              {EGRESO_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat.toLowerCase()}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Fecha</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {type === "ingreso" && !isProjectCash && clientsData?.clients && (
        <div className="flex flex-col gap-1.5">
          <Label>Cliente asociado</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger>
              <SelectValue placeholder="Opcional" />
            </SelectTrigger>
            <SelectContent>
              {clientsData.clients.map(
                (c: { id: number; apellido_nombre: string }) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.apellido_nombre}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Notas</Label>
        <Textarea
          placeholder="Notas adicionales..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <Button type="submit" disabled={loading} className="mt-2">
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Registrar {type === "ingreso" ? "Ingreso" : "Egreso"}
      </Button>
    </form>
  );
}
