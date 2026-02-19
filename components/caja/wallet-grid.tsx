"use client";

import React, { useState } from "react";
import {
  Landmark,
  Smartphone,
  Banknote,
  DollarSign,
  FileText,
  ArrowRightLeft,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CurrencyTransferDialog } from "./currency-transfer-dialog";
import { toast } from "sonner";

interface WalletBalance {
  [key: string]: number;
}

interface WalletConfig {
  label: string;
  currency: "ARS" | "USD";
  icon: React.ElementType;
  color: string;
}

const WALLET_CONFIG: Record<string, WalletConfig> = {
  banco: {
    label: "Banco",
    currency: "ARS",
    icon: Landmark,
    color: "bg-primary/10 text-primary",
  },
  mercado_pago: {
    label: "Mercado Pago",
    currency: "ARS",
    icon: Smartphone,
    color: "bg-accent/10 text-accent",
  },
  efectivo_pesos: {
    label: "Efectivo $",
    currency: "ARS",
    icon: Banknote,
    color: "bg-chart-3/10 text-chart-3",
  },
  efectivo_usd: {
    label: "Efectivo USD",
    currency: "USD",
    icon: DollarSign,
    color: "bg-chart-4/10 text-chart-4",
  },
  cheque: {
    label: "Cheques",
    currency: "ARS",
    icon: FileText,
    color: "bg-muted-foreground/10 text-muted-foreground",
  },
};

interface WalletGridProps {
  balances: WalletBalance;
  onTransfer: (fromKey: string, toKey: string, amount: number, rate: number) => Promise<void>;
}

export function WalletGrid({ balances, onTransfer }: WalletGridProps) {
  const [transferring, setTransferring] = useState(false);

  const arsWallets = Object.entries(WALLET_CONFIG).filter(
    ([_, config]) => config.currency === "ARS"
  );
  const usdWallets = Object.entries(WALLET_CONFIG).filter(
    ([_, config]) => config.currency === "USD"
  );

  const handleTransfer = async (
    fromKey: string,
    toKey: string,
    amount: number,
    rate: number
  ) => {
    setTransferring(true);
    try {
      const response = await fetch("/api/caja/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_method: fromKey,
          to_method: toKey,
          amount,
          exchange_rate: rate,
        }),
      });

      if (!response.ok) {
        throw new Error("Error en la transferencia");
      }

      toast.success("Transferencia realizada correctamente");
      await onTransfer(fromKey, toKey, amount, rate);
    } catch (error) {
      toast.error("Error al realizar la transferencia");
      console.error(error);
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ARS Wallets */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Pesos Argentinos
        </h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {arsWallets.map(([key, config]) => {
            const amount = balances[key] || 0;
            const isPositive = amount >= 0;
            const Icon = config.icon;

            return (
              <Card key={key}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {config.label}
                    </p>
                    <p
                      className={`text-lg font-bold ${
                        isPositive ? "text-foreground" : "text-destructive"
                      }`}
                    >
                      ARS ${amount.toFixed(2)}
                    </p>
                  </div>
                  {usdWallets.length > 0 && (
                    <CurrencyTransferDialog
                      fromWallet={{
                        key: "efectivo_usd",
                        config: WALLET_CONFIG.efectivo_usd,
                        balance: balances.efectivo_usd || 0,
                      }}
                      toWallet={{
                        key,
                        config,
                        balance: amount,
                      }}
                      onTransfer={handleTransfer}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* USD Wallets */}
      {usdWallets.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Dólares Estadounidenses
          </h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {usdWallets.map(([key, config]) => {
              const amount = balances[key] || 0;
              const isPositive = amount >= 0;
              const Icon = config.icon;

              return (
                <Card key={key}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        {config.label}
                      </p>
                      <p
                        className={`text-lg font-bold ${
                          isPositive ? "text-foreground" : "text-destructive"
                        }`}
                      >
                        $ {amount.toFixed(2)} USD
                      </p>
                    </div>
                    {arsWallets.length > 0 && (
                      <CurrencyTransferDialog
                        fromWallet={{
                          key,
                          config,
                          balance: amount,
                        }}
                        toWallet={{
                          key: arsWallets[0][0],
                          config: WALLET_CONFIG[arsWallets[0][0]],
                          balance: balances[arsWallets[0][0]] || 0,
                        }}
                        onTransfer={handleTransfer}
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
