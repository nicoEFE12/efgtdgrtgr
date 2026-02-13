"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import useSWR from "swr";
import {
  Save,
  Building2,
  Percent,
  DollarSign,
  Mail,
  Trash2,
  Plus,
  Shield,
  Loader2,
  Calculator,
  CalendarDays,
  Landmark,
  TrendingUp,
  Info,
  ArrowRight,
  RefreshCw,
  Timer,
  TrendingDown,
  Package,
  Edit,
  Tag,
} from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function ConfiguracionPage() {
  const { data: settings, mutate } = useSWR("/api/settings", fetcher);
  const [mounted, setMounted] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [defaultMargin, setDefaultMargin] = useState("");
  const [dollarRate, setDollarRate] = useState("1000");
  const [costoFijoMensual, setCostoFijoMensual] = useState("");
  const [diasLaborables, setDiasLaborables] = useState("");
  const [cargasSociales, setCargasSociales] = useState("");
  const [saving, setSaving] = useState(false);
  const [dollarType, setDollarType] = useState("blue");
  const [fetchingDollar, setFetchingDollar] = useState(false);
  const [dollarLastUpdate, setDollarLastUpdate] = useState<string | null>(null);
  const initialFetchDone = useRef(false);

  // Mark component as mounted to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (settings) {
      const s = (settings.settings || settings) as Record<string, string>;
      setCompanyName(s.company_name || "Am Soluciones Constructivas");
      setDefaultMargin(s.default_margin_percent || "15");
      const rate = s.dollar_rate?.trim();
      if (rate && rate !== "" && rate !== "0") {
        setDollarRate(rate);
      } else {
        setDollarRate("1000");
      }
      setCostoFijoMensual(s.costo_fijo_mensual || "0");
      setDiasLaborables(s.dias_laborables_mes || "22");
      setCargasSociales(s.porcentaje_cargas_sociales || "0");
      
      // Set dollar type after other settings to avoid triggering fetch
      const savedDollarType = s.dollar_type || "blue";
      if (savedDollarType !== dollarType) {
        setDollarType(savedDollarType);
      }
    }
  }, [settings]);

  // Live preview calculations
  const preview = useMemo(() => {
    const costoMensual = Number(costoFijoMensual) || 0;
    const dias = Number(diasLaborables) || 22;
    const margen = Number(defaultMargin) || 0;
    const cargas = Number(cargasSociales) || 0;

    const costoDiario = dias > 0 ? costoMensual / dias : 0;

    // Example: 10m² job with 2 days of work, $5000 materials, $3000/day labor
    const ejemploM2 = 10;
    const ejemploDias = 2;
    const ejemploMateriales = 5000;
    const ejemploMODia = 3000;
    const ejemploMO = ejemploDias * ejemploMODia * (1 + cargas / 100);
    const ejemploFijos = costoDiario * ejemploDias;
    const ejemploSubtotal = ejemploMateriales + ejemploMO + ejemploFijos;
    const ejemploMargen = ejemploSubtotal * (margen / 100);
    const ejemploTotal = ejemploSubtotal + ejemploMargen;

    return {
      costoDiario,
      ejemplo: {
        m2: ejemploM2,
        dias: ejemploDias,
        materiales: ejemploMateriales,
        manoObra: ejemploMO,
        fijos: ejemploFijos,
        subtotal: ejemploSubtotal,
        margen: ejemploMargen,
        total: ejemploTotal,
      },
    };
  }, [costoFijoMensual, diasLaborables, defaultMargin, cargasSociales]);

  const fetchDollarRate = useCallback(async () => {
    console.log('fetchDollarRate called manually');
    setFetchingDollar(true);
    try {
      const res = await fetch(`https://dolarapi.com/v1/dolares/${dollarType}`);
      if (!res.ok) throw new Error("Error al consultar API");
      
      const data = await res.json();
      const venta = data.venta || data.compra;
      
      if (venta) {
        console.log('Updating dollar rate from API:', venta);
        setDollarRate(venta.toString());
        const fechaActualizacion = data.fechaActualizacion 
          ? new Date(data.fechaActualizacion).toLocaleString("es-AR", {
              dateStyle: "short",
              timeStyle: "short",
            })
          : new Date().toLocaleString("es-AR", {
              dateStyle: "short",
              timeStyle: "short",
            });
        setDollarLastUpdate(fechaActualizacion);
        toast.success(`Tipo de cambio actualizado: $${venta}`);
        
        // Auto-save the new rate immediately
        try {
          const saveRes = await fetch("/api/settings", {
            method: "PUT", 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              company_name: companyName,
              default_margin_percent: defaultMargin,
              dollar_rate: venta.toString(),
              dollar_type: dollarType,
              costo_fijo_mensual: costoFijoMensual,
              dias_laborables_mes: diasLaborables,
              porcentaje_cargas_sociales: cargasSociales,
            }),
          });
          if (saveRes.ok) {
            toast.success("Tipo de cambio guardado automáticamente");
            mutate(); // Refresh settings
          }
        } catch (saveError) {
          toast.error("Tipo actualizado pero no guardado - usa 'Actualizar configuración'");
        }
      } else {
        toast.error("No se pudo obtener el precio");
      }
    } catch (error) {
      toast.error("Error al consultar la API de dólar");
      console.error(error);
    } finally {
      setFetchingDollar(false);
    }
  }, [dollarType, companyName, defaultMargin, costoFijoMensual, diasLaborables, cargasSociales, mutate]);

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
          dollar_type: dollarType,
          costo_fijo_mensual: costoFijoMensual,
          dias_laborables_mes: diasLaborables,
          porcentaje_cargas_sociales: cargasSociales,
        }),
      });
      if (res.ok) {
        toast.success("Configuración guardada correctamente");
        mutate();
      } else {
        toast.error("Error al guardar la configuración");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <PageHeader
          title="Configuración"
          description="Parámetros globales que alimentan al cotizador y otros módulos del sistema"
        />

        {/* ── Section: Empresa ──────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Datos de la Empresa
            </CardTitle>
            <CardDescription>
              Información que aparece en cotizaciones, facturas y documentos generados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label>Nombre de la Empresa</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Mi Empresa S.A."
                />
              </div>
              
              {/* Dollar Rate Section */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Tipo de Cambio USD
                </Label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Tipo de dólar</Label>
                    {mounted ? (
                      <Select value={dollarType} onValueChange={setDollarType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oficial">
                            <div className="flex items-center gap-2">
                              <Landmark className="h-3 w-3" />
                              Oficial
                            </div>
                          </SelectItem>
                          <SelectItem value="blue">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-3 w-3" />
                              Blue
                            </div>
                          </SelectItem>
                          <SelectItem value="tarjeta">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-3 w-3" />
                              Tarjeta
                            </div>
                          </SelectItem>
                          <SelectItem value="bolsa">
                            <div className="flex items-center gap-2">
                              <TrendingDown className="h-3 w-3" />
                              MEP / Bolsa
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex h-10 items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                        Cargando...
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Valor actual (ARS)</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={dollarRate}
                          onChange={(e) => setDollarRate(e.target.value)}
                          placeholder="1200"
                          className="pl-7"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchDollarRate}
                        disabled={fetchingDollar}
                        title="Actualizar desde dolarapi.com"
                      >
                        {fetchingDollar ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Info bar */}
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Info className="h-3.5 w-3.5 shrink-0" />
                      <span>Conversión de precios en dólares a pesos argentinos</span>
                    </div>
                    {dollarLastUpdate && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Timer className="h-3 w-3 text-green-600" />
                        <span className="text-muted-foreground">Actualizado:</span>
                        <span className="font-medium text-green-600">{dollarLastUpdate}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                      <TrendingUp className="h-2.5 w-2.5 mr-1" />
                      Fuente: dolarapi.com
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      Dólar {dollarType === "oficial" ? "Oficial" : dollarType === "blue" ? "Blue" : dollarType === "tarjeta" ? "Tarjeta" : "MEP"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section: Costos Fijos ────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-blue-200 dark:border-blue-900">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Landmark className="h-5 w-5 text-blue-600" />
                      Costos Fijos de la Empresa
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Se prorratean proporcionalmente en cada cotización según los días estimados de trabajo
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950 shrink-0">
                    <Calculator className="h-3 w-3 mr-1" />
                    Alimenta al Cotizador
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 font-medium">
                      Costo Fijo Mensual
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[280px]">
                          <p>Suma de todos los gastos fijos mensuales: alquiler, servicios, sueldos administrativos, seguros, etc.</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={costoFijoMensual}
                        onChange={(e) => setCostoFijoMensual(e.target.value)}
                        min={0}
                        className="pl-7"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Alquiler + servicios + sueldos fijos + seguros
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 font-medium">
                      Días Laborables por Mes
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[280px]">
                          <p>Cantidad promedio de días hábiles que se trabaja al mes. Se usa para dividir el costo fijo mensual en un costo diario.</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        type="number"
                        value={diasLaborables}
                        onChange={(e) => setDiasLaborables(e.target.value)}
                        min={1}
                        max={31}
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Generalmente entre 20 y 22 días
                    </p>
                  </div>
                </div>

                {/* Daily cost result */}
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Costo Fijo Diario (calculado)</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        = Costo Mensual ÷ Días Laborables
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold tabular-nums">
                        {formatCurrency(preview.costoDiario)}
                      </p>
                      <p className="text-xs text-muted-foreground">por día de obra</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Section: Margen y Cargas ────────────────── */}
            <Card className="border-green-200 dark:border-green-900">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Margen de Ganancia y Cargas
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Margen deseado sobre el costo total y cargas sociales sobre mano de obra
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950 shrink-0">
                    <Calculator className="h-3 w-3 mr-1" />
                    Alimenta al Cotizador
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 font-medium">
                      Margen de Ganancia / Ahorro
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[280px]">
                          <p>Porcentaje de ganancia o ahorro que se agrega sobre el costo base (materiales + mano de obra + costos fijos) en cada cotización.</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        type="number"
                        step="0.1"
                        value={defaultMargin}
                        onChange={(e) => setDefaultMargin(e.target.value)}
                        min={0}
                        max={100}
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Se aplica sobre el subtotal de cada cotización
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 font-medium">
                      Cargas Sociales
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[280px]">
                          <p>Porcentaje adicional sobre el costo de mano de obra para cubrir aportes patronales, ART, etc.</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        type="number"
                        step="0.1"
                        value={cargasSociales}
                        onChange={(e) => setCargasSociales(e.target.value)}
                        min={0}
                        max={100}
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Aportes patronales, ART, etc.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Preview Panel ──────────────────────────── */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4 border-amber-200 dark:border-amber-900">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calculator className="h-5 w-5 text-amber-600" />
                  Vista Previa del Cotizador
                </CardTitle>
                <CardDescription>
                  Ejemplo simulado: trabajo de {preview.ejemplo.m2}m² · {preview.ejemplo.dias} días
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Materiales</span>
                    <span className="font-medium tabular-nums">{formatCurrency(preview.ejemplo.materiales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      Mano de Obra
                      {Number(cargasSociales) > 0 && (
                        <span className="text-[10px] text-orange-600">(+{cargasSociales}% cargas)</span>
                      )}
                    </span>
                    <span className="font-medium tabular-nums">{formatCurrency(preview.ejemplo.manoObra)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      Costos Fijos
                      <span className="text-[10px] text-blue-600">
                        ({preview.ejemplo.dias}d × {formatCurrency(preview.costoDiario)})
                      </span>
                    </span>
                    <span className="font-medium tabular-nums">{formatCurrency(preview.ejemplo.fijos)}</span>
                  </div>

                  <Separator />

                  <div className="flex justify-between font-medium">
                    <span>Subtotal (costo)</span>
                    <span className="tabular-nums">{formatCurrency(preview.ejemplo.subtotal)}</span>
                  </div>

                  {Number(defaultMargin) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Margen ({defaultMargin}%)
                      </span>
                      <span className="font-medium tabular-nums">+{formatCurrency(preview.ejemplo.margen)}</span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between text-base font-bold">
                    <span>Total al Cliente</span>
                    <span className="tabular-nums text-blue-600">{formatCurrency(preview.ejemplo.total)}</span>
                  </div>
                </div>

                {/* Flow diagram */}
                <div className="mt-4 rounded-lg bg-muted/50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cómo se calcula</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="rounded bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 font-medium text-blue-700 dark:text-blue-300">Costo Mensual</span>
                    <span>÷</span>
                    <span className="rounded bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 font-medium text-blue-700 dark:text-blue-300">Días Lab.</span>
                    <span>=</span>
                    <span className="rounded bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 font-medium text-amber-700 dark:text-amber-300">$/día</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="rounded bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 font-medium text-amber-700 dark:text-amber-300">$/día</span>
                    <span>×</span>
                    <span className="text-foreground font-medium">días obra</span>
                    <span>=</span>
                    <span className="rounded bg-purple-100 dark:bg-purple-900 px-1.5 py-0.5 font-medium text-purple-700 dark:text-purple-300">Fijos en cotiz.</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                    <span className="text-foreground font-medium">(Mat + MO + Fijos)</span>
                    <span>×</span>
                    <span className="rounded bg-green-100 dark:bg-green-900 px-1.5 py-0.5 font-medium text-green-700 dark:text-green-300">1 + Margen%</span>
                    <span>=</span>
                    <span className="rounded bg-blue-600 px-1.5 py-0.5 font-bold text-white">Precio Final</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Save Button ──────────────────────────────── */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg" className="min-w-[200px]">
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? "Guardando..." : "Guardar Configuración"}
          </Button>
        </div>

        {/* Allowed Emails Management */}
        <AllowedEmailsSection mounted={mounted} />

        {/* Providers Management */}
        <ProvidersManagementSection />

        {/* Categories Management */}
        <CategoriesManagementSection />
      </div>
    </TooltipProvider>
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

function AllowedEmailsSection({ mounted }: { mounted: boolean }) {
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
          {mounted ? (
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
          ) : (
            <select
              className="w-[120px] px-3 py-2 rounded-md border border-input bg-background text-sm"
              style={{ height: "40px" }}
            >
              <option>Cargando...</option>
            </select>
          )}
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

/* ────────────────────────────────────────────────── */
/* Providers Management Section                       */
/* ────────────────────────────────────────────────── */

function ProvidersManagementSection() {
  const { data: materialsData, mutate } = useSWR("/api/materiales", (url: string) =>
    fetch(url).then((r) => r.json())
  );
  const materials = materialsData?.materials || [];
  const providers = [...new Set(materials.map((m: any) => m.proveedor).filter(Boolean))] as string[];

  const [newProvider, setNewProvider] = useState("");
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [adding, setAdding] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleAdd() {
    if (!newProvider.trim()) {
      toast.error("Ingresa un nombre de proveedor");
      return;
    }
    if (providers.includes(newProvider.trim())) {
      toast.error("Este proveedor ya existe");
      return;
    }
    setAdding(true);
    try {
      // Create a marker material with this provider
      const res = await fetch("/api/materiales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: `[Referencias] ${newProvider.trim()}`,
          precio_unitario: 0,
          unidad: "un",
          proveedor: newProvider.trim(),
          categoria: null,
          codigo_referencia: null,
        }),
      });
      if (res.ok) {
        toast.success(`Proveedor "${newProvider}" agregado`);
        setNewProvider("");
        mutate();
      } else {
        toast.error("Error al crear proveedor");
      }
    } catch {
      toast.error("Error al agregar proveedor");
    } finally {
      setAdding(false);
    }
  }

  async function handleUpdate() {
    if (!editingProvider || !editName.trim()) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/materiales", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rename_provider",
          old_name: editingProvider,
          new_name: editName.trim(),
        }),
      });
      if (res.ok) {
        toast.success("Proveedor actualizado en todos los materiales");
        mutate();
        setEditingProvider(null);
        setEditName("");
      } else {
        toast.error("Error al actualizar proveedor");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete(providerName: string) {
    setDeleting(providerName);
    try {
      const res = await fetch("/api/materiales", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove_provider",
          provider_name: providerName,
        }),
      });
      if (res.ok) {
        toast.success("Proveedor eliminado de todos los materiales");
        mutate();
      } else {
        toast.error("Error al eliminar proveedor");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Proveedores
        </CardTitle>
        <CardDescription>
          Gestiona los proveedores de materiales
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new provider */}
        <div className="flex gap-2">
          <Input
            placeholder="Nuevo proveedor"
            value={newProvider}
            onChange={(e) => setNewProvider(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} disabled={adding} size="sm" className="h-10">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        <Separator />

        {/* List */}
        {providers.length > 0 ? (
          <div className="space-y-2">
            {providers.map((provider) => (
              <div
                key={provider}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                {editingProvider === provider ? (
                  <div className="flex gap-2 flex-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdate();
                        if (e.key === "Escape") {
                          setEditingProvider(null);
                          setEditName("");
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUpdate}
                      disabled={updating}
                    >
                      {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingProvider(null);
                        setEditName("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{provider}</span>
                      <Badge variant="outline" className="text-xs">
                        {materials.filter((m: any) => m.proveedor === provider).length} materiales
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingProvider(provider);
                          setEditName(provider);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(provider)}
                        disabled={deleting === provider}
                      >
                        {deleting === provider ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay proveedores registrados
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ────────────────────────────────────────────────── */
/* Categories Management Section                      */
/* ────────────────────────────────────────────────── */

function CategoriesManagementSection() {
  const { data: materialsData, mutate } = useSWR("/api/materiales", (url: string) =>
    fetch(url).then((r) => r.json())
  );
  const materials = materialsData?.materials || [];
  const categories = [...new Set(materials.map((m: any) => m.categoria).filter(Boolean))] as string[];

  const [newCategory, setNewCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [adding, setAdding] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleAdd() {
    if (!newCategory.trim()) {
      toast.error("Ingresa un nombre de categoría");
      return;
    }
    if (categories.includes(newCategory.trim())) {
      toast.error("Esta categoría ya existe");
      return;
    }
    setAdding(true);
    try {
      // Create a marker material with this category
      const res = await fetch("/api/materiales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: `[Referencias] ${newCategory.trim()}`,
          precio_unitario: 0,
          unidad: "un",
          proveedor: null,
          categoria: newCategory.trim(),
          codigo_referencia: null,
        }),
      });
      if (res.ok) {
        toast.success(`Categoría "${newCategory}" agregada`);
        setNewCategory("");
        mutate();
      } else {
        toast.error("Error al crear categoría");
      }
    } catch {
      toast.error("Error al agregar categoría");
    } finally {
      setAdding(false);
    }
  }

  async function handleUpdate() {
    if (!editingCategory || !editName.trim()) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/materiales", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rename_category",
          old_name: editingCategory,
          new_name: editName.trim(),
        }),
      });
      if (res.ok) {
        toast.success("Categoría actualizada en todos los materiales");
        mutate();
        setEditingCategory(null);
        setEditName("");
      } else {
        toast.error("Error al actualizar categoría");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete(categoryName: string) {
    setDeleting(categoryName);
    try {
      const res = await fetch("/api/materiales", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove_category",
          category_name: categoryName,
        }),
      });
      if (res.ok) {
        toast.success("Categoría eliminada de todos los materiales");
        mutate();
      } else {
        toast.error("Error al eliminar categoría");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Categorías
        </CardTitle>
        <CardDescription>
          Gestiona las categorías de materiales
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new category */}
        <div className="flex gap-2">
          <Input
            placeholder="Nueva categoría"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} disabled={adding} size="sm" className="h-10">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        <Separator />

        {/* List */}
        {categories.length > 0 ? (
          <div className="space-y-2">
            {categories.map((category) => (
              <div
                key={category}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                {editingCategory === category ? (
                  <div className="flex gap-2 flex-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdate();
                        if (e.key === "Escape") {
                          setEditingCategory(null);
                          setEditName("");
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUpdate}
                      disabled={updating}
                    >
                      {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingCategory(null);
                        setEditName("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{category}</span>
                      <Badge variant="outline" className="text-xs">
                        {materials.filter((m: any) => m.categoria === category).length} materiales
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingCategory(category);
                          setEditName(category);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(category)}
                        disabled={deleting === category}
                      >
                        {deleting === category ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay categorías registradas
          </p>
        )}
      </CardContent>
    </Card>
  );
}
