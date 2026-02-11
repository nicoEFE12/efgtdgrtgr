"use client";

import React from "react"

import { useState } from "react";
import useSWR from "swr";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Package,
  DollarSign,
  ArrowUpDown,
  Percent,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Material = {
  id: number;
  nombre: string;
  unidad: string;
  precio_unitario: number;
  categoria: string | null;
  proveedor: string | null;
  codigo_referencia: string | null;
  created_at: string;
};

export default function MaterialesPage() {
  const {
    data,
    mutate,
    isLoading,
  } = useSWR<{ materials: Material[] }>("/api/materiales", fetcher);
  const materials = data?.materials || [];
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [bulkPercentage, setBulkPercentage] = useState("");

  const categories = [
    ...new Set(materials.map((m) => m.categoria).filter(Boolean)),
  ];

  const filtered = materials.filter((m) => {
    const matchSearch =
      m.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (m.proveedor || "").toLowerCase().includes(search.toLowerCase()) ||
      (m.codigo_referencia || "").toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      categoryFilter === "all" || m.categoria === categoryFilter;
    return matchSearch && matchCategory;
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      nombre: form.get("nombre"),
      unidad: form.get("unidad"),
      precio_unitario: Number(form.get("precio_unitario")),
      categoria: form.get("categoria") || null,
      proveedor: form.get("proveedor") || null,
      codigo_referencia: form.get("codigo_referencia") || null,
    };

    if (editingMaterial) {
      body.id = editingMaterial.id;
    }

    const res = await fetch("/api/materiales", {
      method: editingMaterial ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success(
        editingMaterial ? "Material actualizado" : "Material creado"
      );
      mutate();
      setShowForm(false);
      setEditingMaterial(null);
    } else {
      toast.error("Error al guardar material");
    }
  }

  async function handleBulkUpdate() {
    if (!bulkPercentage) return;
    const res = await fetch("/api/materiales", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bulk_percentage: Number(bulkPercentage),
        material_ids: filtered.map((m) => m.id),
      }),
    });
    if (res.ok) {
      toast.success(`Precios actualizados en ${bulkPercentage}%`);
      mutate();
      setShowBulkUpdate(false);
      setBulkPercentage("");
    } else {
      toast.error("Error al actualizar precios");
    }
  }

  async function handleDeleteMaterial(id: number) {
    const res = await fetch(`/api/materiales?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Material eliminado");
      mutate();
    } else {
      const data = await res.json().catch(() => null);
      toast.error(data?.error || "Error al eliminar material");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Materiales"
        description="Biblioteca de materiales y precios unitarios"
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div />
        <div className="flex gap-2">
          <Dialog open={showBulkUpdate} onOpenChange={setShowBulkUpdate}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Percent className="mr-2 h-4 w-4" />
                Actualizar Precios
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Actualizacion Masiva de Precios</DialogTitle>
                <DialogDescription>
                  Ajustar precios de {filtered.length} materiales por porcentaje
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Porcentaje de ajuste (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={bulkPercentage}
                    onChange={(e) => setBulkPercentage(e.target.value)}
                    placeholder="Ej: 10 para +10%, -5 para -5%"
                  />
                  <p className="text-xs text-muted-foreground">
                    Usa valores negativos para reducir precios
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowBulkUpdate(false)}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleBulkUpdate}>Aplicar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog
            open={showForm}
            onOpenChange={(o) => {
              setShowForm(o);
              if (!o) setEditingMaterial(null);
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Material
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingMaterial ? "Editar Material" : "Nuevo Material"}
                </DialogTitle>
                <DialogDescription>
                  {editingMaterial
                    ? "Modifica los datos del material"
                    : "Agrega un nuevo material a la biblioteca"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    defaultValue={editingMaterial?.nombre || ""}
                    required
                    placeholder="Ej: Cemento Portland"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unidad">Unidad</Label>
                    <Select
                      name="unidad"
                      defaultValue={editingMaterial?.unidad || "kg"}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">Kg</SelectItem>
                        <SelectItem value="m">Metro</SelectItem>
                        <SelectItem value="m2">m2</SelectItem>
                        <SelectItem value="m3">m3</SelectItem>
                        <SelectItem value="un">Unidad</SelectItem>
                        <SelectItem value="l">Litro</SelectItem>
                        <SelectItem value="bolsa">Bolsa</SelectItem>
                        <SelectItem value="rollo">Rollo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="precio_unitario">Precio Unitario ($)</Label>
                    <Input
                      id="precio_unitario"
                      name="precio_unitario"
                      type="number"
                      step="0.01"
                      defaultValue={editingMaterial?.precio_unitario || ""}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria</Label>
                    <Input
                      id="categoria"
                      name="categoria"
                      defaultValue={editingMaterial?.categoria || ""}
                      placeholder="Ej: Estructura"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proveedor">Proveedor</Label>
                    <Input
                      id="proveedor"
                      name="proveedor"
                      defaultValue={editingMaterial?.proveedor || ""}
                      placeholder="Ej: Corralon Norte"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigo_referencia">Codigo de Referencia</Label>
                  <Input
                    id="codigo_referencia"
                    name="codigo_referencia"
                    defaultValue={editingMaterial?.codigo_referencia || ""}
                    placeholder="Ej: CP-001"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingMaterial(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingMaterial ? "Actualizar" : "Guardar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar material, proveedor o codigo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c!}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Materiales
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {materials.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Categorias
            </CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {categories.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Precio Promedio
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              $
              {materials.length > 0
                ? (
                    materials.reduce(
                      (a, m) => a + Number(m.precio_unitario),
                      0
                    ) / materials.length
                  ).toLocaleString("es-AR", { maximumFractionDigits: 0 })
                : "0"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Materiales</CardTitle>
          <CardDescription>
            {filtered.length} material{filtered.length !== 1 ? "es" : ""}{" "}
            encontrado{filtered.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No se encontraron materiales
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Codigo</TableHead>
                    <TableHead className="text-right">
                      Precio Unitario
                    </TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.nombre}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{m.unidad}</Badge>
                      </TableCell>
                      <TableCell>{m.categoria || "-"}</TableCell>
                      <TableCell>{m.proveedor || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {m.codigo_referencia || "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        $
                        {Number(m.precio_unitario).toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingMaterial(m);
                              setShowForm(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Eliminar</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eliminar Material</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de eliminar &quot;{m.nombre}&quot;? También se eliminará de los tipos de servicio que lo usen.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteMaterial(m.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
    </div>
  );
}
