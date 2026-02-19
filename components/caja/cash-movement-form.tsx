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
  currency?: "ARS" | "USD";
  projectId?: number;
  isProjectCash?: boolean;
  onSuccess: () => void;
}

export function CashMovementForm({
  type,
  currency = "ARS",
  projectId,
  isProjectCash,
  onSuccess,
}: CashMovementFormProps) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("banco");
  const [concept, setConcept] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [projectIdState, setProjectIdState] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Converter state - only used for conversions when currency === 'USD'
  const [useConversion, setUseConversion] = useState(true);
  const [showConverter, setShowConverter] = useState(true);
  const [rate, setRate] = useState<number>(1);
  const [arsValue, setArsValue] = useState("");
  const [usdValue, setUsdValue] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Auto-suggest concept for USD transactions with conversion
  React.useEffect(() => {
    if (currency === "USD" && useConversion && !concept) {
      setConcept(
        type === "ingreso"
          ? "Conversión ARS → USD"
          : "Conversión USD → ARS"
      );
    }
  }, [currency, type, useConversion]);

  const formatNumberForInput = (n: number, maxDecimals = 6) => {
    if (!isFinite(n)) return "";
    const s = n.toFixed(maxDecimals);
    return s.includes(".") ? s.replace(/\.0+$|0+$/g, "").replace(/\.$/, "") : s;
  };

  const { data: projectsData } = useSWR(
    type === "ingreso" && !isProjectCash ? "/api/proyectos" : null,
    fetcher
  );

  // session (to check admin role for rate editing)
  const { data: sessionData } = useSWR(`/api/auth/session`, fetcher);
  const isAdmin = sessionData?.user?.role === 'admin';

  // Load exchange rate when converter is visible or when we're in USD savings mode
  React.useEffect(() => {
    async function fetchRate() {
      try {
        const res = await fetch("https://dolarapi.com/v1/dolares/oficial");
        const data = await res.json();
        const r = data?.venta || data?.compra || 1;
        setRate(Number(r));
      } catch (e) {
        setRate(1);
      }
    }

    // Load rate for USD egreso (traditional) OR USD ingreso (new savings mode)
    if (currency === "USD") {
      fetchRate();
    }
  }, [currency]);

  // Sync converter from `amount` ONLY when user is NOT editing converter fields
  React.useEffect(() => {
    if (focusedField === "usd" || focusedField === "ars") return;
    const usd = parseFloat(amount || "0") || 0;
    setUsdValue(usd ? formatNumberForInput(usd, 6) : "");
    setArsValue(usd && rate ? formatNumberForInput(usd * rate, 2) : "");
  }, [amount, rate, focusedField]);

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
          project_id: projectId || (projectIdState ? parseInt(projectIdState) : null),
          date,
          notes: notes || null,
          currency,
          exchange_rate: rate || 1.0,
          // conversion helper: when using conversion mode
          convert_to_ars: currency === 'USD' && useConversion && type === 'egreso',
          ars_amount: currency === 'USD' && useConversion && type === 'egreso' ? parseFloat(arsValue || '0') : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Error al registrar movimiento');
      }

      if (data.counterpart) {
        toast.success('Egreso en USD registrado y ARS acreditados en Caja Pesos');
      } else {
        toast.success(type === "ingreso" ? "Ingreso registrado" : "Egreso registrado");
      }

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
      {/* USD conversion toggle */}
      {currency === "USD" && (
        <div className="rounded-md border border-amber-300/50 p-3 bg-amber-50/30 dark:border-amber-700/40 dark:bg-amber-950/20">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useConversion}
                  onChange={(e) => {
                    setUseConversion(e.target.checked);
                    if (!e.target.checked) {
                      setConcept('');
                      setArsValue('');
                      setUsdValue('');
                    }
                  }}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-semibold">Usar conversión de moneda</span>
              </label>
              <span className="text-xs text-amber-700 dark:text-amber-400">
                {useConversion
                  ? type === "ingreso"
                    ? "Convertir de ARS → USD"
                    : "Convertir de USD → ARS"
                  : "Movimiento directo en USD"}
              </span>
            </div>
          </div>

          {useConversion && (
            <div className="mt-3 rounded-md bg-white/50 dark:bg-black/20 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Tasa de cambio oficial (dolarapi.com)
                </span>
                {isAdmin ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={rate}
                      onChange={(e) => setRate(parseFloat(e.target.value) || 1)}
                      className="h-8 w-32"
                    />
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                    1 USD = ${rate?.toLocaleString(undefined, { maximumFractionDigits: 2 })} ARS
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {type === "ingreso" ? (
                  // Ingreso USD: User enters ARS, we convert to USD
                  <>
                    <div>
                      <Label className="text-xs">Monto en ARS</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={arsValue}
                        onFocus={() => setFocusedField('ars')}
                        onBlur={() => {
                          setFocusedField(null);
                          const ars = parseFloat(arsValue || '0') || 0;
                          setArsValue(ars ? ars.toFixed(2) : '');
                          const usd = rate ? ars / rate : 0;
                          setUsdValue(usd ? usd.toFixed(2) : '');
                          setAmount(usd ? usd.toFixed(2) : '');
                        }}
                        onChange={(e) => {
                          const v = e.target.value;
                          setArsValue(v);
                          const ars = parseFloat(v || '0') || 0;
                          const usd = rate ? ars / rate : 0;
                          setAmount(usd ? formatNumberForInput(usd, 6) : '');
                          setUsdValue(usd ? formatNumberForInput(usd, 6) : '');
                        }}
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Se acreditarán en USD</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={usdValue}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </>
                ) : (
                  // Egreso USD: User enters USD or ARS
                  <>
                    <div>
                      <Label className="text-xs">Monto en USD</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={usdValue}
                        onFocus={() => setFocusedField('usd')}
                        onBlur={() => {
                          setFocusedField(null);
                          const usd = parseFloat(usdValue || '0') || 0;
                          setUsdValue(usd ? usd.toFixed(2) : '');
                          setArsValue(usd && rate ? (usd * rate).toFixed(2) : '');
                          setAmount(usd ? usd.toFixed(2) : '');
                        }}
                        onChange={(e) => {
                          const v = e.target.value;
                          setUsdValue(v);
                          const usd = parseFloat(v || "0") || 0;
                          setAmount(usd ? formatNumberForInput(usd, 6) : "");
                          setArsValue(usd && rate ? formatNumberForInput(usd * rate, 2) : "");
                        }}
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Se acreditarán en ARS</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={arsValue}
                        onFocus={() => setFocusedField('ars')}
                        onBlur={() => {
                          setFocusedField(null);
                          const n = parseFloat(arsValue || '0') || 0;
                          const usd = rate ? n / rate : 0;
                          setArsValue(n ? n.toFixed(2) : '');
                          setUsdValue(usd ? usd.toFixed(2) : '');
                          setAmount(usd ? usd.toFixed(2) : '');
                        }}
                        onChange={(e) => {
                          const v = e.target.value;
                          setArsValue(v);
                          const n = parseFloat(v || '0') || 0;
                          const usd = rate ? n / rate : 0;
                          setAmount(usd ? formatNumberForInput(usd, 6) : '');
                          setUsdValue(usd ? formatNumberForInput(usd, 6) : '');
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {/* For USD, the amount is determined by the converter above (if enabled) */}
        {currency === "USD" ? (
          <Label>
            Monto <span className="text-destructive">*</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {useConversion
                ? type === "ingreso"
                  ? "(se calcula desde ARS)"
                  : "(se calcula en convertidor)"
                : "(USD)"}
            </span>
          </Label>
        ) : (
          <Label>
            Monto <span className="text-destructive">*</span>
            <span className="ml-2 text-xs text-muted-foreground">({currency})</span>
          </Label>
        )}

        <Input
          type="number"
          step="0.01"
          min="0.01"
          placeholder={`0.00 (${currency})`}
          value={amount}
          disabled={currency === "USD" && useConversion}
          onFocus={() => setFocusedField('amount')}
          onBlur={() => {
            setFocusedField(null);
            const v = parseFloat(amount || '0') || 0;
            setAmount(v ? v.toFixed(2) : '');
          }}
          onChange={(e) => {
            setAmount(e.target.value);
          }}
          required
          className="text-lg font-semibold"
        />

        <p className="text-xs text-muted-foreground mt-1">
          {currency === "USD" && useConversion && type === "ingreso"
            ? 'Usa el convertidor arriba para seleccionar el monto en ARS que deseas convertir a USD.'
            : currency === "USD" && useConversion && type === "egreso"
            ? 'Usa el convertidor arriba para ver/editar el equivalente en ARS.'
            : currency === "USD" && !useConversion
            ? 'Ingresa directamente el monto en USD sin conversión.'
            : `El monto se registra en ${currency}.`}
        </p>
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

      {type === "ingreso" && !isProjectCash && currency !== "USD" && projectsData?.projects && (
        <div className="flex flex-col gap-1.5">
          <Label>Contrato asociado</Label>
          <Select value={projectIdState} onValueChange={setProjectIdState}>
            <SelectTrigger>
              <SelectValue placeholder="Opcional" />
            </SelectTrigger>
            <SelectContent>
              {projectsData.projects.map(
                (p: { id: number; nombre: string; numero_contrato: string }) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.numero_contrato} - {p.nombre}
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
