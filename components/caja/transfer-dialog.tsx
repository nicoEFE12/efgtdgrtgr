"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TransferDialog({
  open,
  onOpenChange,
  onSuccess,
}: TransferDialogProps) {
  const [amount, setAmount] = useState("");
  const [projectId, setProjectId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [concept, setConcept] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: projectsData } = useSWR(
    open ? "/api/proyectos" : null,
    fetcher
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !projectId || !paymentMethod || !concept) {
      toast.error("Complete todos los campos requeridos");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/proyectos/${projectId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          concept,
          notes: notes || null,
        }),
      });

      if (res.ok) {
        toast.success("Transferencia realizada correctamente");
        setAmount("");
        setProjectId("");
        setPaymentMethod("");
        setConcept("");
        setNotes("");
        onOpenChange(false);
        onSuccess();
      } else {
        const error = await res.json();
        toast.error(error.error || "Error al realizar la transferencia");
      }
    } catch (error) {
      console.error("[v0] Transfer error:", error);
      toast.error("Error al realizar la transferencia");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir a Caja de Proyecto</DialogTitle>
          <DialogDescription>
            Asignar fondos de la caja general a un proyecto específico
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Proyecto/Contrato</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proyecto" />
              </SelectTrigger>
              <SelectContent>
                {projectsData?.projects?.map(
                  (p: {
                    id: number;
                    nombre: string;
                    numero_contrato: string;
                    estado: string;
                  }) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.numero_contrato} - {p.nombre}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Monto</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Medio de Pago</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar medio" />
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
              placeholder="Ej: Transferencia para materiales"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Notas (opcional)</Label>
            <Textarea
              placeholder="Información adicional..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Procesando..." : "Transferir"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
