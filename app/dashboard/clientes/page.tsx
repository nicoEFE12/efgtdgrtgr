"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Search, UserCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClientForm } from "@/components/clientes/client-form";
import { ClientDetail } from "@/components/clientes/client-detail";
import { PageHeader } from "@/components/dashboard/page-header";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Client {
  id: number;
  apellido_nombre: string;
  numero_contrato: string;
  dni: string;
  domicilio_legal: string;
  domicilio_obra: string;
  telefono: string | null;
  email: string | null;
  denominacion: string | null;
  estado: string;
  fecha_alta: string;
  plan_pago: string | null;
  observaciones: string | null;
  presupuesto_observacion: string | null;
  tiempo_obra_estimado: string | null;
  agenda_inicio: string | null;
  agenda_cierre: string | null;
}

export default function ClientesPage() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const { data, mutate, isLoading } = useSWR(
    `/api/clientes?search=${search}`,
    fetcher
  );

  const clients: Client[] = data?.clients || [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clientes"
        description="Gestión de clientes y fichas"
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Alta Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Alta de Cliente</DialogTitle>
            </DialogHeader>
            <ClientForm
              onSuccess={() => {
                setCreateOpen(false);
                mutate();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, contrato o DNI..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Client list */}
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="mt-3 h-3 w-1/2 rounded bg-muted" />
                <div className="mt-2 h-3 w-1/3 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <UserCircle className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {search
                ? "No se encontraron clientes"
                : "No hay clientes registrados"}
            </p>
            {!search && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Registrar primer cliente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card
              key={client.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setSelectedClient(client)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      {client.apellido_nombre}
                    </h3>
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      <span>{client.numero_contrato}</span>
                    </div>
                    {client.denominacion && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {client.denominacion}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      client.estado === "activo" ? "default" : "secondary"
                    }
                    className={
                      client.estado === "activo"
                        ? "bg-accent text-accent-foreground"
                        : ""
                    }
                  >
                    {client.estado}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>DNI: {client.dni}</span>
                  {client.telefono && <span>{client.telefono}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Client Detail Dialog */}
      <Dialog
        open={!!selectedClient}
        onOpenChange={(open) => !open && setSelectedClient(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Ficha del Cliente</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <ClientDetail
              client={selectedClient}
              onUpdate={() => {
                mutate();
                setSelectedClient(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
