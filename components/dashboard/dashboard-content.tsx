"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Wallet,
  FolderKanban,
  Landmark,
  Smartphone,
  Banknote,
  DollarSign,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Package2,
  Calculator,
  Receipt,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DashboardData {
  clientesActivos: number;
  proyectos: {
    activos: number;
    pendientes: number;
    cerrados: number;
  };
  wallets: Record<string, number>;
  totalCaja: number;
}

const WALLET_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType }
> = {
  banco: { label: "Banco", icon: Landmark },
  mercado_pago: { label: "Mercado Pago", icon: Smartphone },
  efectivo_pesos: { label: "Efectivo $", icon: Banknote },
  efectivo_usd: { label: "Efectivo USD", icon: DollarSign },
  cheque: { label: "Cheques", icon: FileText },
};

function formatCurrency(amount: number, currency = "ARS") {
  if (currency === "USD") {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(amount);
}

export function DashboardContent({ data }: { data: DashboardData }) {
  const router = useRouter();

  const modules = [
    {
      title: "Caja",
      description: "Gestión de ingresos y egresos",
      icon: Wallet,
      href: "/dashboard/caja",
      color: "bg-blue-500",
    },
    {
      title: "Proyectos",
      description: "Obras activas y finalizadas", 
      icon: FolderKanban,
      href: "/dashboard/proyectos",
      color: "bg-green-500",
    },
    {
      title: "Clientes",
      description: "Base de datos de clientes",
      icon: Users,
      href: "/dashboard/clientes", 
      color: "bg-purple-500",
    },
    {
      title: "Materiales",
      description: "Inventario y precios",
      icon: Package2,
      href: "/dashboard/materiales",
      color: "bg-orange-500",
    },
    {
      title: "Cotizador", 
      description: "Crear cotizaciones",
      icon: Calculator,
      href: "/dashboard/cotizador",
      color: "bg-teal-500",
    },
    {
      title: "Servicios",
      description: "Tipos de servicios",
      icon: Receipt,
      href: "/dashboard/servicios",
      color: "bg-pink-500",
    },
  ];
  return (
    <div className="flex flex-col gap-6">
      {/* Header with Logo */}
      <Card className="overflow-hidden border-0 bg-gradient-to-r from-primary via-primary/80 to-primary/60 text-white shadow-lg">
        <div className="flex items-center gap-6 px-6 py-8">
          <div className="hidden sm:flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <Image
              src="/logo.png"
              alt="Am Soluciones Constructivas"
              width={64}
              height={64}
              className="object-contain"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold tracking-tight">
              Am Soluciones Constructivas
            </h1>
            <p className="mt-1 text-white/80">
              Sistema integral de gestión
            </p>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes Activos
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {data.clientesActivos}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Obras Activas
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {data.proyectos.activos}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.proyectos.pendientes} pendientes &middot;{" "}
              {data.proyectos.cerrados} cerradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total en Caja
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold ${data.totalCaja >= 0 ? "text-foreground" : "text-destructive"}`}
            >
              {formatCurrency(data.totalCaja)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Proyectos Totales
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {data.proyectos.activos +
                data.proyectos.pendientes +
                data.proyectos.cerrados}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          Acceso Rápido
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <Card key={module.href} className="group cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5" onClick={() => router.push(module.href)}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${module.color}`}>
                  <module.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {module.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {module.description}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Wallets */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          Saldos por Billetera
        </h2>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {Object.entries(WALLET_CONFIG).map(([key, config]) => {
            const amount = data.wallets[key] || 0;
            const isPositive = amount >= 0;
            return (
              <Card key={key}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <config.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {config.label}
                    </p>
                    <p
                      className={`text-lg font-bold ${isPositive ? "text-foreground" : "text-destructive"}`}
                    >
                      {key === "efectivo_usd"
                        ? formatCurrency(amount, "USD")
                        : formatCurrency(amount)}
                    </p>
                  </div>
                  {amount !== 0 && (
                    <div>
                      {isPositive ? (
                        <ArrowUpRight className="h-4 w-4 text-accent" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
