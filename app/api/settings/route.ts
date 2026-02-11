import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sql = getDb();
  const settings = await sql`SELECT * FROM global_settings ORDER BY key`;

  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }

  return NextResponse.json({ settings: map });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const sql = getDb();

    for (const [key, value] of Object.entries(body)) {
      await sql`
        INSERT INTO global_settings (key, value, updated_at)
        VALUES (${key}, ${String(value)}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = ${String(value)}, updated_at = NOW()
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Error al actualizar la configuracion" },
      { status: 500 }
    );
  }
}
