"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface DollarRate {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

export function ExchangeRateCard() {
  const [mounted, setMounted] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Fetch oficial rate
  const { data: oficialData, isLoading: oficialLoading, mutate: mutateOficial } = useSWR<DollarRate>(
    "https://dolarapi.com/v1/dolares/oficial",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  );

  // Fetch blue rate
  const { data: blueData, isLoading: blueLoading, mutate: mutateBlue } = useSWR<DollarRate>(
    "https://dolarapi.com/v1/dolares/blue",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!mounted) return;

    const interval = setInterval(() => {
      mutateOficial();
      mutateBlue();
      setLastRefresh(new Date());
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [mounted, mutateOficial, mutateBlue]);

  const handleManualRefresh = async () => {
    await mutateOficial();
    await mutateBlue();
    setLastRefresh(new Date());
  };

  if (!mounted) {
    return null;
  }

  const isLoading = oficialLoading || blueLoading;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Tipo de Cambio USD</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleManualRefresh}
          disabled={isLoading}
          className="h-8 w-8"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Oficial Rate */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/50">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Dólar Oficial</p>
              <p className="text-2xl font-bold">
                {oficialData?.venta ? `$${oficialData.venta.toFixed(2)}` : "—"}
              </p>
            </div>
            <div className="text-right space-y-1">
              <Badge variant="outline" className="text-xs">
                Compra: ${oficialData?.compra?.toFixed(2) || "—"}
              </Badge>
              {oficialData?.fechaActualizacion && (
                <p className="text-xs text-muted-foreground">
                  {new Date(oficialData.fechaActualizacion).toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Blue Rate */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Dólar Blue</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {blueData?.venta ? `$${blueData.venta.toFixed(2)}` : "—"}
              </p>
            </div>
            <div className="text-right space-y-1">
              <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900">
                Compra: ${blueData?.compra?.toFixed(2) || "—"}
              </Badge>
              {blueData?.fechaActualizacion && (
                <p className="text-xs text-muted-foreground">
                  {new Date(blueData.fechaActualizacion).toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Differential */}
          {oficialData?.venta && blueData?.venta && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-accent/10">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Diferencia (Blue - Oficial)</p>
                <p className="text-xl font-bold">
                  ${(blueData.venta - oficialData.venta).toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="text-xs">
                  {(((blueData.venta - oficialData.venta) / oficialData.venta) * 100).toFixed(1)}%
                </Badge>
              </div>
            </div>
          )}

          {/* Last updated */}
          {lastRefresh && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              Actualizado: {lastRefresh.toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          )}

          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Fuente: dolarapi.com • Se actualiza cada 5 minutos
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
