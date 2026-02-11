"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  Settings2,
  Plus,
  Trash2,
  Save,
  Loader2,
  ArrowLeft,
  Receipt,
  Truck,
  CreditCard,
  Tags,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CONFIG_SECTIONS = [
  {
    key: "gastos_comunes",
    title: "Gastos Comunes",
    description: "Categorías rápidas de gastos comunes de obra (transporte, comida, etc.)",
    icon: Truck,
    placeholder: "Ej: Transporte de personal",
  },
  {
    key: "categorias_egreso",
    title: "Categorías de Egresos",
    description: "Categorías para clasificar los egresos de obra",
    icon: Tags,
    placeholder: "Ej: Materiales",
  },
  {
    key: "cuota_conceptos",
    title: "Conceptos de Cobro",
    description: "Conceptos disponibles al cobrar cuotas a clientes",
    icon: Receipt,
    placeholder: "Ej: Cuota mensual",
  },
  {
    key: "medios_pago",
    title: "Medios de Pago",
    description: "Medios de pago disponibles en todo el sistema",
    icon: CreditCard,
    placeholder: "Ej: banco",
  },
];

const MEDIOS_PAGO_LABELS: Record<string, string> = {
  banco: "Banco",
  mercado_pago: "Mercado Pago",
  efectivo_pesos: "Efectivo $",
  efectivo_usd: "Efectivo USD",
  cheque: "Cheque",
};

export default function ProyectosConfigPage() {
  const { data, mutate } = useSWR("/api/proyectos/config", fetcher);
  const [config, setConfig] = useState<Record<string, string[]>>({});
  const [newItems, setNewItems] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (data?.config) {
      const parsed: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(data.config)) {
        if (Array.isArray(value)) {
          parsed[key] = value;
        } else if (typeof value === "string") {
          try {
            parsed[key] = JSON.parse(value);
          } catch {
            parsed[key] = [];
          }
        } else {
          parsed[key] = [];
        }
      }
      setConfig(parsed);
    }
  }, [data]);

  function addItem(sectionKey: string) {
    const value = newItems[sectionKey]?.trim();
    if (!value) return;
    const current = config[sectionKey] || [];
    if (current.includes(value)) {
      toast.error("Ese item ya existe");
      return;
    }
    setConfig({ ...config, [sectionKey]: [...current, value] });
    setNewItems({ ...newItems, [sectionKey]: "" });
    setHasChanges(true);
  }

  function removeItem(sectionKey: string, idx: number) {
    const current = config[sectionKey] || [];
    setConfig({ ...config, [sectionKey]: current.filter((_, i) => i !== idx) });
    setHasChanges(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/proyectos/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error();
      toast.success("Configuración guardada");
      setHasChanges(false);
      mutate();
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Link
          href="/dashboard/proyectos"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Proyectos
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Settings2 className="h-6 w-6" />
              Configuración de Proyectos
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Personaliza las categorías, conceptos y opciones disponibles en todos tus proyectos
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar cambios
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {CONFIG_SECTIONS.map((section) => {
          const items = config[section.key] || [];
          const Icon = section.icon;

          return (
            <Card key={section.key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-4 w-4" />
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Items list */}
                <div className="flex flex-wrap gap-2">
                  {items.map((item, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="gap-1 pl-3 pr-1 py-1.5 text-sm"
                    >
                      {section.key === "medios_pago"
                        ? MEDIOS_PAGO_LABELS[item] || item
                        : item}
                      <button
                        type="button"
                        className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                        onClick={() => removeItem(section.key, idx)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {items.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No hay items configurados
                    </p>
                  )}
                </div>

                {/* Add new */}
                <div className="flex gap-2">
                  <Input
                    value={newItems[section.key] || ""}
                    onChange={(e) =>
                      setNewItems({ ...newItems, [section.key]: e.target.value })
                    }
                    placeholder={section.placeholder}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addItem(section.key);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => addItem(section.key)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
