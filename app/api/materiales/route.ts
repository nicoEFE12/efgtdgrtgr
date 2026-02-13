import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const sql = getDb();

  let materials;
  if (search) {
    const term = `%${search}%`;
    materials = await sql`
      SELECT * FROM materials 
      WHERE nombre ILIKE ${term} OR categoria ILIKE ${term} OR proveedor ILIKE ${term}
      ORDER BY categoria, nombre
    `;
  } else {
    materials = await sql`SELECT * FROM materials ORDER BY categoria, nombre`;
  }

  return NextResponse.json({ materials });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const sql = getDb();

    const result = await sql`
      INSERT INTO materials (nombre, precio_unitario, unidad, proveedor, codigo_referencia, categoria)
      VALUES (${body.nombre}, ${body.precio_unitario}, ${body.unidad}, 
              ${body.proveedor || null}, ${body.codigo_referencia || null}, ${body.categoria || null})
      RETURNING *
    `;

    return NextResponse.json({ material: result[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating material:", error);
    return NextResponse.json(
      { error: "Error al crear el material" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const sql = getDb();

    // Bulk update by percentage
    if (body.bulk_percentage !== undefined) {
      const factor = 1 + body.bulk_percentage / 100;
      const ids = body.material_ids as number[];

      if (ids && ids.length > 0) {
        await sql`
          UPDATE materials 
          SET precio_unitario = ROUND(precio_unitario * ${factor}, 2),
              updated_at = NOW()
          WHERE id = ANY(${ids})
        `;
      } else {
        await sql`
          UPDATE materials 
          SET precio_unitario = ROUND(precio_unitario * ${factor}, 2),
              updated_at = NOW()
        `;
      }

      return NextResponse.json({ ok: true });
    }

    // Single material update
    const result = await sql`
      UPDATE materials SET
        nombre = ${body.nombre},
        precio_unitario = ${body.precio_unitario},
        unidad = ${body.unidad},
        proveedor = ${body.proveedor || null},
        codigo_referencia = ${body.codigo_referencia || null},
        categoria = ${body.categoria || null},
        updated_at = NOW()
      WHERE id = ${body.id}
      RETURNING *
    `;

    return NextResponse.json({ material: result[0] });
  } catch (error) {
    console.error("Error updating material:", error);
    return NextResponse.json(
      { error: "Error al actualizar" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    const sql = getDb();

    // Remove from service_type_materials first
    await sql`DELETE FROM service_type_materials WHERE material_id = ${id}`;
    await sql`DELETE FROM materials WHERE id = ${id}`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting material:", error);
    return NextResponse.json(
      { error: "Error al eliminar material" },
      { status: 500 }
    );
  }
}
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const sql = getDb();

    switch (body.action) {
      case "rename_provider":
        await sql`
          UPDATE materials 
          SET proveedor = ${body.new_name}
          WHERE proveedor = ${body.old_name}
        `;
        return NextResponse.json({ ok: true });

      case "remove_provider":
        await sql`
          UPDATE materials 
          SET proveedor = NULL
          WHERE proveedor = ${body.provider_name}
        `;
        return NextResponse.json({ ok: true });

      case "rename_category":
        await sql`
          UPDATE materials 
          SET categoria = ${body.new_name}
          WHERE categoria = ${body.old_name}
        `;
        return NextResponse.json({ ok: true });

      case "remove_category":
        await sql`
          UPDATE materials 
          SET categoria = NULL
          WHERE categoria = ${body.category_name}
        `;
        return NextResponse.json({ ok: true });

      default:
        return NextResponse.json(
          { error: "Acción no válida" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in PATCH:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
