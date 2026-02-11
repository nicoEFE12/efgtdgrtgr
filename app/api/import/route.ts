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
    
    // Get data from first sheet (or specified sheet)
    const sheetName = sheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
    
    // Get headers (first row)
    const headers = rawData[0] as string[];
    
    // Get data rows
    const rows = rawData.slice(1).filter(row => 
      Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && cell !== "")
    );

    // If preview mode, return data for preview
    if (type === "preview") {
      return NextResponse.json({
        success: true,
        sheetNames,
        headers,
        rows: rows.slice(0, 50), // Limit preview to 50 rows
        totalRows: rows.length,
      });
    }

    // Parse column mapping
    const mapping = columnMapping ? JSON.parse(columnMapping) : null;

    if (type === "materials" && mapping) {
      return await importMaterials(rows, headers, mapping);
    }

    if (type === "settings" && mapping) {
      return await importSettings(rows, headers, mapping);
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
