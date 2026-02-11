"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { useConfirm } from "@/hooks/use-confirm";
import {
  ArrowLeft,
  Save,
  Loader2,
  Wand2,
  Package,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Calculator,
} from "lucide-react";
import Link from "next/link";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatMoney(n: number) {
  return Math.round(n).toLocaleString("es-AR");
}

const UNIDADES: Record<string, string> = {
  m2: "m²",
  ml: "ml",
  m3: "m³",
  un: "Unidad",
  kg: "Kg",
  global: "Global",
};

type RubroMaterial = {
  material_id: number | null;
  nombre: string;
  cantidad: number;
  unidad: string;
  precio_unitario: number;
  total: number;
};

type Rubro = {
  quotation_item_id: number | null;
  descripcion: string;
  service_type_id: number | null;
  service_name: string | null;
  m2: number | null;
  unidad: string | null;
  dias_estimados: number | null;
  costo_materiales: number;
  costo_mano_obra: number;
  costo_fijos_prorrateados: number;
  subtotal: number;
  materiales: RubroMaterial[];
};

export default function NuevoProyectoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cotizacionId = searchParams.get("cotizacion_id");
  const { confirm, ConfirmDialog } = useConfirm();
  const { data: clientsData } = useSWR("/api/clientes", fetcher);
  const { data: materialsData } = useSWR("/api/materiales", fetcher);
  const { data: serviceTypesData } = useSWR("/api/service-types", fetcher);
  const clientsList = clientsData?.clients || [];
  const materialsList = materialsData?.materials || [];
  const serviceTypes = serviceTypesData?.serviceTypes || [];

  const [clientId, setClientId] = useState("");
  const [nombre, setNombre] = useState("");
  const [contrato, setContrato] = useState("");
  const [presupuesto, setPresupuesto] = useState("");
  const [reservado, setReservado] = useState("");
  const [estado, setEstado] = useState("activo");
  const [fechaInicio, setFechaInicio] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [fechaCierre, setFechaCierre] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [expandedRubros, setExpandedRubros] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingQuotation, setLoadingQuotation] = useState(false);
  const [quotationLoaded, setQuotationLoaded] = useState(false);

  // Load quotation data if cotizacion_id is provided
  useEffect(() => {
    if (cotizacionId && !quotationLoaded) {
      setLoadingQuotation(true);
      fetch(`/api/cotizaciones/${cotizacionId}`)
        .then((r) => r.json())
        .then((data) => {
          const q = data.quotation;
          if (q) {
            setNombre(q.nombre);
            setClientId(q.client_id?.toString() || "");
            setPresupuesto(String(Math.round(Number(q.total))));
            setObservaciones(q.notas || "");

            // Build rubros from quotation items
            const rubrosList: Rubro[] = (q.items || []).map((item: any) => ({
              quotation_item_id: item.id,
              descripcion: item.descripcion,
              service_type_id: item.service_type_id,
              service_name: item.service_name || null,
              m2: item.m2 ? Number(item.m2) : null,
              unidad: item.unidad || "m2",
              dias_estimados: item.dias_estimados
                ? Number(item.dias_estimados)
                : null,
              costo_materiales: Number(item.costo_materiales),
              costo_mano_obra: Number(item.costo_mano_obra),
              costo_fijos_prorrateados: Number(item.costo_fijos_prorrateados),
              subtotal: Number(item.subtotal),
              materiales: [], // Will be populated from service type data if available
            }));

            setRubros(rubrosList);
            setQuotationLoaded(true);

            // Now fetch material details for each rubro from service types
            loadRubroMaterials(rubrosList);
          }
        })
        .catch(() => toast.error("Error al cargar cotización"))
        .finally(() => setLoadingQuotation(false));
    }
  }, [cotizacionId, quotationLoaded]);

  async function loadRubroMaterials(rubrosList: Rubro[]) {
    // For rubros with service_type_id, fetch the service type to get material details
    const serviceTypeIds = [
      ...new Set(
        rubrosList
          .filter((r) => r.service_type_id)
          .map((r) => r.service_type_id)
      ),
    ];

    if (serviceTypeIds.length === 0) return;

    try {
      const res = await fetch("/api/service-types");
      const data = await res.json();
      const serviceTypes = data.serviceTypes || [];

      const updatedRubros = rubrosList.map((rubro) => {
        if (!rubro.service_type_id || !rubro.m2) return rubro;
        const st = serviceTypes.find(
          (s: any) => s.id === rubro.service_type_id
        );
        if (!st || !st.materiales) return rubro;

        const materiales: RubroMaterial[] = st.materiales.map((stm: any) => {
          const cantidadRaw = Number(stm.cantidad_por_m2) * Number(rubro.m2);
          const precioUnit = Number(stm.material_precio);
          const totalMat = cantidadRaw * precioUnit;
          const unidadLower = stm.material_unidad.toLowerCase();
          const isDiscrete =
            unidadLower === "un" ||
            unidadLower === "unidad" ||
            unidadLower === "bolsa" ||
            unidadLower === "balde";
          const cantidad = isDiscrete
            ? Math.ceil(cantidadRaw)
            : Math.ceil(cantidadRaw * 10) / 10;

          return {
            material_id: stm.material_id,
            nombre: stm.material_nombre,
            cantidad,
            unidad: stm.material_unidad,
            precio_unitario: precioUnit,
            total: totalMat,
          };
        });

        return { ...rubro, materiales };
      });

      setRubros(updatedRubros);
    } catch {
      // Silently fail, rubros will just not have material details
    }
  }

  function toggleRubro(idx: number) {
    setExpandedRubros((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function addNewRubro() {
    const newRubro: Rubro = {
      quotation_item_id: null,
      descripcion: "",
      service_type_id: null,
      service_name: null,
      m2: null,
      unidad: "m2",
      dias_estimados: null,
      costo_materiales: 0,
      costo_mano_obra: 0,
      costo_fijos_prorrateados: 0,
      subtotal: 0,
      materiales: [],
    };
    setRubros([...rubros, newRubro]);
    setExpandedRubros((prev) => new Set([...prev, rubros.length]));
  }

  async function removeRubro(idx: number) {
    const confirmed = await confirm({
      title: "Eliminar rubro",
      description: "¿Está seguro que desea eliminar este rubro? Se perderán todos los materiales asociados.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "destructive"
    });
    if (!confirmed) return;
    setRubros(rubros.filter((_, i) => i !== idx));
    setExpandedRubros((prev) => {
      const next = new Set<number>();
      prev.forEach((v) => {
        if (v < idx) next.add(v);
        else if (v > idx) next.add(v - 1);
      });
      return next;
    });
  }

  function updateRubro(idx: number, field: keyof Rubro, value: any) {
    const newRubros = [...rubros];
    newRubros[idx] = { ...newRubros[idx], [field]: value };
    
    // Recalcular subtotal si es un campo de costo
    if (['costo_materiales', 'costo_mano_obra', 'costo_fijos_prorrateados'].includes(field)) {
      newRubros[idx].subtotal = 
        newRubros[idx].costo_materiales + 
        newRubros[idx].costo_mano_obra + 
        newRubros[idx].costo_fijos_prorrateados;
    }
    
    setRubros(newRubros);
  }

  function addMaterialToRubro(rubroIdx: number) {
    const newRubros = [...rubros];
    const newMaterial: RubroMaterial = {
      material_id: null,
      nombre: "",
      cantidad: 1,
      unidad: "un",
      precio_unitario: 0,
      total: 0,
    };
    newRubros[rubroIdx].materiales.push(newMaterial);
    setRubros(newRubros);
  }

  function removeMaterialFromRubro(rubroIdx: number, materialIdx: number) {
    const newRubros = [...rubros];
    newRubros[rubroIdx].materiales.splice(materialIdx, 1);
    recalcRubroMaterialCost(newRubros[rubroIdx]);
    setRubros(newRubros);
  }

  function updateMaterial(rubroIdx: number, materialIdx: number, field: keyof RubroMaterial, value: any) {
    const newRubros = [...rubros];
    const material = { ...newRubros[rubroIdx].materiales[materialIdx], [field]: value };
    
    // Si se selecciona un material de la lista, autocompletar datos
    if (field === "material_id" && value) {
      const selectedMaterial = materialsList.find((m: any) => m.id === Number(value));
      if (selectedMaterial) {
        material.nombre = selectedMaterial.nombre;
        material.unidad = selectedMaterial.unidad;
        material.precio_unitario = Number(selectedMaterial.precio_unitario);
      }
    }
    
    // Recalcular total del material
    if (field === "cantidad" || field === "precio_unitario") {
      material.total = Number(material.cantidad) * Number(material.precio_unitario);
    }
    
    newRubros[rubroIdx].materiales[materialIdx] = material;
    recalcRubroMaterialCost(newRubros[rubroIdx]);
    setRubros(newRubros);
  }

  function recalcRubroMaterialCost(rubro: Rubro) {
    const totalMateriales = rubro.materiales.reduce((sum, m) => sum + Number(m.total), 0);
    rubro.costo_materiales = Math.round(totalMateriales);
    rubro.subtotal = rubro.costo_materiales + rubro.costo_mano_obra + rubro.costo_fijos_prorrateados;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      toast.error("Selecciona un cliente");
      return;
    }
    if (!nombre) {
      toast.error("Ingresa un nombre para el proyecto");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/proyectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: parseInt(clientId),
          nombre,
          numero_contrato: contrato,
          presupuesto_total: parseFloat(presupuesto) || 0,
          importe_reservado: parseFloat(reservado) || 0,
          estado,
          fecha_inicio: fechaInicio || null,
          fecha_cierre: fechaCierre || null,
          observaciones: observaciones || null,
          quotation_id: cotizacionId ? parseInt(cotizacionId) : null,
          rubros: rubros.map((r) => ({
            quotation_item_id: r.quotation_item_id,
            descripcion: r.descripcion,
            service_type_id: r.service_type_id,
            m2: r.m2,
            unidad: r.unidad,
            dias_estimados: r.dias_estimados,
            costo_materiales: r.costo_materiales,
            costo_mano_obra: r.costo_mano_obra,
            costo_fijos_prorrateados: r.costo_fijos_prorrateados,
            subtotal: r.subtotal,
            materiales: r.materiales,
          })),
        }),
      });

      if (!res.ok) throw new Error("Error al crear el proyecto");

      const data = await res.json();
      toast.success("Proyecto creado correctamente");
      router.push(`/dashboard/proyectos/${data.project.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al crear el proyecto"
      );
    } finally {
      setLoading(false);
    }
  }

  const totalCostoBase = rubros.reduce((s, r) => s + r.subtotal, 0);

  if (loadingQuotation) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex flex-col gap-4">
        <Link
          href="/dashboard/proyectos"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Proyectos
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Nuevo Proyecto
          </h1>
          {cotizacionId && (
            <p className="text-sm text-muted-foreground mt-1">
              Creando proyecto desde cotización #{cotizacionId} — datos
              precargados automáticamente
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* DATOS GENERALES */}
        <Card>
          <CardHeader>
            <CardTitle>Datos Generales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>
                  Cliente <span className="text-destructive">*</span>
                </Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientsList.map(
                      (c: { id: number; apellido_nombre: string }) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.apellido_nombre}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>
                  Nombre del Proyecto{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Casa Fischer - Godoy Cruz"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>N° de Contrato</Label>
                <Input
                  value={contrato}
                  onChange={(e) => setContrato(e.target.value)}
                  placeholder="Ej: CONTR-001"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Estado</Label>
                <Select value={estado} onValueChange={setEstado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="cerrado">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Presupuesto Total</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={presupuesto}
                  onChange={(e) => setPresupuesto(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Importe Reservado</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={reservado}
                  onChange={(e) => setReservado(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Fecha Cierre</Label>
                <Input
                  type="date"
                  value={fechaCierre}
                  onChange={(e) => setFechaCierre(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Observaciones</Label>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas sobre el proyecto..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* RUBROS DEL PRESUPUESTO */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Rubros del Presupuesto
                </CardTitle>
                <CardDescription>
                  {rubros.length} rubros
                  {cotizacionId && " importados desde la cotización"}
                  {totalCostoBase > 0 && ` — costo base: $${formatMoney(totalCostoBase)}`}
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addNewRubro}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Agregar Rubro
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {rubros.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Calculator className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  Agrega rubros para detallar el presupuesto del proyecto
                </p>
                <Button type="button" variant="outline" size="sm" onClick={addNewRubro}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar primer rubro
                </Button>
              </div>
            ) : (
              rubros.map((rubro, idx) => {
                const isExpanded = expandedRubros.has(idx);
                const unidadLabel = UNIDADES[rubro.unidad || "m2"] || rubro.unidad;

                return (
                  <div key={idx} className="rounded-lg border p-4 space-y-3">
                    {/* Rubro Header - Editable */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Input
                              value={rubro.descripcion}
                              onChange={(e) => updateRubro(idx, "descripcion", e.target.value)}
                              placeholder="Descripción del rubro..."
                              className="font-medium"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-sm">
                            ${formatMoney(rubro.subtotal)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeRubro(idx)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleRubro(idx)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Basic Fields */}
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Cantidad</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={rubro.m2 ?? ""}
                            onChange={(e) => updateRubro(idx, "m2", e.target.value ? Number(e.target.value) : null)}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Unidad</Label>
                          <Select
                            value={rubro.unidad || "m2"}
                            onValueChange={(v) => updateRubro(idx, "unidad", v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(UNIDADES).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Días Estimados</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={rubro.dias_estimados ?? ""}
                            onChange={(e) => updateRubro(idx, "dias_estimados", e.target.value ? Number(e.target.value) : null)}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Tipo de Servicio</Label>
                          <Select
                            value={rubro.service_type_id?.toString() || ""}
                            onValueChange={(v) => updateRubro(idx, "service_type_id", v ? Number(v) : null)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar tipo..." />
                            </SelectTrigger>
                            <SelectContent>
                              {serviceTypes.map((st: any) => (
                                <SelectItem key={st.id} value={st.id.toString()}>
                                  {st.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Cost Fields */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Costo Mano de Obra ($)</Label>
                          <Input
                            type="number"
                            step="1"
                            value={rubro.costo_mano_obra}
                            onChange={(e) => updateRubro(idx, "costo_mano_obra", Number(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Costos Fijos ($)</Label>
                          <Input
                            type="number"
                            step="1"
                            value={rubro.costo_fijos_prorrateados}
                            onChange={(e) => updateRubro(idx, "costo_fijos_prorrateados", Number(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Costo Materiales ($)</Label>
                          <Input
                            type="number"
                            step="1"
                            value={rubro.costo_materiales}
                            onChange={(e) => updateRubro(idx, "costo_materiales", Number(e.target.value) || 0)}
                            placeholder="0"
                            className="bg-muted"
                            disabled
                          />
                        </div>
                      </div>
                    </div>

                    {/* Expanded Detail - Materials */}
                    {isExpanded && (
                      <div className="rounded-lg bg-muted/40 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Materiales</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => addMaterialToRubro(idx)}
                            className="h-7 text-xs gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            Agregar Material
                          </Button>
                        </div>

                        {rubro.materiales.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            No hay materiales. Agrega materiales para calcular el costo automáticamente.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {rubro.materiales.map((material, matIdx) => (
                              <div key={matIdx} className="grid grid-cols-12 gap-2 items-end p-2 rounded bg-background/80">
                                <div className="col-span-4 space-y-1">
                                  <Label className="text-xs">Material</Label>
                                  <Select
                                    value={material.material_id?.toString() || ""}
                                    onValueChange={(v) => updateMaterial(idx, matIdx, "material_id", v ? Number(v) : null)}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Seleccionar material..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {materialsList.map((m: any) => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                          {m.nombre}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {!material.material_id && (
                                    <Input
                                      value={material.nombre}
                                      onChange={(e) => updateMaterial(idx, matIdx, "nombre", e.target.value)}
                                      placeholder="Nombre del material..."
                                      className="h-7 text-xs mt-1"
                                    />
                                  )}
                                </div>
                                <div className="col-span-2 space-y-1">
                                  <Label className="text-xs">Cantidad</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={material.cantidad}
                                    onChange={(e) => updateMaterial(idx, matIdx, "cantidad", Number(e.target.value) || 0)}
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div className="col-span-2 space-y-1">
                                  <Label className="text-xs">Unidad</Label>
                                  <Input
                                    value={material.unidad}
                                    onChange={(e) => updateMaterial(idx, matIdx, "unidad", e.target.value)}
                                    className="h-8 text-xs"
                                    placeholder="un"
                                  />
                                </div>
                                <div className="col-span-2 space-y-1">
                                  <Label className="text-xs">Precio Unit. ($)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={material.precio_unitario}
                                    onChange={(e) => updateMaterial(idx, matIdx, "precio_unitario", Number(e.target.value) || 0)}
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div className="col-span-1 space-y-1">
                                  <Label className="text-xs">Total</Label>
                                  <div className="h-8 px-2 flex items-center text-xs font-mono bg-muted rounded text-right">
                                    ${formatMoney(material.total)}
                                  </div>
                                </div>
                                <div className="col-span-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => removeMaterialFromRubro(idx, matIdx)}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Material Summary */}
                        {rubro.materiales.length > 0 && (
                          <div className="pt-2 border-t">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Total materiales:</span>
                              <span className="font-mono font-medium">
                                ${formatMoney(rubro.materiales.reduce((s, m) => s + m.total, 0))}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Add New Rubro Button */}
            <div className="flex justify-center pt-2 pb-3">
              <Button type="button" variant="outline" onClick={addNewRubro}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar otro rubro
              </Button>
            </div>

              {/* Rubros Summary */}
              <div className="rounded-lg border-2 border-dashed p-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Materiales</p>
                    <p className="font-mono font-medium">
                      $
                      {formatMoney(
                        rubros.reduce((s, r) => s + r.costo_materiales, 0)
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Mano de Obra
                    </p>
                    <p className="font-mono font-medium">
                      $
                      {formatMoney(
                        rubros.reduce((s, r) => s + r.costo_mano_obra, 0)
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Costos Fijos
                    </p>
                    <p className="font-mono font-medium">
                      $
                      {formatMoney(
                        rubros.reduce(
                          (s, r) => s + r.costo_fijos_prorrateados,
                          0
                        )
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Costo Base Total
                    </p>
                    <p className="font-mono font-bold text-primary">
                      ${formatMoney(totalCostoBase)}
                    </p>
                  </div>
                </div>
                {Number(presupuesto) > 0 && totalCostoBase > 0 && (
                  <div className="mt-3 pt-3 border-t flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      Margen de ganancia estimado
                    </span>
                    <span className="font-mono font-bold text-emerald-600">
                      ${formatMoney(Number(presupuesto) - totalCostoBase)} (
                      {(
                        ((Number(presupuesto) - totalCostoBase) /
                          totalCostoBase) *
                        100
                      ).toFixed(1)}
                      %)
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        {/* SUBMIT */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/proyectos")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Crear Proyecto
          </Button>
        </div>
      </form>
      <ConfirmDialog />
    </div>
  );
}
