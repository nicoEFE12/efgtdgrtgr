"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Save, Building2, Percent, DollarSign, Mail, Trash2, Plus, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ConfiguracionPage() {
  const { data: settings, mutate } = useSWR("/api/settings", fetcher);
  const [companyName, setCompanyName] = useState("");
  const [defaultMargin, setDefaultMargin] = useState("");
  const [dollarRate, setDollarRate] = useState("");
  const [costoFijoMensual, setCostoFijoMensual] = useState("");
  const [diasLaborables, setDiasLaborables] = useState("");
  const [cargasSociales, setCargasSociales] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      const s = (settings.settings || settings) as Record<string, string>;
      setCompanyName(s.company_name || "Am Soluciones Constructivas");
      setDefaultMargin(s.default_margin_percent || "15");
      setDollarRate(s.dollar_rate || "1");
      setCostoFijoMensual(s.costo_fijo_mensual || "0");
      setDiasLaborables(s.dias_laborables_mes || "22");
      setCargasSociales(s.porcentaje_cargas_sociales || "0");
    }
  }, [settings]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          default_margin_percent: defaultMargin,
          dollar_rate: dollarRate,
          costo_fijo_mensual: costoFijoMensual,
          dias_laborables_mes: diasLaborables,
          porcentaje_cargas_sociales: cargasSociales,
        }),
      });
      if (res.ok) {
        toast.success("Configuracion guardada");
        mutate();
      } else {
        toast.error("Error al guardar");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Ajustes generales del sistema"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Datos de la Empresa
            </CardTitle>
            <CardDescription>
              Informacion que aparece en cotizaciones y documentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de la Empresa</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Parametros Financieros
            </CardTitle>
            <CardDescription>
              Valores por defecto para calculos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Margen de Ganancia por Defecto (%)</Label>
              <Input
                type="number"
                value={defaultMargin}
                onChange={(e) => setDefaultMargin(e.target.value)}
                min={0}
                max={100}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Tipo de Cambio USD
              </Label>
              <Input
                type="number"
                step="0.01"
                value={dollarRate}
                onChange={(e) => setDollarRate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Usado para conversion de precios en dolares
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Costo Fijo Mensual ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={costoFijoMensual}
                onChange={(e) => setCostoFijoMensual(e.target.value)}
                min={0}
              />
              <p className="text-xs text-muted-foreground">
                Costos fijos mensuales de la empresa (alquiler, servicios,
                sueldos fijos)
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Dias Laborables por Mes</Label>
              <Input
                type="number"
                value={diasLaborables}
                onChange={(e) => setDiasLaborables(e.target.value)}
                min={1}
                max={31}
              />
              <p className="text-xs text-muted-foreground">
                Cantidad de dias laborables promedio por mes
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Cargas Sociales (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={cargasSociales}
                onChange={(e) => setCargasSociales(e.target.value)}
                min={0}
                max={100}
              />
              <p className="text-xs text-muted-foreground">
                Porcentaje de cargas sociales aplicado sobre mano de obra
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Guardando..." : "Guardar Configuracion"}
        </Button>
      </div>

      {/* Allowed Emails Management */}
      <AllowedEmailsSection />
    </div>
  );
}

/* ────────────────────────────────────────────────── */
/* Allowed Emails Section                             */
/* ────────────────────────────────────────────────── */

interface AllowedEmail {
  id: number;
  email: string;
  role: string;
  created_at: string;
}

function AllowedEmailsSection() {
  const { data: emails, mutate, isLoading } = useSWR<AllowedEmail[]>(
    "/api/auth/allowed-emails",
    (url: string) => fetch(url).then((r) => {
      if (!r.ok) throw new Error("No autorizado");
      return r.json();
    }),
    { shouldRetryOnError: false }
  );
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // If the user is not admin, this will fail silently
  if (!emails && !isLoading) return null;

  async function handleAdd() {
    if (!newEmail.includes("@")) {
      toast.error("Email inválido");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/auth/allowed-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al agregar email");
        return;
      }
      toast.success("Email agregado");
      setNewEmail("");
      setNewRole("user");
      mutate();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      const res = await fetch("/api/auth/allowed-emails", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al eliminar");
        return;
      }
      toast.success("Email eliminado");
      mutate();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDeletingId(null);
    }
  }

  const roleColors: Record<string, string> = {
    admin: "bg-red-500/10 text-red-700 border-red-200",
    user: "bg-blue-500/10 text-blue-700 border-blue-200",
    viewer: "bg-gray-500/10 text-gray-700 border-gray-200",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Emails Autorizados
        </CardTitle>
        <CardDescription>
          Solo los emails en esta lista pueden registrarse en el sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new email */}
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="nuevo@email.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">Usuario</SelectItem>
              <SelectItem value="viewer">Visor</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} disabled={adding} size="sm" className="h-10">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        <Separator />

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : emails && emails.length > 0 ? (
          <div className="space-y-2">
            {emails.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{item.email}</span>
                  <Badge variant="outline" className={roleColors[item.role] || ""}>
                    {item.role}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                >
                  {deletingId === item.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay emails autorizados
          </p>
        )}
      </CardContent>
    </Card>
  );
}
