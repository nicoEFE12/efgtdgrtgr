"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";

type ImportType = "materials" | "settings";

interface PreviewData {
  sheetNames: string[];
  headers: string[];
  rows: unknown[][];
  totalRows: number;
}

interface ImportResult {
  success: boolean;
  imported: number;
  total: number;
  errors: string[];
  hasMoreErrors: boolean;
}

const MATERIAL_COLUMNS = [
  { key: "nombre", label: "Nombre/Material", required: true },
  { key: "precio", label: "Precio Unitario", required: true },
  { key: "unidad", label: "Unidad de Medida", required: false },
  { key: "proveedor", label: "Proveedor", required: false },
  { key: "codigo", label: "Código/Referencia", required: false },
  { key: "categoria", label: "Categoría", required: false },
];

const SETTINGS_COLUMNS = [
  { key: "key", label: "Clave/Parámetro", required: true },
  { key: "value", label: "Valor", required: true },
  { key: "description", label: "Descripción", required: false },
];

export default function ImportPage() {
  const [step, setStep] = useState<"upload" | "preview" | "mapping" | "result">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<ImportType>("materials");
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const columns = importType === "materials" ? MATERIAL_COLUMNS : SETTINGS_COLUMNS;

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", "preview");

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setPreviewData(data);
        setStep("preview");
        
        // Auto-map columns based on header names
        const autoMapping: Record<string, number> = {};
        const headerLower = data.headers.map((h: string) => (h || "").toLowerCase());
        
        if (importType === "materials") {
          const nameIdx = headerLower.findIndex((h: string) => 
            h.includes("material") || h.includes("nombre") || h.includes("producto")
          );
          const priceIdx = headerLower.findIndex((h: string) => 
            h.includes("precio") || h.includes("costo") || h.includes("valor")
          );
          const unitIdx = headerLower.findIndex((h: string) => 
            h.includes("unidad") || h.includes("medida")
          );
          const providerIdx = headerLower.findIndex((h: string) => 
            h.includes("proveedor") || h.includes("contacto")
          );
          const codeIdx = headerLower.findIndex((h: string) => 
            h.includes("código") || h.includes("codigo") || h.includes("ref")
          );
          const catIdx = headerLower.findIndex((h: string) => 
            h.includes("categoría") || h.includes("categoria") || h.includes("tipo")
          );

          if (nameIdx >= 0) autoMapping.nombre = nameIdx;
          if (priceIdx >= 0) autoMapping.precio = priceIdx;
          if (unitIdx >= 0) autoMapping.unidad = unitIdx;
          if (providerIdx >= 0) autoMapping.proveedor = providerIdx;
          if (codeIdx >= 0) autoMapping.codigo = codeIdx;
          if (catIdx >= 0) autoMapping.categoria = catIdx;
        }
        
        setColumnMapping(autoMapping);
      } else {
        toast.error(data.error || "Error al leer el archivo");
      }
    } catch {
      toast.error("Error al procesar el archivo");
    } finally {
      setLoading(false);
    }
  }, [importType]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith(".xlsx") || droppedFile.name.endsWith(".xls"))) {
      handleFileSelect(droppedFile);
    } else {
      toast.error("Por favor selecciona un archivo Excel (.xlsx o .xls)");
    }
  }, [handleFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file || !previewData) return;

    // Validate required columns
    const requiredCols = columns.filter(c => c.required);
    const missingCols = requiredCols.filter(c => columnMapping[c.key] === undefined);
    
    if (missingCols.length > 0) {
      toast.error(`Faltan columnas requeridas: ${missingCols.map(c => c.label).join(", ")}`);
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", importType);
      formData.append("columnMapping", JSON.stringify(columnMapping));

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setResult(data);
        setStep("result");
        toast.success(`${data.imported} registros importados correctamente`);
      } else {
        toast.error(data.error || "Error en la importación");
      }
    } catch {
      toast.error("Error al importar los datos");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep("upload");
    setFile(null);
    setPreviewData(null);
    setColumnMapping({});
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar Datos"
        description="Importa materiales o configuraciones desde archivos Excel"
      />

      {/* Steps indicator */}
      <div className="flex items-center justify-center gap-2">
        {["upload", "preview", "mapping", "result"].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : ["upload", "preview", "mapping", "result"].indexOf(step) > i
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            {i < 3 && (
              <ArrowRight className="mx-2 h-4 w-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Seleccionar Archivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Tipo de importación</Label>
              <Select value={importType} onValueChange={(v) => setImportType(v as ImportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="materials">Base de Materiales</SelectItem>
                  <SelectItem value="settings">Configuraciones / Parámetros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
                loading ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/50"
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              {loading ? (
                <RefreshCw className="h-12 w-12 animate-spin text-primary" />
              ) : (
                <>
                  <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-lg font-medium">
                    Arrastra tu archivo Excel aquí
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    o haz clic para seleccionar
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <Button className="mt-4" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    Seleccionar archivo
                  </Button>
                </>
              )}
            </div>

            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="font-medium">Formato esperado para {importType === "materials" ? "Materiales" : "Configuraciones"}:</h4>
              <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                {columns.map((col) => (
                  <li key={col.key}>
                    {col.label} {col.required && <span className="text-destructive">*</span>}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && previewData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Vista Previa
              </span>
              <Badge variant="secondary">{previewData.totalRows} filas</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-[400px] overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {previewData.headers.map((header, i) => (
                      <TableHead key={i} className="whitespace-nowrap">
                        {header || `Columna ${i + 1}`}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.rows && previewData.rows.length > 0 ? (
                    previewData.rows.slice(0, 10).map((row, rowIndex) => {
                      const rowArray = Array.isArray(row) ? row : [];
                      return (
                        <TableRow key={rowIndex}>
                          {previewData.headers.map((_, colIndex) => {
                            const cellValue = rowArray[colIndex];
                            const displayValue = cellValue !== null && cellValue !== undefined 
                              ? String(cellValue) 
                              : "";
                            return (
                              <TableCell key={colIndex} className="max-w-[200px] truncate">
                                {displayValue}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={previewData.headers.length} className="text-center text-muted-foreground">
                        No se encontraron filas con datos
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {previewData.totalRows > 10 && (
              <p className="text-center text-sm text-muted-foreground">
                Mostrando {Math.min(10, previewData.rows?.length || 0)} de {previewData.totalRows} filas
              </p>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={reset}>
                Cancelar
              </Button>
              <Button onClick={() => setStep("mapping")} disabled={!previewData.rows || previewData.rows.length === 0}>
                Continuar al mapeo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Column Mapping */}
      {step === "mapping" && previewData && (
        <Card>
          <CardHeader>
            <CardTitle>Mapeo de Columnas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Selecciona qué columna del Excel corresponde a cada campo del sistema.
              Los campos marcados con * son requeridos.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {columns.map((col) => (
                <div key={col.key} className="space-y-2">
                  <Label>
                    {col.label}
                    {col.required && <span className="text-destructive"> *</span>}
                  </Label>
                  <Select
                    value={columnMapping[col.key]?.toString() ?? ""}
                    onValueChange={(v) => {
                      const newMapping = { ...columnMapping };
                      if (v) {
                        newMapping[col.key] = parseInt(v);
                      } else {
                        delete newMapping[col.key];
                      }
                      setColumnMapping(newMapping);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar columna" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- No mapear --</SelectItem>
                      {previewData.headers.map((header, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {header || `Columna ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview mapped data */}
            <div className="rounded-lg border p-4">
              <h4 className="mb-3 font-medium">Vista previa del mapeo (primera fila):</h4>
              <div className="grid gap-2 text-sm">
                {columns.map((col) => {
                  const idx = columnMapping[col.key];
                  const value = idx !== undefined && previewData.rows[0] 
                    ? String((previewData.rows[0] as unknown[])[idx] ?? "-")
                    : "-";
                  return (
                    <div key={col.key} className="flex">
                      <span className="w-40 font-medium">{col.label}:</span>
                      <span className="text-muted-foreground">{value}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("preview")}>
                Volver
              </Button>
              <Button onClick={handleImport} disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Importar {previewData.totalRows} registros
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Result */}
      {step === "result" && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.imported > 0 ? (
                <CheckCircle2 className="h-5 w-5 text-accent" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              Resultado de la Importación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-accent">{result.imported}</div>
                  <p className="text-sm text-muted-foreground">Importados correctamente</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold">{result.total}</div>
                  <p className="text-sm text-muted-foreground">Total en archivo</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-destructive">
                    {result.total - result.imported}
                  </div>
                  <p className="text-sm text-muted-foreground">Con errores</p>
                </CardContent>
              </Card>
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <h4 className="flex items-center gap-2 font-medium text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Errores encontrados:
                </h4>
                <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
                {result.hasMoreErrors && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    ... y más errores
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={reset}>
                Importar otro archivo
              </Button>
              <Button onClick={() => window.location.href = "/dashboard/materiales"}>
                Ver Materiales
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
