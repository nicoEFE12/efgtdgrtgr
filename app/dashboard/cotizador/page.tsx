"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useConfirm } from "@/hooks/use-confirm";
import {
  Calculator,
  Plus,
  Trash2,
  FileText,
  Send,
  Eye,
  ChevronDown,
  ChevronUp,
  Wand2,
  ShoppingCart,
  Percent,
  Copy,
  FolderPlus,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatMoney(n: number) {
  return Math.round(n).toLocaleString("es-AR");
}

type QuotationItem = {
  descripcion: string;
  costo_materiales: number;
  costo_mano_obra: number;
  costo_fijos_prorrateados: number;
  subtotal: number;
  m2: number | null;
  unidad: string | null;
  dias_estimados: number | null;
  service_type_id: number | null;
  precio_manual: number | null;
  materiales_detalle?: MaterialLineItem[];
  materiales_custom?: MaterialLineItem[];
};

type MaterialLineItem = {
  material_id: number;
  nombre: string;
  cantidad: number;
  unidad: string;
  precio_unitario: number;
  total: number;
};

type Quotation = {
  id: number;
  client_id: number | null;
  client_name: string | null;
  nombre: string;
  estado: string;
  total: number;
  costo_total: number;
  notas: string | null;
  created_at: string;
  quotation_id?: number;
};

type Material = {
  id: number;
  nombre: string;
  precio_unitario: number;
  unidad: string;
};

type Client = {
  id: number;
  apellido_nombre: string;
};

type ServiceTypeMaterial = {
  material_id: number;
  cantidad_por_m2: number;
  material_nombre: string;
  material_precio: number;
  material_unidad: string;
};

type ServiceType = {
  id: number;
  nombre: string;
  descripcion: string | null;
  rendimiento_m2_dia: number | null;
  costo_mano_obra_dia: number | null;
  incluye_cargas_sociales: boolean;
  porcentaje_cargas: number;
  materiales: ServiceTypeMaterial[];
};

type Settings = Record<string, string>;

const UNIDADES = [
  { value: "m2", label: "m²" },
  { value: "ml", label: "ml" },
  { value: "m3", label: "m³" },
  { value: "un", label: "Unidad" },
  { value: "kg", label: "Kg" },
  { value: "global", label: "Global" },
];

export default function CotizadorPage() {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const { data: quotationsData, mutate: mutateQuotations } = useSWR<{
    quotations: Quotation[];
  }>("/api/cotizaciones", fetcher);
  const quotations = quotationsData?.quotations || [];
  const { data: materialsData } = useSWR<{ materials: Material[] }>(
    "/api/materiales",
    fetcher
  );
  const materialsList = materialsData?.materials || [];
  const { data: clientsData } = useSWR<{ clients: Client[] }>(
    "/api/clientes",
    fetcher
  );
  const clientsList = clientsData?.clients || [];
  const { data: serviceTypesData } = useSWR<{ serviceTypes: ServiceType[] }>(
    "/api/service-types",
    fetcher
  );
  const serviceTypes = serviceTypesData?.serviceTypes || [];
  const { data: settingsData } = useSWR<{ settings: Settings }>(
    "/api/settings",
    fetcher
  );
  const settings = settingsData?.settings || {};

  const costoFijoMensual = Number(settings.costo_fijo_mensual || 0);
  const diasLaborablesMes = Number(settings.dias_laborables_mes || 22);
  const margenGanancia = Number(settings.default_margin_percent || 0);
  const pctCargasSocialesGlobal = Number(
    settings.porcentaje_cargas_sociales || 0
  );

  const [showBuilder, setShowBuilder] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showMaterialsList, setShowMaterialsList] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const [nombre, setNombre] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [applyMargin, setApplyMargin] = useState(true);

  function resetBuilder() {
    setNombre("");
    setClientId("");
    setNotas("");
    setItems([]);
    setEditingId(null);
    setApplyMargin(true);
    setExpandedItems(new Set());
  }

  function toggleExpanded(idx: number) {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function addItem() {
    setItems([
      ...items,
      {
        descripcion: "",
        costo_materiales: 0,
        costo_mano_obra: 0,
        costo_fijos_prorrateados: 0,
        subtotal: 0,
        m2: 1,
        unidad: "m2",
        dias_estimados: null,
        service_type_id: null,
        precio_manual: null,
        materiales_detalle: [],
        materiales_custom: [],
      },
    ]);
  }

  function recalcSubtotal(item: QuotationItem): QuotationItem {
    if (item.service_type_id) {
      item.subtotal =
        Number(item.costo_materiales) +
        Number(item.costo_mano_obra) +
        Number(item.costo_fijos_prorrateados);
    } else {
      item.subtotal =
        item.precio_manual != null
          ? Number(item.precio_manual)
          : Number(item.costo_materiales) +
            Number(item.costo_mano_obra) +
            Number(item.costo_fijos_prorrateados);
    }
    return item;
  }

  function updateItem(
    index: number,
    field: string,
    value: string | number | null
  ) {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    newItems[index] = recalcSubtotal(item);
    setItems(newItems);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
    setExpandedItems((prev) => {
      const next = new Set<number>();
      prev.forEach((v) => {
        if (v < index) next.add(v);
        else if (v > index) next.add(v - 1);
      });
      return next;
    });
  }

  function selectServiceType(index: number, stId: string) {
    const st = serviceTypes.find((s) => s.id === Number(stId));
    if (!st) return;
    const newItems = [...items];
    const item = { ...newItems[index] };
    item.service_type_id = st.id;
    item.descripcion = st.nombre + (st.descripcion ? ` - ${st.descripcion}` : "");
    item.unidad = "m2";
    item.precio_manual = null;
    if (item.m2 && item.m2 > 0) {
      autoCalcFromServiceType(item, st);
    }
    newItems[index] = item;
    setItems(newItems);
  }

  function clearServiceType(index: number) {
    const newItems = [...items];
    const item = { ...newItems[index] };
    item.service_type_id = null;
    item.costo_materiales = 0;
    item.costo_mano_obra = 0;
    item.costo_fijos_prorrateados = 0;
    item.dias_estimados = null;
    item.materiales_detalle = [];
    item.materiales_custom = item.materiales_custom || [];
    // Recalc materials from custom only
    const customCost = (item.materiales_custom || []).reduce((s, m) => s + m.total, 0);
    item.costo_materiales = Math.round(customCost);
    item.subtotal = item.precio_manual ?? item.costo_materiales;
    newItems[index] = item;
    setItems(newItems);
  }

  function addCustomMaterial(index: number) {
    const newItems = [...items];
    const item = { ...newItems[index] };
    if (!item.materiales_custom) item.materiales_custom = [];
    item.materiales_custom.push({
      material_id: 0,
      nombre: "",
      cantidad: 1,
      unidad: "un",
      precio_unitario: 0,
      total: 0,
    });
    newItems[index] = item;
    setItems(newItems);
  }

  function selectCustomMaterial(itemIdx: number, matIdx: number, materialId: number) {
    const material = materialsList.find(m => m.id === materialId);
    if (!material) return;
    const newItems = [...items];
    const item = { ...newItems[itemIdx] };
    if (!item.materiales_custom) return;
    const cm = { ...item.materiales_custom[matIdx] };
    cm.material_id = material.id;
    cm.nombre = material.nombre;
    cm.unidad = material.unidad;
    cm.precio_unitario = Number(material.precio_unitario);
    cm.total = cm.cantidad * cm.precio_unitario;
    item.materiales_custom[matIdx] = cm;
    recalcMaterialCosts(item);
    newItems[itemIdx] = recalcSubtotal(item);
    setItems(newItems);
  }

  function updateCustomMaterial(itemIdx: number, matIdx: number, field: string, value: any) {
    const newItems = [...items];
    const item = { ...newItems[itemIdx] };
    if (!item.materiales_custom) return;
    const mat = { ...item.materiales_custom[matIdx], [field]: value };
    if (field === "cantidad" || field === "precio_unitario") {
      mat.total = Number(mat.cantidad) * Number(mat.precio_unitario);
    }
    item.materiales_custom[matIdx] = mat;
    recalcMaterialCosts(item);
    newItems[itemIdx] = recalcSubtotal(item);
    setItems(newItems);
  }

  function removeCustomMaterial(itemIdx: number, matIdx: number) {
    const newItems = [...items];
    const item = { ...newItems[itemIdx] };
    if (!item.materiales_custom) return;
    item.materiales_custom = item.materiales_custom.filter((_, i) => i !== matIdx);
    recalcMaterialCosts(item);
    newItems[itemIdx] = recalcSubtotal(item);
    setItems(newItems);
  }

  function recalcMaterialCosts(item: QuotationItem) {
    const autoCost = (item.materiales_detalle || []).reduce((s, m) => s + m.total, 0);
    const customCost = (item.materiales_custom || []).reduce((s, m) => s + m.total, 0);
    item.costo_materiales = Math.round(autoCost + customCost);
  }

  function autoCalcFromServiceType(item: QuotationItem, st: ServiceType) {
    const m2 = Number(item.m2) || 0;
    if (m2 <= 0) return;

    let totalMaterialesCost = 0;
    const detalle: MaterialLineItem[] = [];
    if (st.materiales && st.materiales.length > 0) {
      for (const stm of st.materiales) {
        const cantidadRaw = Number(stm.cantidad_por_m2) * m2;
        const precioUnit = Number(stm.material_precio);
        const totalMat = cantidadRaw * precioUnit;
        totalMaterialesCost += totalMat;
        // Round based on unit type: discrete units get ceil, continuous get 1 decimal
        const unidadLower = stm.material_unidad.toLowerCase();
        const isDiscrete = unidadLower === "un" || unidadLower === "unidad" || unidadLower === "bolsa" || unidadLower === "balde";
        const cantidad = isDiscrete ? Math.ceil(cantidadRaw) : Math.ceil(cantidadRaw * 10) / 10;
        detalle.push({
          material_id: stm.material_id,
          nombre: stm.material_nombre,
          cantidad,
          unidad: stm.material_unidad,
          precio_unitario: precioUnit,
          total: totalMat,
        });
      }
    }

    let diasEstimados = 0;
    let costoMO = 0;
    if (st.rendimiento_m2_dia && Number(st.rendimiento_m2_dia) > 0) {
      diasEstimados = m2 / Number(st.rendimiento_m2_dia);
    }
    if (st.costo_mano_obra_dia && diasEstimados > 0) {
      costoMO = diasEstimados * Number(st.costo_mano_obra_dia);
      const pctCargas = st.incluye_cargas_sociales
        ? Number(st.porcentaje_cargas)
        : pctCargasSocialesGlobal;
      if (pctCargas > 0) {
        costoMO *= 1 + pctCargas / 100;
      }
    }

    let costosFijos = 0;
    if (diasEstimados > 0 && costoFijoMensual > 0 && diasLaborablesMes > 0) {
      const costoDiario = costoFijoMensual / diasLaborablesMes;
      costosFijos = costoDiario * diasEstimados;
    }

    item.costo_materiales = Math.round(totalMaterialesCost);
    item.costo_mano_obra = Math.round(costoMO);
    item.costo_fijos_prorrateados = Math.round(costosFijos);
    item.dias_estimados = Math.round(diasEstimados * 10) / 10;
    item.materiales_detalle = detalle;
    // Recalc including custom materials
    recalcMaterialCosts(item);
    item.subtotal =
      item.costo_materiales +
      item.costo_mano_obra +
      item.costo_fijos_prorrateados;
  }

  function handleM2Change(index: number, value: number | null) {
    const newItems = [...items];
    const item = { ...newItems[index], m2: value };
    if (item.service_type_id) {
      const st = serviceTypes.find((s) => s.id === item.service_type_id);
      if (st && value && value > 0) {
        autoCalcFromServiceType(item, st);
      }
    }
    newItems[index] = recalcSubtotal(item);
    setItems(newItems);
  }

  const costoBase = items.reduce(
    (sum, item) => sum + Number(item.subtotal),
    0
  );
  const montoMargen = applyMargin ? costoBase * (margenGanancia / 100) : 0;
  const total = costoBase + montoMargen;

  const totalDias = items.reduce(
    (s, i) => s + (Number(i.dias_estimados) || 0),
    0
  );

  const allMaterialsMap: Record<number, MaterialLineItem> = {};
  items.forEach((item) => {
    // Add auto-calculated materials
    if (item.materiales_detalle) {
      for (const ml of item.materiales_detalle) {
        if (allMaterialsMap[ml.material_id]) {
          allMaterialsMap[ml.material_id].cantidad += ml.cantidad;
          allMaterialsMap[ml.material_id].total += ml.total;
        } else {
          allMaterialsMap[ml.material_id] = { ...ml };
        }
      }
    }
    // Add custom materials
    if (item.materiales_custom) {
      for (const cm of item.materiales_custom) {
        // Use negative IDs or name-based keys for custom materials without material_id
        const key = cm.material_id || -(Date.now() + Math.random());
        if (allMaterialsMap[key]) {
          allMaterialsMap[key].cantidad += cm.cantidad;
          allMaterialsMap[key].total += cm.total;
        } else {
          allMaterialsMap[key] = { ...cm };
        }
      }
    }
  });
  const materialsPurchasingList = Object.values(allMaterialsMap);

  async function handleSave(estado: string = "borrador") {
    if (!nombre) {
      toast.error("Ingresa un nombre para la cotizacion");
      return;
    }
    if (items.length === 0) {
      toast.error("Agrega al menos un rubro");
      return;
    }

    const body = {
      client_id: clientId ? Number(clientId) : null,
      nombre,
      notas,
      estado,
      items: items.map((i) => ({
        descripcion: i.descripcion,
        costo_materiales: i.costo_materiales,
        costo_mano_obra: i.costo_mano_obra,
        costo_fijos_prorrateados: i.costo_fijos_prorrateados,
        subtotal: i.subtotal,
        m2: i.m2,
        unidad: i.unidad,
        dias_estimados: i.dias_estimados,
        service_type_id: i.service_type_id,
      })),
      total_override: Math.round(total),
    };

    const url = editingId
      ? `/api/cotizaciones/${editingId}`
      : "/api/cotizaciones";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success(
        estado === "enviada"
          ? "Cotizacion marcada como enviada"
          : editingId
            ? "Cotizacion actualizada"
            : "Borrador guardado"
      );
      mutateQuotations();
      setShowBuilder(false);
      resetBuilder();
    } else {
      toast.error("Error al guardar cotizacion");
    }
  }

  async function loadQuotation(id: number) {
    const res = await fetch(`/api/cotizaciones/${id}`);
    if (res.ok) {
      const { quotation: q } = await res.json();
      setNombre(q.nombre);
      setClientId(q.client_id?.toString() || "");
      setNotas(q.notas || "");
      setItems(
        q.items.map(
          (i: QuotationItem & { unidad?: string | null }) => ({
            descripcion: i.descripcion,
            costo_materiales: Number(i.costo_materiales),
            costo_mano_obra: Number(i.costo_mano_obra),
            costo_fijos_prorrateados: Number(i.costo_fijos_prorrateados),
            subtotal: Number(i.subtotal),
            m2: i.m2 ? Number(i.m2) : null,
            unidad: i.unidad || "m2",
            dias_estimados: i.dias_estimados ? Number(i.dias_estimados) : null,
            service_type_id: i.service_type_id,
            precio_manual: i.service_type_id ? null : Number(i.subtotal),
            materiales_detalle: [],
            materiales_custom: [],
          })
        )
      );
      setEditingId(id);
      setShowBuilder(true);
    }
  }

  async function duplicateQuotation(id: number) {
    const res = await fetch(`/api/cotizaciones/${id}`);
    if (res.ok) {
      const { quotation: q } = await res.json();
      setNombre(`${q.nombre} (copia)`);
      setClientId(q.client_id?.toString() || "");
      setNotas(q.notas || "");
      setItems(
        q.items.map(
          (i: QuotationItem & { unidad?: string | null }) => ({
            descripcion: i.descripcion,
            costo_materiales: Number(i.costo_materiales),
            costo_mano_obra: Number(i.costo_mano_obra),
            costo_fijos_prorrateados: Number(i.costo_fijos_prorrateados),
            subtotal: Number(i.subtotal),
            m2: i.m2 ? Number(i.m2) : null,
            unidad: i.unidad || "m2",
            dias_estimados: i.dias_estimados ? Number(i.dias_estimados) : null,
            service_type_id: i.service_type_id,
            precio_manual: i.service_type_id ? null : Number(i.subtotal),
            materiales_detalle: [],
            materiales_custom: [],
          })
        )
      );
      setEditingId(null);
      setShowBuilder(true);
      toast.success("Cotizacion duplicada - edita y guarda");
    }
  }

  async function deleteQuotation(id: number) {
    const confirmed = await confirm({
      title: "Eliminar cotización",
      description: "¿Está seguro que desea eliminar esta cotización? Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "destructive"
    });
    if (!confirmed) return;
    const res = await fetch(`/api/cotizaciones/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Cotizacion eliminada");
      mutateQuotations();
    }
  }

  async function handleAcceptAndCreateProject(q: Quotation) {
    if (!q.client_id) {
      toast.error("Esta cotizacion no tiene cliente asignado");
      return;
    }
    // Mark as cobrado first
    await fetch(`/api/cotizaciones/${q.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "cobrado" }),
    });
    mutateQuotations();
    // Navigate to project creation with quotation data pre-filled
    router.push(`/dashboard/proyectos/nuevo?cotizacion_id=${q.id}`);
  }

  async function updateQuotationStatus(id: number, estado: string) {
    const res = await fetch(`/api/cotizaciones/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (res.ok) {
      toast.success("Estado actualizado");
      mutateQuotations();
    } else {
      toast.error("Error al actualizar estado");
    }
  }

  const statusColors: Record<string, string> = {
    borrador: "bg-muted text-muted-foreground",
    enviada:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    cobrado:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    rechazada:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  const statusLabels: Record<string, string> = {
    borrador: "Borrador",
    enviada: "Enviada",
    cobrado: "Cobrado",
    rechazada: "Rechazada",
  };

  // ========================
  // BUILDER VIEW
  // ========================
  if (showBuilder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {editingId ? "Editar Cotizacion" : "Nueva Cotizacion"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Selecciona un tipo de servicio e ingresa la cantidad, o carga
              el precio manualmente
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setShowBuilder(false);
              resetBuilder();
            }}
          >
            Volver al listado
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* DATOS GENERALES */}
            <Card>
              <CardHeader>
                <CardTitle>Datos Generales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>
                      Nombre <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Ampliacion Casa Rodriguez"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select value={clientId} onValueChange={setClientId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clientsList.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.apellido_nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notas / Condiciones</Label>
                  <Textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Condiciones de pago, plazos, observaciones..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* RUBROS */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Rubros del Presupuesto</CardTitle>
                  <CardDescription>
                    Usa tipo de servicio + cantidad para calculo automatico, o
                    ingresa un precio manual
                  </CardDescription>
                </div>
                <Button size="sm" onClick={addItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Rubro
                </Button>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <Calculator className="h-10 w-10 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      Agrega rubros para armar el presupuesto
                    </p>
                    <Button variant="outline" size="sm" onClick={addItem}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar primer rubro
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item, idx) => {
                      const isAutoCalc = !!item.service_type_id;
                      const isExpanded = expandedItems.has(idx);

                      return (
                        <div
                          key={idx}
                          className="rounded-lg border p-4 space-y-3"
                        >
                          {/* HEADER */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">
                                Rubro {idx + 1}
                              </span>
                              {isAutoCalc && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs gap-1"
                                >
                                  <Wand2 className="h-3 w-3" />
                                  Auto
                                </Badge>
                              )}
                              {item.dias_estimados != null &&
                                item.dias_estimados > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    ~{item.dias_estimados} dias
                                  </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-bold tabular-nums">
                                ${formatMoney(item.subtotal)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => removeItem(idx)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>

                          {/* ROW 1: Service Type + Description */}
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs flex items-center gap-1">
                                <Wand2 className="h-3 w-3" />
                                Tipo de Servicio
                              </Label>
                              <div className="flex gap-1">
                                <Select
                                  value={
                                    item.service_type_id?.toString() || ""
                                  }
                                  onValueChange={(v) =>
                                    selectServiceType(idx, v)
                                  }
                                >
                                  <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Manual..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {serviceTypes.map((st) => (
                                      <SelectItem
                                        key={st.id}
                                        value={st.id.toString()}
                                      >
                                        {st.nombre}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {isAutoCalc && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 shrink-0"
                                    onClick={() => clearServiceType(idx)}
                                    title="Cambiar a manual"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Descripcion</Label>
                              <Textarea
                                value={item.descripcion}
                                onChange={(e) =>
                                  updateItem(
                                    idx,
                                    "descripcion",
                                    e.target.value
                                  )
                                }
                                placeholder="Descripcion del rubro"
                                rows={2}
                                className="resize-none max-h-40 overflow-y-auto min-h-[2.5rem]"
                              />
                            </div>
                          </div>

                          {/* ROW 2: Quantity + Unit + Price/desglose */}
                          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Cantidad</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={item.m2 ?? ""}
                                onChange={(e) =>
                                  handleM2Change(
                                    idx,
                                    e.target.value
                                      ? Number(e.target.value)
                                      : null
                                  )
                                }
                                placeholder="1"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Unidad</Label>
                              <Select
                                value={item.unidad || "m2"}
                                onValueChange={(v) =>
                                  updateItem(idx, "unidad", v)
                                }
                                disabled={isAutoCalc}
                              >
                                <SelectTrigger className={isAutoCalc ? "opacity-60" : ""}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {UNIDADES.map((u) => (
                                    <SelectItem key={u.value} value={u.value}>
                                      {u.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {!isAutoCalc ? (
                              <div className="space-y-1.5 col-span-1 sm:col-span-2">
                                <Label className="text-xs">Precio ($)</Label>
                                <Input
                                  type="number"
                                  step="1"
                                  value={item.precio_manual ?? ""}
                                  onChange={(e) =>
                                    updateItem(
                                      idx,
                                      "precio_manual",
                                      e.target.value
                                        ? Number(e.target.value)
                                        : null
                                    )
                                  }
                                  placeholder="Precio total del rubro"
                                />
                              </div>
                            ) : (
                              <div className="col-span-1 sm:col-span-2 flex items-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs text-muted-foreground"
                                  onClick={() => toggleExpanded(idx)}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="mr-1 h-3 w-3" />
                                  ) : (
                                    <ChevronDown className="mr-1 h-3 w-3" />
                                  )}
                                  Ver desglose
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* EXPANDED: Cost breakdown (auto-calc only) */}
                          {isAutoCalc && isExpanded && (
                            <div className="rounded-lg bg-muted/40 p-3 space-y-2 text-sm">
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">
                                    Materiales
                                  </p>
                                  <p className="font-mono font-medium">
                                    ${formatMoney(item.costo_materiales)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">
                                    Mano de Obra
                                  </p>
                                  <p className="font-mono font-medium">
                                    ${formatMoney(item.costo_mano_obra)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">
                                    Costos Fijos
                                  </p>
                                  <p className="font-mono font-medium">
                                    $
                                    {formatMoney(
                                      item.costo_fijos_prorrateados
                                    )}
                                  </p>
                                </div>
                              </div>
                              {item.materiales_detalle &&
                                item.materiales_detalle.length > 0 && (
                                  <>
                                    <Separator />
                                    <p className="text-xs font-medium text-muted-foreground">
                                      Materiales calculados:
                                    </p>
                                    <div className="space-y-0.5 text-xs">
                                      {item.materiales_detalle.map((md, i) => {
                                        const unidadLower = md.unidad.toLowerCase();
                                        const isDiscrete = unidadLower === "un" || unidadLower === "unidad" || unidadLower === "bolsa" || unidadLower === "balde";
                                        const cantStr = isDiscrete ? md.cantidad.toString() : md.cantidad.toFixed(1);
                                        return (
                                          <div
                                            key={i}
                                            className="flex justify-between"
                                          >
                                            <span>
                                              {md.nombre} x {cantStr} {md.unidad}
                                            </span>
                                            <span className="font-mono">
                                              ${formatMoney(md.total)}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </>
                                )}
                              {/* CUSTOM MATERIALS */}
                              <Separator />
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-muted-foreground">
                                  Materiales adicionales:
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() => addCustomMaterial(idx)}
                                >
                                  <Plus className="mr-1 h-3 w-3" />
                                  Agregar
                                </Button>
                              </div>
                              {item.materiales_custom && item.materiales_custom.length > 0 && (
                                <div className="space-y-1.5">
                                  {item.materiales_custom.map((cm, cmIdx) => (
                                    <div key={cmIdx} className="grid grid-cols-12 gap-1.5 items-center text-xs">
                                      <Select
                                        value={cm.material_id?.toString() || ""}
                                        onValueChange={(v) => selectCustomMaterial(idx, cmIdx, Number(v))}
                                      >
                                        <SelectTrigger className="col-span-5 h-7 text-xs">
                                          <SelectValue placeholder="Seleccionar material..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {materialsList.map((m) => (
                                            <SelectItem key={m.id} value={m.id.toString()}>
                                              {m.nombre}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Input
                                        type="number"
                                        step="0.1"
                                        value={cm.cantidad}
                                        onChange={(e) => updateCustomMaterial(idx, cmIdx, "cantidad", Number(e.target.value))}
                                        placeholder="Cant"
                                        className="col-span-2 h-7 text-xs"
                                      />
                                      <Input
                                        value={cm.unidad}
                                        className="col-span-2 h-7 text-xs bg-muted"
                                        disabled
                                      />
                                      <Input
                                        type="number"
                                        step="1"
                                        value={cm.precio_unitario}
                                        onChange={(e) => updateCustomMaterial(idx, cmIdx, "precio_unitario", Number(e.target.value))}
                                        placeholder="$/u"
                                        className="col-span-2 h-7 text-xs"
                                      />
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="col-span-1 h-7 w-7"
                                        onClick={() => removeCustomMaterial(idx, cmIdx)}
                                      >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-4">
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calculator className="h-4 w-4" />
                  Resumen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Materiales</span>
                    <span className="font-mono tabular-nums">
                      $
                      {formatMoney(
                        items.reduce(
                          (s, i) => s + Number(i.costo_materiales),
                          0
                        )
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mano de Obra</span>
                    <span className="font-mono tabular-nums">
                      $
                      {formatMoney(
                        items.reduce(
                          (s, i) => s + Number(i.costo_mano_obra),
                          0
                        )
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Costos Fijos</span>
                    <span className="font-mono tabular-nums">
                      $
                      {formatMoney(
                        items.reduce(
                          (s, i) => s + Number(i.costo_fijos_prorrateados),
                          0
                        )
                      )}
                    </span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-medium">
                  <span>Costo Base</span>
                  <span className="font-mono tabular-nums">
                    ${formatMoney(costoBase)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyMargin}
                      onChange={(e) => setApplyMargin(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Percent className="h-3 w-3" />
                    Margen ({margenGanancia}%)
                  </label>
                  <span className="font-mono tabular-nums text-accent">
                    +${formatMoney(montoMargen)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Precio Final</span>
                  <span className="font-mono tabular-nums text-primary">
                    ${formatMoney(total)}
                  </span>
                </div>
                {totalDias > 0 && (
                  <p className="text-xs text-muted-foreground text-right">
                    Duracion estimada: ~{totalDias.toFixed(1)} dias
                  </p>
                )}

                <Separator />
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => handleSave("borrador")}
                    disabled={!nombre || items.length === 0}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Guardar Borrador
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => handleSave("enviada")}
                    disabled={!nombre || items.length === 0}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Marcar como Enviada
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(true)}
                      disabled={items.length === 0}
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      Vista Previa
                    </Button>
                    {materialsPurchasingList.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMaterialsList(true)}
                      >
                        <ShoppingCart className="mr-1 h-3.5 w-3.5" />
                        Compras
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* COMMERCIAL PREVIEW — client never sees margin */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Vista Previa Comercial</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {nombre || "Sin nombre"}
                  </h2>
                  {clientId && (
                    <p className="text-sm text-muted-foreground">
                      Cliente:{" "}
                      {
                        clientsList.find((c) => c.id === Number(clientId))
                          ?.apellido_nombre
                      }
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date().toLocaleDateString("es-AR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <img
                  src="/logo.png"
                  alt="Am Soluciones Constructivas"
                  className="h-12 w-auto"
                />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rubro</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => {
                    const unidadLabel =
                      UNIDADES.find((u) => u.value === item.unidad)?.label ||
                      item.unidad;
                    // Distribute margin proportionally so client only sees final prices
                    const itemFinal =
                      costoBase > 0
                        ? item.subtotal +
                          (item.subtotal / costoBase) * montoMargen
                        : item.subtotal;
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {item.descripcion || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.m2
                            ? `${item.m2} ${unidadLabel}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          ${formatMoney(itemFinal)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="font-mono">
                      ${formatMoney(total)}
                    </span>
                  </div>
                  {totalDias > 0 && (
                    <p className="text-xs text-muted-foreground text-right">
                      Plazo estimado: ~{Math.ceil(totalDias)} dias habiles
                    </p>
                  )}
                </div>
              </div>
              {notas && (
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <strong>Condiciones:</strong> {notas}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* MATERIALS PURCHASING LIST */}
        <Dialog
          open={showMaterialsList}
          onOpenChange={setShowMaterialsList}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Lista de Compras
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 p-4">
              <p className="text-sm text-muted-foreground">
                {nombre} — {materialsPurchasingList.length} materiales
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead className="text-right">P. Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materialsPurchasingList.map((ml, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {ml.nombre}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {ml.cantidad.toFixed(1)}
                      </TableCell>
                      <TableCell>{ml.unidad}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${formatMoney(ml.precio_unitario)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        ${formatMoney(ml.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Total Materiales:</span>
                <span className="font-mono">
                  $
                  {formatMoney(
                    materialsPurchasingList.reduce((s, m) => s + m.total, 0)
                  )}
                </span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ========================
  // LIST VIEW
  // ========================
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cotizador"
        description="Crea y gestiona presupuestos para tus clientes"
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div />
        <Button
          onClick={() => {
            resetBuilder();
            setShowBuilder(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Cotizacion
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["borrador", "enviada", "cobrado", "rechazada"] as const).map(
          (estado) => {
            const count = quotations.filter(
              (q) => q.estado === estado
            ).length;
            return (
              <Card key={estado}>
              <CardContent className="pt-5 pb-4">
                <div className="text-2xl font-bold text-foreground">
                  {count}
                </div>
                <p className="text-xs text-muted-foreground">
                  {statusLabels[estado]}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cotizaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {quotations.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                No hay cotizaciones. Crea la primera!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="w-32">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotations.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-medium">
                        {q.nombre}
                      </TableCell>
                      <TableCell>{q.client_name || "-"}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[q.estado] || ""}>
                          {statusLabels[q.estado] || q.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        ${formatMoney(Number(q.total))}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(q.created_at).toLocaleDateString("es-AR")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {(q.estado === "enviada" || q.estado === "cobrado") && q.client_id && (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleAcceptAndCreateProject(q)}
                            >
                              <FolderPlus className="mr-1 h-3.5 w-3.5" />
                              Crear Proyecto
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => loadQuotation(q.id)}
                              >
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => duplicateQuotation(q.id)}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicar
                              </DropdownMenuItem>
                              {q.estado === "borrador" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      updateQuotationStatus(q.id, "enviada")
                                    }
                                  >
                                    <Send className="mr-2 h-4 w-4" />
                                    Marcar como Enviada
                                  </DropdownMenuItem>
                                </>
                              )}
                              {q.estado === "enviada" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      updateQuotationStatus(q.id, "cobrado")
                                    }
                                  >
                                    Marcar como Cobrado
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      updateQuotationStatus(q.id, "rechazada")
                                    }
                                  >
                                    Marcar como Rechazada
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => deleteQuotation(q.id)}
                                className="text-destructive"
                              >
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog />
    </div>
  );
}
