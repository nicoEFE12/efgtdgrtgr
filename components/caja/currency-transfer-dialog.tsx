"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownCircle, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface WalletConfig {
  label: string;
  currency: "ARS" | "USD";
  icon: React.ElementType;
  color: string;
}

interface CurrencyTransferDialogProps {
  fromWallet: { key: string; config: WalletConfig; balance: number };
  toWallet: { key: string; config: WalletConfig; balance: number };
  onTransfer: (fromKey: string, toKey: string, amount: number, rate: number) => Promise<void>;
}

export function CurrencyTransferDialog({
  fromWallet,
  toWallet,
  onTransfer,
}: CurrencyTransferDialogProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [customRate, setCustomRate] = useState("");
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<number>(0);

  const isUSDTransfer =
    (fromWallet.config.currency === "USD" && toWallet.config.currency === "ARS") ||
    (fromWallet.config.currency === "ARS" && toWallet.config.currency === "USD");

  // Fetch exchange rate when dialog opens
  useEffect(() => {
    if (open && isUSDTransfer && !exchangeRate) {
      fetchExchangeRate();
    }
  }, [open, isUSDTransfer, exchangeRate]);

  const fetchExchangeRate = async () => {
    setConverting(true);
    try {
      const response = await fetch("https://dolarapi.com/v1/dolares/oficial");
      const data = await response.json();
      const rate = data.venta || data.compra;
      if (rate) {
        setExchangeRate(rate);
        setCustomRate(rate.toString());
        toast.success(`Tasa de cambio obtenida: $${rate.toFixed(2)}`);
      }
    } catch (error) {
      toast.error("No se pudo obtener la tasa de cambio");
      console.error(error);
    } finally {
      setConverting(false);
    }
  };

  // Calculate result when amount or rate changes
  useEffect(() => {
    if (amount && customRate) {
      const rate = parseFloat(customRate);
      const amountVal = parseFloat(amount);

      if (!isNaN(rate) && !isNaN(amountVal)) {
        if (fromWallet.config.currency === "USD") {
          // USD to ARS
          setResult(amountVal * rate);
        } else {
          // ARS to USD
          setResult(amountVal / rate);
        }
      }
    } else {
      setResult(0);
    }
  }, [amount, customRate, fromWallet.config.currency]);

  const handleTransfer = async () => {
    if (!amount || !customRate) {
      toast.error("Complete todos los campos");
      return;
    }

    const rate = parseFloat(customRate);
    const amountVal = parseFloat(amount);

    if (amountVal > fromWallet.balance) {
      toast.error("Saldo insuficiente");
      return;
    }

    setLoading(true);
    try {
      await onTransfer(fromWallet.key, toWallet.key, amountVal, rate);
      setOpen(false);
      setAmount("");
      setCustomRate("");
      setExchangeRate(null);
    } finally {
      setLoading(false);
    }
  };

  const FromIcon = fromWallet.config.icon;
  const ToIcon = toWallet.config.icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <ArrowDownCircle className="h-4 w-4 mr-2" />
          Transferir
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir Fondos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* From Wallet */}
          <div className="p-3 rounded-lg border border-border bg-muted/50">
            <p className="text-xs text-muted-foreground mb-2">Desde</p>
            <div className="flex items-center gap-2">
              <FromIcon className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">{fromWallet.config.label}</p>
                <p className="text-xs text-muted-foreground">
                  Saldo: {fromWallet.config.currency === "USD" ? "$" : "ARS $"}
                  {fromWallet.balance.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label>Cantidad {fromWallet.config.currency}</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max={fromWallet.balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Exchange Rate Section - Only for USD transfers */}
          {isUSDTransfer && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tasa de Cambio</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchExchangeRate}
                  disabled={converting}
                >
                  {converting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <Input
                type="number"
                step="0.01"
                value={customRate}
                onChange={(e) => setCustomRate(e.target.value)}
                placeholder="Tasa de cambio"
              />
              {exchangeRate && (
                <p className="text-xs text-muted-foreground">
                  Tasa de dolarapi.com: ${exchangeRate.toFixed(2)}
                </p>
              )}
            </div>
          )}

          {/* Conversion Arrow */}
          {amount && customRate && isUSDTransfer && (
            <div className="flex items-center justify-center py-2">
              <ArrowDownCircle className="h-5 w-5 text-muted-foreground" />
            </div>
          )}

          {/* To Wallet */}
          <div className="p-3 rounded-lg border border-border bg-muted/50">
            <p className="text-xs text-muted-foreground mb-2">Hacia</p>
            <div className="flex items-center gap-2">
              <ToIcon className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">{toWallet.config.label}</p>
                <p className="text-xs text-muted-foreground">
                  Saldo: {toWallet.config.currency === "USD" ? "$" : "ARS $"}
                  {toWallet.balance.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Result */}
          {amount && customRate && (
            <Card className="bg-accent/5 border-accent/20">
              <div className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Recibirá aproximadamente</p>
                <p className="text-2xl font-bold">
                  {toWallet.config.currency === "USD" ? "$" : "ARS $"}
                  {result.toFixed(2)}
                </p>
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={loading || !amount || !customRate}
              className="flex-1"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Transferir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
