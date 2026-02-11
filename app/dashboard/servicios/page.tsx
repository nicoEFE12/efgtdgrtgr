"use client";

import { useState } from "react";
import useSWR from "swr";
import { useConfirm } from "@/hooks/use-confirm";
import {
  Wrench,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  PackagePlus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/dashboard/page-header";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface MaterialRef {
  material_id: number;
  cantidad_por_m2: number;
  material_nombre?: string;
  material_precio?: number;
  material_unidad?: string;
}

interface ServiceType {
  id: number;
  nombre: string;
  descripcion: string | null;
  rendimiento_m2_dia: number | null;
  costo_mano_obra_dia: number | null;
  incluye_cargas_sociales: boolean;
  porcentaje_cargas: number;
  materiales: MaterialRef[];
}

interface Material {
  id: number;
  nombre: string;
  precio_unitario: number;
  unidad: string;
}

export default function ServiciosPage() {
  const { data, mutate } = useSWR<{ serviceTypes: ServiceType[] }>(
    "/api/service-types",
    fetcher
  );
  const { data: materialsData } = useSWR<{ materials: Material[] }>(
    "/api/materiales",
    fetcher
  );
  const serviceTypes = data?.serviceTypes || [];
  const allMaterials = materialsData?.materials || [];

  const { confirm, ConfirmDialog } = useConfirm();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [rendimiento, setRendimiento] = useState("");
  const [costoMODia, setCostoMODia] = useState("");
  const [incluyeCargas, setIncluyeCargas] = useState(false);
  const [pctCargas, setPctCargas] = useState("");
  const [materiales, setMateriales] = useState<MaterialRef[]>([]);
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setNombre("");
    setDescripcion("");
    setRendimiento("");
    setCostoMODia("");
    setIncluyeCargas(false);
    setPctCargas("");
    setMateriales([]);
    setEditingId(null);
  }

  function openNew() {
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(st: ServiceType) {
    setEditingId(st.id);
    setNombre(st.nombre);
    setDescripcion(st.descripcion || "");
    setRendimiento(st.rendimiento_m2_dia?.toString() || "");
    setCostoMODia(st.costo_mano_obra_dia?.toString() || "");
    setIncluyeCargas(st.incluye_cargas_sociales);
    setPctCargas(st.porcentaje_cargas?.toString() || "0");
    setMateriales(
      (st.materiales || []).map((m) => ({
        material_id: m.material_id,
        cantidad_por_m2: Number(m.cantidad_por_m2),
        material_nombre: m.material_nombre,
        material_precio: m.material_precio ? Number(m.material_precio) : undefined,
        material_unidad: m.material_unidad || undefined,
      }))
    );
    setDialogOpen(true);
  }

  function addMaterialRow() {
    setMateriales([...materiales, { material_id: 0, cantidad_por_m2: 0 }]);
  }

  function updateMaterialRow(idx: number, field: string, value: number) {
    const newMats = [...materiales];
    newMats[idx] = { ...newMats[idx], [field]: value };
    if (field === "material_id") {
      const m = allMaterials.find((am) => am.id === value);
      if (m) {
        newMats[idx].material_nombre = m.nombre;
        newMats[idx].material_precio = Number(m.precio_unitario);
        newMats[idx].material_unidad = m.unidad;
      }
    }
    setMateriales(newMats);
  }

  function removeMaterialRow(idx: number) {
    setMateriales(materiales.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!nombre) {
      toast.error("Ingresa un nombre");
      return;
    }
    setSaving(true);
    try {
      const body = {
        id: editingId,
        nombre,
        descripcion,
        rendimiento_m2_dia: rendimiento ? Number(rendimiento) : null,
        costo_mano_obra_dia: costoMODia ? Number(costoMODia) : null,
        incluye_cargas_sociales: incluyeCargas,
        porcentaje_cargas: pctCargas ? Number(pctCargas) : 0,
        materiales: materiales.filter((m) => m.material_id > 0),
      };

      const res = await fetch("/api/service-types", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingId ? "Servicio actualizado" : "Servicio creado");
        mutate();
        setDialogOpen(false);
        resetForm();
      } else {
        toast.error("Error al guardar");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    const confirmed = await confirm({
      title: "Eliminar tipo de servicio",
      description: "¿Está seguro que desea eliminar este tipo de servicio? Esta acción afectará las cotizaciones que lo utilizan.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "destructive"
    });
    if (!confirmed) return;
    const res = await fetch("/api/service-types", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      toast.success("Servicio eliminado");
      mutate();
    } else {
      toast.error("Error al eliminar");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tipos de Servicio"
        description="Define servicios como Albanileria, Pintura, Aberturas con sus materiales y rendimientos"
      />

      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Tipo de Servicio
        </Button>
      </div>

      {serviceTypes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Wrench className="mx-auto mb-3 h-10 w-10 opacity-50" />
            <p>No hay tipos de servicio definidos.</p>
            <p className="text-sm">
              Crea &quot;Albanileria&quot;, &quot;Pintura&quot;, etc. con sus
              materiales y rendimientos para que el cotizador los use
              automaticamente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {serviceTypes.map((st) => (
            <Card key={st.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{st.nombre}</CardTitle>
                    {st.descripcion && (
                      <CardDescription className="mt-1">
                        {st.descripcion}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(st)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(st.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">
                      Rendimiento
                    </p>
                    <p className="font-medium">
                      {st.rendimiento_m2_dia
                        ? `${Number(st.rendimiento_m2_dia)} m²/dia`
                        : "-"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">
                      M.O. por dia
                    </p>
                    <p className="font-medium">
                      {st.costo_mano_obra_dia
                        ? `$${Number(st.costo_mano_obra_dia).toLocaleString("es-AR")}`
                        : "-"}
                    </p>
                  </div>
                </div>
                {st.incluye_cargas_sociales && (
                  <Badge variant="outline" className="text-xs">
                    + {Number(st.porcentaje_cargas)}% cargas sociales
                  </Badge>
                )}
                {st.materiales && st.materiales.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      Materiales ({st.materiales.length})
                    </p>
                    <div className="space-y-1">
                      {st.materiales.map((mat, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded bg-muted/30 px-2 py-1 text-xs"
                        >
                          <span>{mat.material_nombre}</span>
                          <span className="font-mono text-muted-foreground">
                            {Number(mat.cantidad_por_m2)} /{mat.material_unidad || "m²"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Tipo de Servicio" : "Nuevo Tipo de Servicio"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder='Ej: "Albanileria", "Pintura"'
                />
              </div>
              <div className="space-y-2">
                <Label>Rendimiento (m²/dia)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={rendimiento}
                  onChange={(e) => setRendimiento(e.target.value)}
                  placeholder="Ej: 5"
                />
                <p className="text-xs text-muted-foreground">
                  Cuantos m² se trabajan por dia
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripcion</Label>
              <Textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={2}
                placeholder="Descripcion opcional del tipo de trabajo"
              />
            </div>
            <Separator />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Costo Mano de Obra por Dia ($)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={costoMODia}
                  onChange={(e) => setCostoMODia(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={incluyeCargas}
                    onCheckedChange={setIncluyeCargas}
                  />
                  <Label>Incluye cargas sociales</Label>
                </div>
                {incluyeCargas && (
                  <div className="space-y-2">
                    <Label>% Cargas Sociales</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={pctCargas}
                      onChange={(e) => setPctCargas(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Materiales por m²</Label>
                  <p className="text-sm text-muted-foreground">
                    Que materiales y en que cantidad se necesitan por cada m²
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={addMaterialRow}>
                  <PackagePlus className="mr-2 h-4 w-4" />
                  Agregar Material
                </Button>
              </div>
              {materiales.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Sin materiales asociados
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="w-32">Cant. por m²</TableHead>
                      <TableHead className="w-28 text-right">
                        Precio Unit.
                      </TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materiales.map((mat, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Select
                            value={mat.material_id?.toString() || ""}
                            onValueChange={(v) =>
                              updateMaterialRow(idx, "material_id", Number(v))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar material" />
                            </SelectTrigger>
                            <SelectContent>
                              {allMaterials.map((m) => (
                                <SelectItem key={m.id} value={m.id.toString()}>
                                  {m.nombre} ({m.unidad})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            value={mat.cantidad_por_m2 || ""}
                            onChange={(e) =>
                              updateMaterialRow(
                                idx,
                                "cantidad_por_m2",
                                Number(e.target.value)
                              )
                            }
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {mat.material_precio
                            ? `$${Number(mat.material_precio).toLocaleString("es-AR")}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMaterialRow(idx)}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <Separator />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {editingId ? "Actualizar" : "Crear Servicio"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </div>
  );
}
