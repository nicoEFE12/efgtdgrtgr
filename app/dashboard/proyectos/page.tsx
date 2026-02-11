"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import {
  Plus,
  FolderKanban,
  ArrowRight,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(amount);
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline"; className: string }
> = {
  activo: { label: "Activo", variant: "default", className: "bg-accent text-accent-foreground" },
  pendiente: { label: "Pendiente", variant: "secondary", className: "bg-chart-4/20 text-chart-4" },
  cerrado: { label: "Cerrado", variant: "outline", className: "bg-muted text-muted-foreground" },
};

export default function ProyectosPage() {
  const router = useRouter();
  const { data, mutate, isLoading } = useSWR("/api/proyectos", fetcher);

  const projects = data?.projects || [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Proyectos"
        description="Obras activas, pendientes y cerradas"
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/dashboard/proyectos/configuracion")}>
            <Settings2 className="mr-2 h-4 w-4" />
            Configuración
          </Button>
          <Button onClick={() => router.push("/dashboard/proyectos/nuevo")}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Proyecto
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg border border-border bg-muted"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              No hay proyectos registrados
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/proyectos/nuevo")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear primer proyecto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map(
            (p: {
              id: number;
              nombre: string;
              numero_contrato: string;
              client_name: string;
              estado: string;
              presupuesto_total: number;
              importe_reservado: number;
              saldo_caja: number;
              total_gastado: number;
            }) => {
              const status = STATUS_CONFIG[p.estado] || STATUS_CONFIG.pendiente;
              return (
                <Link key={p.id} href={`/dashboard/proyectos/${p.id}`}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                          p.estado === "activo"
                            ? "bg-accent/10 text-accent"
                            : p.estado === "cerrado"
                              ? "bg-muted text-muted-foreground"
                              : "bg-chart-4/10 text-chart-4"
                        }`}
                      >
                        <FolderKanban className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">
                            {p.nombre}
                          </h3>
                          <Badge
                            variant={status.variant}
                            className={status.className}
                          >
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {p.client_name} &middot; {p.numero_contrato}
                        </p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="text-xs text-muted-foreground">
                          Reservado
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(Number(p.importe_reservado))}
                        </p>
                      </div>
                      <div className="hidden text-right md:block">
                        <p className="text-xs text-muted-foreground">
                          Saldo Caja
                        </p>
                        <p
                          className={`text-sm font-semibold ${Number(p.saldo_caja) >= 0 ? "text-foreground" : "text-destructive"}`}
                        >
                          {formatCurrency(Number(p.saldo_caja))}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
