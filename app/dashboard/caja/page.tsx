"use client";

import React from "react"

import { useState } from "react";
import useSWR from "swr";
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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const WALLET_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  banco: {
    label: "Banco",
    icon: Landmark,
    color: "bg-primary/10 text-primary",
  },
  mercado_pago: {
    label: "Mercado Pago",
    icon: Smartphone,
    color: "bg-accent/10 text-accent",
  },
  efectivo_pesos: {
    label: "Efectivo $",
    icon: Banknote,
    color: "bg-chart-3/10 text-chart-3",
  },
  efectivo_usd: {
    label: "Efectivo USD",
    icon: DollarSign,
    color: "bg-chart-4/10 text-chart-4",
  },
  cheque: {
    label: "Cheques",
    icon: FileText,
    color: "bg-muted-foreground/10 text-muted-foreground",
  },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
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

  const query = new URLSearchParams();
  if (fromDate) query.set("from", fromDate);
  if (toDate) query.set("to", toDate);
  if (filterMethod !== "all") query.set("method", filterMethod);

  const { data, mutate, isLoading } = useSWR(
    `/api/caja?${query.toString()}`,
    fetcher
  );

  const balances: Record<string, number> = {};
  if (data?.balances) {
    for (const b of data.balances) {
      balances[b.payment_method] = Number(b.ingresos) - Number(b.egresos);
    }
  }
  const totalCaja = Object.values(balances).reduce((a, b) => a + b, 0);
  const movements = data?.movements || [];

  function openDialog(type: "ingreso" | "egreso") {
    setDialogType(type);
    setDialogOpen(true);
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Caja General"
        description="Tesorería - Flujo de caja general"
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div />
        <div className="flex gap-2">
          <Button
            onClick={() => openDialog("ingreso")}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <ArrowDownCircle className="mr-2 h-4 w-4" />
            Ingreso
          </Button>
          <Button variant="destructive" onClick={() => openDialog("egreso")}>
            <ArrowUpCircle className="mr-2 h-4 w-4" />
            Egreso
          </Button>
        </div>
      </div>

      {/* Total */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Total Disponible en Caja
            </p>
            <p
              className={`text-3xl font-bold ${totalCaja >= 0 ? "text-foreground" : "text-destructive"}`}
            >
              {formatCurrency(totalCaja)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Cards */}
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
        {Object.entries(WALLET_CONFIG).map(([key, config]) => {
          const amount = balances[key] || 0;
          return (
            <Card key={key}>
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
                    {formatCurrency(amount)}
                  </p>
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
                  <SelectItem value="banco">Banco</SelectItem>
                  <SelectItem value="mercado_pago">Mercado Pago</SelectItem>
                  <SelectItem value="efectivo_pesos">Efectivo $</SelectItem>
                  <SelectItem value="efectivo_usd">Efectivo USD</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
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
              {movements.map(
                (m: {
                  id: number;
                  type: string;
                  amount: number;
                  payment_method: string;
                  concept: string;
                  category: string | null;
                  date: string;
                  client_name: string | null;
                  project_name: string | null;
                }) => (
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
                      </div>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        m.type === "ingreso"
                          ? "text-accent"
                          : "text-destructive"
                      }`}
                    >
                      {m.type === "ingreso" ? "+" : "-"}
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
                            ¿Estás seguro? Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(m.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
            onSuccess={() => {
              setDialogOpen(false);
              mutate();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
