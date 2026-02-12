"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Layers,
  MousePointerClick,
  X,
  Eye,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";

type ImportType = "materials" | "settings";

interface SheetInfo {
  name: string;
  rowCount: number;
}

interface PreviewData {
  sheetNames: string[];
  sheetsInfo: SheetInfo[];
  currentSheet: string;
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

// Field definitions with colors for each import type
const MATERIAL_FIELDS = [
  { key: "nombre", label: "Nombre", color: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200", headerColor: "bg-blue-500", required: true },
  { key: "precio", label: "Precio Unit.", color: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200", headerColor: "bg-green-500", required: true },
  { key: "unidad", label: "Unidad", color: "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200", headerColor: "bg-purple-500", required: false },
  { key: "proveedor", label: "Proveedor", color: "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200", headerColor: "bg-orange-500", required: false },
  { key: "codigo", label: "Código", color: "bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-200", headerColor: "bg-pink-500", required: false },
  { key: "categoria", label: "Categoría", color: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200", headerColor: "bg-yellow-500", required: false },
];

const SETTINGS_FIELDS = [
  { key: "key", label: "Clave", color: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200", headerColor: "bg-blue-500", required: true },
  { key: "value", label: "Valor", color: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200", headerColor: "bg-green-500", required: true },
  { key: "description", label: "Descripción", color: "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200", headerColor: "bg-purple-500", required: false },
];

export default function ImportPage() {
  const [step, setStep] = useState<"upload" | "configure" | "result">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<ImportType>("materials");
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [previewPage, setPreviewPage] = useState(0);
  const [headerRow, setHeaderRow] = useState(0);
  const [dataStartRow, setDataStartRow] = useState(1);
  const [dataEndRow, setDataEndRow] = useState<number | null>(null);
  const [openPopoverCol, setOpenPopoverCol] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ROWS_PER_PAGE = 20;
  const fields = importType === "materials" ? MATERIAL_FIELDS : SETTINGS_FIELDS;

  // All raw rows: header row as index 0, then data rows from the API
  const allRawRows = useMemo(() => {
    if (!previewData) return [];
    return [previewData.headers, ...previewData.rows];
  }, [previewData]);

  // The column count (max across all rows)
  const colCount = useMemo(() => {
    if (!allRawRows.length) return 0;
    return Math.max(...allRawRows.map(r => (Array.isArray(r) ? r.length : 0)));
  }, [allRawRows]);

  // Effective header labels based on headerRow selection
  const effectiveHeaders = useMemo(() => {
    if (!allRawRows.length || !allRawRows[headerRow]) return [];
    const row = allRawRows[headerRow] as unknown[];
    const headers: string[] = [];
    for (let i = 0; i < colCount; i++) {
      const cell = row[i];
      const val = cell !== null && cell !== undefined ? String(cell).trim() : "";
      headers.push(val || `Col ${i + 1}`);
    }
    return headers;
  }, [allRawRows, headerRow, colCount]);

  // Data rows based on range selections
  const effectiveDataRows = useMemo(() => {
    if (!allRawRows.length) return [];
    const end = dataEndRow !== null ? dataEndRow + 1 : allRawRows.length;
    return allRawRows.slice(dataStartRow, end);
  }, [allRawRows, dataStartRow, dataEndRow]);

  // Pagination for the table display
  const totalDisplayRows = allRawRows.length;
  const totalPages = Math.ceil(totalDisplayRows / ROWS_PER_PAGE);
  const displayRows = useMemo(() => {
    const start = previewPage * ROWS_PER_PAGE;
    return allRawRows.slice(start, start + ROWS_PER_PAGE);
  }, [allRawRows, previewPage]);

  // Reverse mapping: colIndex -> fieldKey
  const reverseMapping = useMemo(() => {
    const rev: Record<number, string> = {};
    for (const [key, colIdx] of Object.entries(columnMapping)) {
      rev[colIdx] = key;
    }
    return rev;
  }, [columnMapping]);

  const getFieldForCol = (colIndex: number) => {
    const fieldKey = reverseMapping[colIndex];
    if (!fieldKey) return null;
    return fields.find(f => f.key === fieldKey) || null;
  };

  // Load a specific sheet
  const loadSheetData = useCallback(async (sheetName: string) => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "preview");
      formData.append("sheetName", sheetName);

      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();

      if (data.success) {
        setPreviewData(data);
        setSelectedSheet(data.currentSheet);
        setPreviewPage(0);
        setHeaderRow(0);
        setDataStartRow(1);
        setDataEndRow(null);
        setColumnMapping({});
      } else {
        toast.error(data.error || "Error al leer la hoja");
      }
    } catch {
      toast.error("Error al procesar la hoja");
    } finally {
      setLoading(false);
    }
  }, [file]);

  // Upload file
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setLoading(true);
    setPreviewPage(0);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", "preview");

      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();

      if (data.success) {
        setPreviewData(data);
        setSelectedSheet(data.currentSheet);
        setHeaderRow(0);
        setDataStartRow(1);
        setDataEndRow(null);
        setColumnMapping({});
        setStep("configure");
      } else {
        toast.error(data.error || "Error al leer el archivo");
      }
    } catch {
      toast.error("Error al procesar el archivo");
    } finally {
      setLoading(false);
    }
  }, []);

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
    if (selectedFile) handleFileSelect(selectedFile);
  };

  // Assign a field to a column
  const assignField = (colIndex: number, fieldKey: string) => {
    setColumnMapping(prev => {
      const newMapping = { ...prev };
      // Remove any previous field assignment to this column
      for (const [k, v] of Object.entries(newMapping)) {
        if (v === colIndex) delete newMapping[k];
      }
      if (fieldKey && fieldKey !== "none") {
        // Remove old column for this field (if reassigning)
        delete newMapping[fieldKey];
        newMapping[fieldKey] = colIndex;
      }
      return newMapping;
    });
    setOpenPopoverCol(null);
  };

  // Remove assignment from column
  const removeAssignment = (colIndex: number) => {
    setColumnMapping(prev => {
      const newMapping = { ...prev };
      for (const [k, v] of Object.entries(newMapping)) {
        if (v === colIndex) {
          delete newMapping[k];
          break;
        }
      }
      return newMapping;
    });
  };

  // Handle import
  const handleImport = async () => {
    if (!file || !previewData) return;

    const requiredFields = fields.filter(f => f.required);
    const missing = requiredFields.filter(f => columnMapping[f.key] === undefined);

    if (missing.length > 0) {
      toast.error(`Faltan campos requeridos: ${missing.map(f => f.label).join(", ")}`);
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", importType);
      formData.append("columnMapping", JSON.stringify(columnMapping));
      formData.append("sheetName", selectedSheet);
      formData.append("headerRow", headerRow.toString());
      formData.append("dataStartRow", dataStartRow.toString());
      if (dataEndRow !== null) {
        formData.append("dataEndRow", dataEndRow.toString());
      }

      const res = await fetch("/api/import", { method: "POST", body: formData });
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
    setSelectedSheet("");
    setPreviewPage(0);
    setHeaderRow(0);
    setDataStartRow(1);
    setDataEndRow(null);
  };

  const isDataRow = (absoluteRowIdx: number) => {
    if (absoluteRowIdx < dataStartRow) return false;
    if (dataEndRow !== null && absoluteRowIdx > dataEndRow) return false;
    return true;
  };

  const isHeaderRowFn = (absoluteRowIdx: number) => absoluteRowIdx === headerRow;

  const importableRowCount = effectiveDataRows.filter(row => {
    const arr = Array.isArray(row) ? row : [];
    return arr.some(cell => cell !== null && cell !== undefined && cell !== "");
  }).length;

  const hasRequiredFields = !fields.filter(f => f.required).some(f => columnMapping[f.key] === undefined);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar Datos"
        description="Importa materiales o configuraciones desde archivos Excel"
      />

      {/* Steps indicator */}
      <div className="flex items-center justify-center gap-2">
        {[
          { key: "upload", label: "Subir" },
          { key: "configure", label: "Configurar" },
          { key: "result", label: "Resultado" },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                step === s.key
                  ? "bg-primary text-primary-foreground"
                  : ["upload", "configure", "result"].indexOf(step) > i
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <span className={`ml-1.5 text-xs font-medium hidden sm:inline ${step === s.key ? "text-primary" : "text-muted-foreground"}`}>
              {s.label}
            </span>
            {i < 2 && <ArrowRight className="mx-3 h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* ─── Step 1: Upload ─── */}
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
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors cursor-pointer ${
                loading ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => !loading && fileInputRef.current?.click()}
            >
              {loading ? (
                <RefreshCw className="h-12 w-12 animate-spin text-primary" />
              ) : (
                <>
                  <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-lg font-medium">Arrastra tu archivo Excel aquí</p>
                  <p className="mt-1 text-sm text-muted-foreground">o haz clic para seleccionar (.xlsx, .xls)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Step 2: Configure (Preview + interactive mapping in one step) ─── */}
      {step === "configure" && previewData && (
        <div className="space-y-4">
          {/* Top config bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                {/* Sheet selector */}
                {previewData.sheetNames.length > 1 && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Layers className="h-4 w-4 text-primary" />
                      Hojas:
                    </div>
                    {previewData.sheetsInfo?.map((sheet) => (
                      <Button
                        key={sheet.name}
                        variant={selectedSheet === sheet.name ? "default" : "outline"}
                        size="sm"
                        onClick={() => loadSheetData(sheet.name)}
                        disabled={loading}
                      >
                        {loading && selectedSheet === sheet.name ? (
                          <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <FileSpreadsheet className="h-3 w-3 mr-1" />
                        )}
                        {sheet.name}
                        <Badge variant="secondary" className="ml-1 text-xs">{sheet.rowCount}</Badge>
                      </Button>
                    ))}
                  </div>
                )}

                {/* Row range configuration */}
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Fila de encabezados</Label>
                    <Input
                      type="number"
                      min={1}
                      max={allRawRows.length}
                      value={headerRow + 1}
                      onChange={(e) => {
                        const v = Math.max(0, parseInt(e.target.value || "1") - 1);
                        setHeaderRow(v);
                        if (dataStartRow <= v) setDataStartRow(v + 1);
                      }}
                      className="w-24 h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Datos desde fila</Label>
                    <Input
                      type="number"
                      min={headerRow + 2}
                      max={allRawRows.length}
                      value={dataStartRow + 1}
                      onChange={(e) => setDataStartRow(Math.max(headerRow + 1, parseInt(e.target.value || "1") - 1))}
                      className="w-24 h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Hasta fila (vacío = todas)</Label>
                    <Input
                      type="number"
                      min={dataStartRow + 1}
                      max={allRawRows.length}
                      value={dataEndRow !== null ? dataEndRow + 1 : ""}
                      placeholder="Todas"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          setDataEndRow(null);
                        } else {
                          setDataEndRow(Math.max(dataStartRow, parseInt(val) - 1));
                        }
                      }}
                      className="w-28 h-9"
                    />
                  </div>
                  <Badge variant="outline" className="text-sm px-3 py-1.5 ml-auto">
                    {importableRowCount} filas a importar
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Field assignment instructions + badges */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm font-medium shrink-0 pt-1">
                  <MousePointerClick className="h-4 w-4 text-primary" />
                  Hacé clic en los encabezados de columna para asignar:
                </div>
                <div className="flex flex-wrap gap-2">
                  {fields.map((field) => {
                    const isAssigned = columnMapping[field.key] !== undefined;
                    const assignedColName = isAssigned ? effectiveHeaders[columnMapping[field.key]] : null;
                    return (
                      <div
                        key={field.key}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                          isAssigned
                            ? `${field.color} border-current/30`
                            : "bg-muted text-muted-foreground border-dashed border-muted-foreground/40"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isAssigned ? field.headerColor : "bg-muted-foreground/40"}`} />
                        {field.label}{field.required ? " *" : ""}
                        {isAssigned && (
                          <>
                            <span className="text-[10px] opacity-70 max-w-[100px] truncate">← {assignedColName}</span>
                            <button
                              onClick={() => {
                                setColumnMapping(prev => {
                                  const n = { ...prev };
                                  delete n[field.key];
                                  return n;
                                });
                              }}
                              className="ml-0.5 hover:opacity-100 opacity-60"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactive table */}
          <Card>
            <CardContent className="pt-6 px-2 sm:px-6">
              <div className="overflow-auto rounded-lg border max-h-[500px]">
                <Table>
                  <TableHeader className="sticky top-0 z-20">
                    <TableRow className="bg-muted/80 backdrop-blur">
                      <TableHead className="w-14 text-center text-xs font-bold sticky left-0 bg-muted/80 backdrop-blur z-30">Fila</TableHead>
                      {effectiveHeaders.map((header, colIdx) => {
                        const field = getFieldForCol(colIdx);
                        return (
                          <TableHead key={colIdx} className="p-0 min-w-[130px]">
                            <Popover
                              open={openPopoverCol === colIdx}
                              onOpenChange={(open) => setOpenPopoverCol(open ? colIdx : null)}
                            >
                              <PopoverTrigger asChild>
                                <button
                                  className={`w-full px-3 py-2.5 text-left text-xs font-semibold transition-all hover:bg-primary/10 flex flex-col gap-0.5 border-b-2 ${
                                    field ? `${field.color} border-current/50` : "border-transparent"
                                  }`}
                                >
                                  <span className="truncate max-w-[180px] block">{header}</span>
                                  {field ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase">
                                      <span className={`w-1.5 h-1.5 rounded-full ${field.headerColor}`} />
                                      {field.label}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground/50 italic">clic para asignar</span>
                                  )}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-52 p-2" align="start">
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Asignar como:</p>
                                  {fields.map((f) => {
                                    const currentlyAssignedCol = columnMapping[f.key];
                                    const isThisCol = currentlyAssignedCol === colIdx;
                                    return (
                                      <button
                                        key={f.key}
                                        onClick={() => assignField(colIdx, f.key)}
                                        className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors hover:bg-accent ${
                                          isThisCol ? f.color : ""
                                        }`}
                                      >
                                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${f.headerColor}`} />
                                        {f.label}{f.required ? " *" : ""}
                                        {currentlyAssignedCol !== undefined && !isThisCol && (
                                          <span className="text-[10px] text-muted-foreground ml-auto">Col {currentlyAssignedCol + 1}</span>
                                        )}
                                        {isThisCol && (
                                          <CheckCircle2 className="h-3 w-3 ml-auto text-primary" />
                                        )}
                                      </button>
                                    );
                                  })}
                                  <div className="border-t mt-1 pt-1">
                                    <button
                                      onClick={() => { removeAssignment(colIdx); setOpenPopoverCol(null); }}
                                      className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                                    >
                                      <X className="h-3 w-3" />
                                      No importar esta columna
                                    </button>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayRows.map((row, displayIdx) => {
                      const absoluteIdx = previewPage * ROWS_PER_PAGE + displayIdx;
                      const rowArr = Array.isArray(row) ? row : [];
                      const isHdr = isHeaderRowFn(absoluteIdx);
                      const isData = isDataRow(absoluteIdx);
                      const isOutside = !isHdr && !isData;

                      return (
                        <TableRow
                          key={absoluteIdx}
                          className={`transition-colors ${
                            isHdr
                              ? "bg-primary/10 font-bold"
                              : isOutside
                              ? "opacity-30"
                              : absoluteIdx % 2 === 0
                              ? "hover:bg-muted/30"
                              : "bg-muted/10 hover:bg-muted/30"
                          }`}
                        >
                          <TableCell
                            className={`text-center text-xs font-mono sticky left-0 z-10 border-r ${
                              isHdr
                                ? "bg-primary/10 text-primary font-bold"
                                : isOutside
                                ? "bg-background text-muted-foreground/40"
                                : "bg-background text-muted-foreground"
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              {absoluteIdx + 1}
                              {isHdr && (
                                <Badge variant="outline" className="text-[8px] px-1 py-0 leading-tight border-primary text-primary">H</Badge>
                              )}
                            </div>
                          </TableCell>
                          {effectiveHeaders.map((_, colIdx) => {
                            const cellValue = colIdx < rowArr.length ? rowArr[colIdx] : undefined;
                            const display = cellValue !== null && cellValue !== undefined ? String(cellValue) : "";
                            const field = getFieldForCol(colIdx);

                            return (
                              <TableCell
                                key={colIdx}
                                className={`max-w-[200px] truncate text-xs ${
                                  field && isData
                                    ? `${field.color} bg-opacity-20`
                                    : ""
                                } ${isHdr ? "font-bold" : ""}`}
                                title={display}
                              >
                                {display || <span className="text-muted-foreground/20">—</span>}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground">
                    Filas {previewPage * ROWS_PER_PAGE + 1}–{Math.min((previewPage + 1) * ROWS_PER_PAGE, totalDisplayRows)} de {totalDisplayRows}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPreviewPage(p => Math.max(0, p - 1))} disabled={previewPage === 0}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">{previewPage + 1} / {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setPreviewPage(p => p + 1)} disabled={previewPage + 1 >= totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottom: preview + import */}
          <Card>
            <CardContent className="pt-6">
              {/* Preview first mapped row */}
              {effectiveDataRows.length > 0 && Object.keys(columnMapping).length > 0 && (
                <div className="mb-4 rounded-lg border bg-muted/20 p-4">
                  <h4 className="flex items-center gap-2 text-sm font-medium mb-3">
                    <Eye className="h-4 w-4 text-primary" />
                    Vista previa del primer registro:
                  </h4>
                  <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                    {fields.map((field) => {
                      const colIdx = columnMapping[field.key];
                      const firstRow = effectiveDataRows[0] as unknown[];
                      const value = colIdx !== undefined && firstRow
                        ? String(firstRow[colIdx] ?? "—")
                        : "—";
                      return (
                        <div key={field.key} className="flex items-center gap-2 text-sm">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${field.headerColor}`} />
                          <span className="font-medium text-muted-foreground shrink-0">{field.label}:</span>
                          <span className={`truncate ${colIdx !== undefined ? "" : "text-muted-foreground/50 italic"}`}>
                            {value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center gap-4">
                <Button variant="outline" onClick={reset}>Cancelar</Button>
                <div className="flex items-center gap-3">
                  {!hasRequiredFields && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Asigná los campos obligatorios (*)
                    </p>
                  )}
                  <Button
                    onClick={handleImport}
                    disabled={loading || !hasRequiredFields || importableRowCount === 0}
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Importar {importableRowCount} registros
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Step 3: Result ─── */}
      {step === "result" && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.imported > 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
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
                  <div className="text-3xl font-bold text-green-600">{result.imported}</div>
                  <p className="text-sm text-muted-foreground">Importados correctamente</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold">{result.total}</div>
                  <p className="text-sm text-muted-foreground">Total procesados</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-destructive">{result.total - result.imported}</div>
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
                  <p className="mt-2 text-sm text-muted-foreground">... y más errores</p>
                )}
              </div>
            )}

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={reset}>Importar otro archivo</Button>
              <Button onClick={() => window.location.href = "/dashboard/materiales"}>Ver Materiales</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
