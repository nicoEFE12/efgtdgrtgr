import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // 'materials' | 'settings' | 'preview'
    const columnMapping = formData.get("columnMapping") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó archivo" },
        { status: 400 }
      );
    }

    // Read the Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    
    // Get sheet names
    const sheetNames = workbook.SheetNames;
    
    // Get requested sheet name (or use first sheet)
    const requestedSheet = formData.get("sheetName") as string;
    const sheetName = requestedSheet && sheetNames.includes(requestedSheet) 
      ? requestedSheet 
      : sheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get the range of the worksheet to understand actual data bounds
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Read ALL raw data (header: 1 = array of arrays, no key inference)
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, 
      defval: "",
      range: range,
      raw: false
    }) as unknown[][];

    // Determine max column count across all rows
    const maxCols = rawData.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0);
    
    // Normalize all rows to same length
    const allRows = rawData.map(row => {
      const arr = Array.isArray(row) ? [...row] : [];
      while (arr.length < maxCols) arr.push("");
      return arr.slice(0, maxCols);
    });

    // The first row is treated as headers for preview purposes
    const rawHeaders = (allRows[0] || []) as string[];
    const headers = rawHeaders.map((h, index) => {
      const cleaned = String(h || "").trim();
      return cleaned || `Columna ${index + 1}`;
    });

    // Data rows = everything after the first row (for preview)
    const dataRows = allRows.slice(1).filter(row => 
      row.some(cell => cell !== null && cell !== undefined && cell !== "")
    );

    // If preview mode, return data for the UI
    if (type === "preview") {
      const sheetsInfo = sheetNames.map(name => {
        const ws = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
        const rowCount = data.slice(1).filter(row => 
          Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && cell !== "")
        ).length;
        return { name, rowCount };
      });
      
      return NextResponse.json({
        success: true,
        sheetNames,
        sheetsInfo,
        currentSheet: sheetName,
        headers,
        rows: dataRows,
        totalRows: dataRows.length,
      });
    }

    // ── Import mode: use headerRow / dataStartRow / dataEndRow from the client ──
    const mapping = columnMapping ? JSON.parse(columnMapping) : null;
    const clientHeaderRow = parseInt(formData.get("headerRow") as string) || 0;
    const clientDataStart = parseInt(formData.get("dataStartRow") as string) || 1;
    const clientDataEndRaw = formData.get("dataEndRow") as string;
    const clientDataEnd = clientDataEndRaw ? parseInt(clientDataEndRaw) : null;

    // allRows is 0-indexed matching the client's absoluteIdx
    // headerRow index is just for reference; data is from dataStartRow to dataEndRow
    const endIdx = clientDataEnd !== null ? clientDataEnd + 1 : allRows.length;
    const importRows = allRows.slice(clientDataStart, endIdx).filter(row =>
      row.some(cell => cell !== null && cell !== undefined && cell !== "")
    );

    if (type === "materials" && mapping) {
      return await importMaterials(importRows, headers, mapping);
    }

    if (type === "settings" && mapping) {
      return await importSettings(importRows, headers, mapping);
    }

    return NextResponse.json({ error: "Tipo de importación no válido" }, { status: 400 });

  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Error al procesar el archivo Excel" },
      { status: 500 }
    );
  }
}

async function importMaterials(
  rows: unknown[][],
  headers: string[],
  mapping: Record<string, number>
) {
  const sql = getDb();
  let imported = 0;
  let errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const nombre = mapping.nombre !== undefined ? String(row[mapping.nombre] || "").trim() : "";
      const precio = mapping.precio !== undefined ? parseFloat(String(row[mapping.precio]).replace(/[,$]/g, "")) || 0 : 0;
      const unidad = mapping.unidad !== undefined ? String(row[mapping.unidad] || "unidad").trim() : "unidad";
      const proveedor = mapping.proveedor !== undefined ? String(row[mapping.proveedor] || "").trim() || null : null;
      const codigo = mapping.codigo !== undefined ? String(row[mapping.codigo] || "").trim() || null : null;
      const categoria = mapping.categoria !== undefined ? String(row[mapping.categoria] || "").trim() || null : null;

      if (!nombre) {
        errors.push(`Fila ${i + 2}: Nombre vacío, omitida`);
        continue;
      }

      await sql`
        INSERT INTO materials (nombre, precio_unitario, unidad, proveedor, codigo_referencia, categoria)
        VALUES (${nombre}, ${precio}, ${unidad}, ${proveedor}, ${codigo}, ${categoria})
      `;
      imported++;
    } catch (err) {
      errors.push(`Fila ${i + 2}: ${err instanceof Error ? err.message : "Error desconocido"}`);
    }
  }

  return NextResponse.json({
    success: true,
    imported,
    total: rows.length,
    errors: errors.slice(0, 10), // Limit error messages
    hasMoreErrors: errors.length > 10,
  });
}

async function importSettings(
  rows: unknown[][],
  headers: string[],
  mapping: Record<string, number>
) {
  const sql = getDb();
  let imported = 0;
  let errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const key = mapping.key !== undefined ? String(row[mapping.key] || "").trim().toLowerCase().replace(/\s+/g, "_") : "";
      const value = mapping.value !== undefined ? String(row[mapping.value] || "").trim() : "";
      const description = mapping.description !== undefined ? String(row[mapping.description] || "").trim() : "";

      if (!key || !value) {
        errors.push(`Fila ${i + 2}: Clave o valor vacío, omitida`);
        continue;
      }

      await sql`
        INSERT INTO global_settings (key, value, description)
        VALUES (${key}, ${value}, ${description})
        ON CONFLICT (key) DO UPDATE SET 
          value = ${value},
          description = ${description},
          updated_at = NOW()
      `;
      imported++;
    } catch (err) {
      errors.push(`Fila ${i + 2}: ${err instanceof Error ? err.message : "Error desconocido"}`);
    }
  }

  return NextResponse.json({
    success: true,
    imported,
    total: rows.length,
    errors: errors.slice(0, 10),
    hasMoreErrors: errors.length > 10,
  });
}
