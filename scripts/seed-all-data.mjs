/**
 * Seed script — loads realistic test data via the app's API.
 * 
 * Usage:
 *   node scripts/seed-all-data.mjs
 * 
 * Prerequisites: dev server running on localhost:3000 and valid session cookie.
 * The script logs in automatically to get a session cookie.
 */

const BASE = "http://localhost:3000";
let COOKIE = "";

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@amsoluciones.com", password: "admin123" }),
    redirect: "manual",
  });
  const setCookie = res.headers.get("set-cookie") || "";
  COOKIE = setCookie.split(";")[0]; // session_token=...
  if (!COOKIE.includes("session_token")) {
    console.error("❌ Login failed. Ensure admin user exists.");
    process.exit(1);
  }
  console.log("✅ Logged in");
}

async function api(method, path, body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json", Cookie: COOKIE },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    console.error(`  ⚠ ${method} ${path} → ${res.status}`, typeof data === 'string' ? data.slice(0, 200) : data.error || '');
  }
  return { ok: res.ok, status: res.status, data };
}

// ═══════════════════════════════════════════════
// 0. RUN MIGRATION 007 (add unidad column)
// ═══════════════════════════════════════════════
async function runMigration007() {
  console.log("\n🔧 Running migration 007 (add unidad column)...");
  // We can't run raw SQL through the API, but the column may already exist.
  // The cotizador page sends 'unidad' in items—if the column doesn't exist, saves will fail.
  // We'll test by creating a dummy quotation later. For now, skip and rely on manual migration.
  console.log("  ℹ Ensure you've run: scripts/007-add-unidad-to-quotation-items.sql on Neon");
}

// ═══════════════════════════════════════════════
// 1. SETTINGS / CONFIGURACIÓN
// ═══════════════════════════════════════════════
async function seedSettings() {
  console.log("\n⚙️  Seeding settings...");
  const settings = {
    costo_fijo_mensual: "1500000",
    dias_laborables_mes: "22",
    margen_ganancia: "25",
    porcentaje_cargas_sociales: "23",
    valor_dia_empleados: "95000",
    valor_dia_am: "160000",
    precio_combustible_tanque: "55000",
    tanques_por_50m2: "2.5",
    porcentaje_ahorro_negocio: "5",
    sueldo_minimo_mensual_am: "4500000",
    dias_productivos_ganancia: "20",
    ganancia_minima_am_dia: "225000",
    default_margin_percent: "25",
  };
  const r = await api("PUT", "/api/settings", settings);
  console.log(r.ok ? "  ✅ Settings loaded" : "  ❌ Settings failed");
}

// ═══════════════════════════════════════════════
// 2. UPDATE MATERIAL PRICES (find zero/null prices)
// ═══════════════════════════════════════════════
const MATERIAL_PRICES_ARS = {
  // Construcción general — precios Febrero 2026, pesos argentinos
  "cemite": 12000,
  "cemento": 12000,
  "cemento portland": 12000,
  "arena": 35000,     // m3
  "arena gruesa": 38000,
  "arena fina": 35000,
  "cal": 7500,        // bolsa 25kg
  "cal hidratada": 7500,
  "ladrillo": 180,    // unidad
  "ladrillo comun": 180,
  "ladrillo hueco": 450,
  "ladrillo hueco 8": 380,
  "ladrillo hueco 12": 480,
  "ladrillo hueco 18": 580,
  "ladrillo ceramico": 280,
  "block": 650,
  "bloque": 650,
  "hierro": 4500,      // barra 6m ø8
  "hierro 6": 3200,
  "hierro 8": 4500,
  "hierro 10": 6800,
  "hierro 12": 9500,
  "alambre": 4500,     // kg
  "clavos": 3800,
  "membrana": 18000,   // rollo 10m2
  "membrana liquida": 32000,
  "chapa": 45000,      // por unidad
  "tirante": 28000,
  "madera": 28000,
  "caño": 8500,
  "caño pvc": 8500,
  "caño 110": 18000,
  "caño 63": 12000,
  "caño 50": 10000,
  "caño 40": 8500,
  "codo": 3200,
  "te": 4500,
  "llave de paso": 15000,
  "inodoro": 180000,
  "bidet": 150000,
  "lavatorio": 95000,
  "griferia": 85000,
  "ceramica": 18000,
  "ceramico": 18000,
  "porcelanato": 32000,
  "pegamento": 12500,
  "klaukol": 12500,
  "pastina": 8500,
  "pintura": 45000,    // lata 20L
  "pintura latex": 45000,
  "impermeabilizante": 35000,
  "cable": 3500,       // metro
  "cable 2.5": 3500,
  "cable 4": 5500,
  "llave termica": 18000,
  "disyuntor": 25000,
  "tablero electrico": 45000,
  "caja de luz": 8500,
  "tomacorriente": 6500,
  "interruptor": 6500,
  "fijador": 21000,
  "enduido": 16000,
  "yeso": 9500,
  "piedra": 42000,     // m3
  "cascote": 25000,
  "tosca": 22000,
  "ripio": 40000,      // m3
  "vigueta": 8500,
  "bovedilla": 3800,
  "malla electrosoldada": 35000,
  "estribos": 5500,
  "hidrófugo": 22000,
  "sika": 22000,
  "weber": 18000,
  "puerta": 120000,
  "puerta placa": 120000,
  "ventana": 180000,
  "vidrio": 25000,
  "masilla": 12000,
  "cinta papel": 4500,
  "durlock": 18000,    // placa
  "perfil": 8500,
  "tornillo": 2500,    // caja
  "clavo": 3800,
  "candado": 12000,
  "bisagra": 3500,
  "cerradura": 35000,
  "aislante termico": 15000,
  "isopor": 15000,
  "telgopor": 12000,
  "manguera": 3500,
  "tanque agua": 180000,
  "lija": 1500,
  "rodillo": 5500,
  "brocha": 3500,
};

async function fixMaterialPrices() {
  console.log("\n💰 Checking material prices...");
  const { data } = await api("GET", "/api/materiales");
  const materials = data?.materials || [];
  if (materials.length === 0) {
    console.log("  ℹ No materials in DB");
    return materials;
  }
  console.log(`  Found ${materials.length} materials`);

  let fixed = 0;
  for (const mat of materials) {
    const price = Number(mat.precio_unitario);
    if (price > 0) continue;

    // Try to find a matching price
    const nameLower = mat.nombre.toLowerCase().trim();
    let newPrice = null;

    // Direct match
    if (MATERIAL_PRICES_ARS[nameLower]) {
      newPrice = MATERIAL_PRICES_ARS[nameLower];
    } else {
      // Partial match
      for (const [key, val] of Object.entries(MATERIAL_PRICES_ARS)) {
        if (nameLower.includes(key) || key.includes(nameLower)) {
          newPrice = val;
          break;
        }
      }
    }

    if (!newPrice) {
      // Default fallback based on unit
      if (mat.unidad === "m3" || mat.unidad === "m³") newPrice = 35000;
      else if (mat.unidad === "m2" || mat.unidad === "m²") newPrice = 18000;
      else if (mat.unidad === "kg" || mat.unidad === "Kg") newPrice = 5000;
      else if (mat.unidad === "ml" || mat.unidad === "m") newPrice = 8000;
      else newPrice = 10000; // generic per unit
    }

    console.log(`  🔧 ${mat.nombre}: $0 → $${newPrice}`);
    await api("PUT", "/api/materiales", {
      id: mat.id,
      nombre: mat.nombre,
      precio_unitario: newPrice,
      unidad: mat.unidad,
      proveedor: mat.proveedor,
      codigo_referencia: mat.codigo_referencia,
      categoria: mat.categoria,
    });
    fixed++;
  }
  console.log(`  ✅ Fixed ${fixed} material prices`);

  // Re-fetch
  const { data: updated } = await api("GET", "/api/materiales");
  return updated?.materials || materials;
}

// ═══════════════════════════════════════════════
// 3. SERVICE TYPES (Tipos de Servicio)
// ═══════════════════════════════════════════════
async function seedServiceTypes(materials) {
  console.log("\n🔨 Seeding service types...");

  // Check existing service types to avoid duplicates by name
  const { data: existing } = await api("GET", "/api/service-types");
  const existingNames = new Set((existing?.serviceTypes || []).map(s => s.nombre.toLowerCase()));

  // Helper: find material ID by partial name match
  function findMat(keyword) {
    const kw = keyword.toLowerCase();
    return materials.find(m => m.nombre.toLowerCase().includes(kw));
  }

  const serviceTypesData = [
    {
      nombre: "Contrapiso",
      descripcion: "Contrapiso de cemento alisado sobre terreno natural",
      rendimiento_m2_dia: 15,
      costo_mano_obra_dia: 95000,
      incluye_cargas_sociales: false,
      porcentaje_cargas: 0,
      materiales_keywords: [
        { keyword: "cemento", cantidad_por_m2: 0.3 },
        { keyword: "arena", cantidad_por_m2: 0.06 },
        { keyword: "cascote", cantidad_por_m2: 0.05 },
      ],
    },
    {
      nombre: "Carpeta fina",
      descripcion: "Carpeta niveladora de terminación",
      rendimiento_m2_dia: 20,
      costo_mano_obra_dia: 95000,
      incluye_cargas_sociales: false,
      porcentaje_cargas: 0,
      materiales_keywords: [
        { keyword: "cemento", cantidad_por_m2: 0.15 },
        { keyword: "arena fina", cantidad_por_m2: 0.03 },
      ],
    },
    {
      nombre: "Mampostería ladrillo hueco 12",
      descripcion: "Pared de ladrillo hueco de 12cm con mezcla",
      rendimiento_m2_dia: 8,
      costo_mano_obra_dia: 95000,
      incluye_cargas_sociales: false,
      porcentaje_cargas: 0,
      materiales_keywords: [
        { keyword: "ladrillo hueco 12", cantidad_por_m2: 16 },
        { keyword: "cemento", cantidad_por_m2: 0.16 },
        { keyword: "cal", cantidad_por_m2: 0.25 },
        { keyword: "arena", cantidad_por_m2: 0.03 },
      ],
    },
    {
      nombre: "Mampostería ladrillo hueco 18",
      descripcion: "Pared de ladrillo hueco de 18cm con mezcla",
      rendimiento_m2_dia: 6,
      costo_mano_obra_dia: 95000,
      incluye_cargas_sociales: false,
      porcentaje_cargas: 0,
      materiales_keywords: [
        { keyword: "ladrillo hueco 18", cantidad_por_m2: 16 },
        { keyword: "cemento", cantidad_por_m2: 0.2 },
        { keyword: "cal", cantidad_por_m2: 0.3 },
        { keyword: "arena", cantidad_por_m2: 0.04 },
      ],
    },
    {
      nombre: "Mampostería ladrillo común",
      descripcion: "Pared de ladrillo macizo de 15cm",
      rendimiento_m2_dia: 5,
      costo_mano_obra_dia: 95000,
      incluye_cargas_sociales: false,
      porcentaje_cargas: 0,
      materiales_keywords: [
        { keyword: "ladrillo comun", cantidad_por_m2: 64 },
        { keyword: "cemento", cantidad_por_m2: 0.2 },
        { keyword: "cal", cantidad_por_m2: 0.35 },
        { keyword: "arena", cantidad_por_m2: 0.05 },
      ],
    },
    {
      nombre: "Revoque grueso",
      descripcion: "Revoque grueso a la cal",
      rendimiento_m2_dia: 12,
      costo_mano_obra_dia: 95000,
      incluye_cargas_sociales: false,
      porcentaje_cargas: 0,
      materiales_keywords: [
        { keyword: "cemento", cantidad_por_m2: 0.12 },
        { keyword: "cal", cantidad_por_m2: 0.2 },
        { keyword: "arena", cantidad_por_m2: 0.03 },
      ],
    },
    {
      nombre: "Revoque fino",
      descripcion: "Revoque fino de terminación",
      rendimiento_m2_dia: 10,
      costo_mano_obra_dia: 95000,
      incluye_cargas_sociales: false,
      porcentaje_cargas: 0,
      materiales_keywords: [
        { keyword: "cal", cantidad_por_m2: 0.15 },
        { keyword: "arena fina", cantidad_por_m2: 0.02 },
        { keyword: "cemento", cantidad_por_m2: 0.05 },
      ],
    },
    {
      nombre: "Colocación de cerámica piso",
      descripcion: "Colocación de cerámica o porcelanato en piso",
      rendimiento_m2_dia: 8,
      costo_mano_obra_dia: 95000,
      incluye_cargas_sociales: false,
      porcentaje_cargas: 0,
      materiales_keywords: [
        { keyword: "ceramica", cantidad_por_m2: 1.05 },
        { keyword: "pegamento", cantidad_por_m2: 0.2 },
        { keyword: "pastina", cantidad_por_m2: 0.1 },
      ],
    },
    {
      nombre: "Pintura interior",
      descripcion: "Pintura latex interior (2 manos + fijador)",
      rendimiento_m2_dia: 25,
      costo_mano_obra_dia: 95000,
      incluye_cargas_sociales: false,
      porcentaje_cargas: 0,
      materiales_keywords: [
        { keyword: "pintura", cantidad_por_m2: 0.015 },
        { keyword: "fijador", cantidad_por_m2: 0.008 },
      ],
    },
    {
      nombre: "Impermeabilización de techo",
      descripcion: "Membrana líquida (2 manos) sobre losa",
      rendimiento_m2_dia: 30,
      costo_mano_obra_dia: 95000,
      incluye_cargas_sociales: false,
      porcentaje_cargas: 0,
      materiales_keywords: [
        { keyword: "membrana liquida", cantidad_por_m2: 0.018 },
      ],
    },
    {
      nombre: "Losa vigueta y bovedilla",
      descripcion: "Losa alivianada con viguetas pretensadas",
      rendimiento_m2_dia: 5,
      costo_mano_obra_dia: 120000,
      incluye_cargas_sociales: false,
      porcentaje_cargas: 0,
      materiales_keywords: [
        { keyword: "vigueta", cantidad_por_m2: 3 },
        { keyword: "bovedilla", cantidad_por_m2: 6 },
        { keyword: "hierro 8", cantidad_por_m2: 0.5 },
        { keyword: "cemento", cantidad_por_m2: 0.2 },
        { keyword: "arena", cantidad_por_m2: 0.04 },
        { keyword: "malla", cantidad_por_m2: 0.1 },
      ],
    },
    {
      nombre: "Instalación eléctrica",
      descripcion: "Instalación eléctrica completa por m² (puntos, cables, tablero)",
      rendimiento_m2_dia: 6,
      costo_mano_obra_dia: 110000,
      incluye_cargas_sociales: false,
      porcentaje_cargas: 0,
      materiales_keywords: [
        { keyword: "cable 2.5", cantidad_por_m2: 3 },
        { keyword: "caja de luz", cantidad_por_m2: 0.15 },
        { keyword: "tomacorriente", cantidad_por_m2: 0.1 },
        { keyword: "interruptor", cantidad_por_m2: 0.08 },
        { keyword: "caño", cantidad_por_m2: 1.5 },
      ],
    },
  ];

  for (const st of serviceTypesData) {
    const mats = [];
    for (const mk of st.materiales_keywords) {
      const found = findMat(mk.keyword);
      if (found) {
        mats.push({ material_id: found.id, cantidad_por_m2: mk.cantidad_por_m2 });
      } else {
        console.log(`    ⚠ Material not found for "${mk.keyword}" in service type "${st.nombre}"`);
      }
    }

    if (existingNames.has(st.nombre.toLowerCase())) {
      console.log(`  ℹ Skipping existing: ${st.nombre}`);
      continue;
    }
    const r = await api("POST", "/api/service-types", {
      nombre: st.nombre,
      descripcion: st.descripcion,
      rendimiento_m2_dia: st.rendimiento_m2_dia,
      costo_mano_obra_dia: st.costo_mano_obra_dia,
      incluye_cargas_sociales: st.incluye_cargas_sociales,
      porcentaje_cargas: st.porcentaje_cargas,
      materiales: mats,
    });
    console.log(r.ok ? `  ✅ ${st.nombre} (${mats.length} materiales)` : `  ❌ ${st.nombre}`);
  }
}

// ═══════════════════════════════════════════════
// 4. CLIENTS
// ═══════════════════════════════════════════════
async function seedClients() {
  console.log("\n👥 Seeding clients...");

  const { data: existingClients } = await api("GET", "/api/clientes");
  const existingDni = new Set((existingClients?.clients || []).map(c => c.dni));

  const clients = [
    {
      apellido_nombre: "Gonzalez, Maria Laura",
      numero_contrato: "AM-2026-001",
      dni: "28456789",
      domicilio_legal: "Av. San Martin 1245, Resistencia, Chaco",
      domicilio_obra: "Barrio Los Nogales, Mza 12, Lote 8, Resistencia",
      telefono: "3624-567890",
      email: "maria.gonzalez@email.com",
      denominacion: "Vivienda unifamiliar",
      tiempo_obra_estimado: "120 dias",
      observaciones: "Cliente referida por arquitecta Perez. Financiacion en 6 cuotas.",
      agenda_inicio: "2026-03-01",
    },
    {
      apellido_nombre: "Rodriguez, Carlos Alberto",
      numero_contrato: "AM-2026-002",
      dni: "24789123",
      domicilio_legal: "Brown 678, Corrientes Capital",
      domicilio_obra: "Ruta 12 km 8.5, Country Los Alamos, Lote 24, Corrientes",
      telefono: "3794-321456",
      email: "carlos.rodriguez@gmail.com",
      denominacion: "Ampliación vivienda",
      tiempo_obra_estimado: "60 dias",
      observaciones: "Ampliación de 2 dormitorios + baño. Losa existente como base. Pago contado.",
      agenda_inicio: "2026-02-15",
    },
    {
      apellido_nombre: "Fernandez, Ana Paula",
      numero_contrato: "AM-2026-003",
      dni: "32456123",
      domicilio_legal: "Junin 234, Resistencia, Chaco",
      domicilio_obra: "Las Lilas 567, Fontana, Chaco",
      telefono: "3624-111222",
      email: "ana.fernandez@hotmail.com",
      denominacion: "Refacción integral",
      tiempo_obra_estimado: "45 dias",
      plan_pago: "50% inicio, 25% a los 20 dias, 25% final",
      observaciones: "Refacción cocina + baño completos. Incluye instalaciones.",
    },
    {
      apellido_nombre: "Martinez, Jorge Luis",
      numero_contrato: "AM-2026-004",
      dni: "20123789",
      domicilio_legal: "Sarmiento 890, Barranqueras, Chaco",
      domicilio_obra: "Sarmiento 890, Barranqueras, Chaco",
      telefono: "3624-999888",
      denominacion: "Local comercial",
      tiempo_obra_estimado: "30 dias",
      observaciones: "Remodelación frente de local comercial + pintura exterior.",
    },
    {
      apellido_nombre: "Lopez Sosa, Valentina",
      numero_contrato: "AM-2026-005",
      dni: "35678901",
      domicilio_legal: "Pellegrini 1567, Resistencia, Chaco",
      domicilio_obra: "Barrio Norte Mza 3 Lote 15, Resistencia, Chaco",
      telefono: "3624-777666",
      email: "vale.lopezsosa@gmail.com",
      denominacion: "Casa nueva 80m²",
      tiempo_obra_estimado: "180 dias",
      plan_pago: "Cuotas definidas según avance de obra",
      agenda_inicio: "2026-04-01",
      observaciones: "Construcción desde cero. Plano aprobado. Terreno con servicios.",
    },
  ];

  const created = [];
  for (const c of clients) {
    if (existingDni.has(c.dni)) {
      console.log(`  ℹ Skipping existing: ${c.apellido_nombre}`);
      continue;
    }
    const r = await api("POST", "/api/clientes", c);
    if (r.ok) {
      console.log(`  ✅ ${c.apellido_nombre}`);
      created.push(r.data.client || { ...c, id: r.data.id });
    } else {
      console.log(`  ❌ ${c.apellido_nombre}`);
    }
  }

  // Re-fetch to get IDs
  const { data: all } = await api("GET", "/api/clientes");
  return all?.clients || created;
}

// ═══════════════════════════════════════════════
// 5. PROJECTS
// ═══════════════════════════════════════════════
async function seedProjects(clients) {
  console.log("\n🏗️  Seeding projects...");

  const { data: existingP } = await api("GET", "/api/proyectos");
  const existingContracts = new Set((existingP?.projects || []).map(p => p.numero_contrato));

  if (clients.length < 3) {
    console.log("  ⚠ Need at least 3 clients to seed projects");
    return [];
  }

  const projects = [
    {
      client_id: clients[0].id,
      nombre: "Vivienda Gonzalez - Los Nogales",
      numero_contrato: "AM-2026-001",
      presupuesto_total: 45000000,
      estado: "activo",
      fecha_inicio: "2026-01-15",
      observaciones: "Obra en curso. Etapa actual: mampostería planta baja.",
    },
    {
      client_id: clients[1].id,
      nombre: "Ampliación Rodriguez - Country Los Alamos",
      numero_contrato: "AM-2026-002",
      presupuesto_total: 22000000,
      estado: "activo",
      fecha_inicio: "2026-02-01",
      observaciones: "Ampliación 2 dorm + baño. Cimientos ya realizados.",
    },
    {
      client_id: clients[2].id,
      nombre: "Refacción Fernandez - Fontana",
      numero_contrato: "AM-2026-003",
      presupuesto_total: 12000000,
      estado: "pendiente",
      observaciones: "Pendiente firma de contrato. Presupuesto aprobado verbalmente.",
    },
  ];

  const created = [];
  for (const p of projects) {
    if (existingContracts.has(p.numero_contrato)) {
      console.log(`  ℹ Skipping existing: ${p.nombre}`);
      continue;
    }
    const r = await api("POST", "/api/proyectos", p);
    if (r.ok) {
      console.log(`  ✅ ${p.nombre}`);
      created.push(r.data.project || { ...p });
    } else {
      console.log(`  ❌ ${p.nombre}`);
    }
  }

  const { data: all } = await api("GET", "/api/proyectos");
  return all?.projects || created;
}

// ═══════════════════════════════════════════════
// 6. CASH MOVEMENTS (Caja General)
// ═══════════════════════════════════════════════
async function seedCashMovements(clients, projects) {
  console.log("\n💵 Seeding cash movements...");

  const { data: existingCaja } = await api("GET", "/api/caja");
  if ((existingCaja?.movements?.length || 0) > 5) {
    console.log(`  ℹ Already have ${existingCaja.movements.length} cash movements, skipping`);
    return;
  }

  const movements = [
    // Ingresos
    {
      type: "ingreso",
      amount: 5000000,
      payment_method: "banco",
      concept: "Anticipo obra Gonzalez - 1ra cuota",
      category: "cobro_cliente",
      client_id: clients[0]?.id,
      project_id: projects[0]?.id,
      date: "2026-01-10",
    },
    {
      type: "ingreso",
      amount: 5000000,
      payment_method: "banco",
      concept: "Anticipo obra Gonzalez - 2da cuota",
      category: "cobro_cliente",
      client_id: clients[0]?.id,
      project_id: projects[0]?.id,
      date: "2026-01-25",
    },
    {
      type: "ingreso",
      amount: 11000000,
      payment_method: "banco",
      concept: "Pago contado ampliación Rodriguez - 50%",
      category: "cobro_cliente",
      client_id: clients[1]?.id,
      project_id: projects[1]?.id,
      date: "2026-02-01",
    },
    {
      type: "ingreso",
      amount: 2500000,
      payment_method: "efectivo_pesos",
      concept: "Seña refacción Fernandez",
      category: "cobro_cliente",
      client_id: clients[2]?.id,
      date: "2026-02-05",
    },
    {
      type: "ingreso",
      amount: 800000,
      payment_method: "mercado_pago",
      concept: "Trabajo de pintura particular - Dpto Av. Italia",
      category: "trabajo_suelto",
      date: "2026-01-20",
    },
    // Egresos
    {
      type: "egreso",
      amount: 950000,
      payment_method: "banco",
      concept: "Sueldo empleado - Juan Garcia - Enero",
      category: "sueldos",
      date: "2026-01-31",
    },
    {
      type: "egreso",
      amount: 950000,
      payment_method: "banco",
      concept: "Sueldo empleado - Pedro Ramirez - Enero",
      category: "sueldos",
      date: "2026-01-31",
    },
    {
      type: "egreso",
      amount: 165000,
      payment_method: "efectivo_pesos",
      concept: "Combustible camioneta - Enero",
      category: "vehiculo",
      date: "2026-01-28",
    },
    {
      type: "egreso",
      amount: 85000,
      payment_method: "efectivo_pesos",
      concept: "Herramientas - Disco de corte, lijas, brocha",
      category: "herramientas",
      date: "2026-01-22",
    },
    {
      type: "egreso",
      amount: 45000,
      payment_method: "mercado_pago",
      concept: "Seguro obra Gonzalez - Febrero",
      category: "seguros",
      date: "2026-02-01",
    },
    {
      type: "egreso",
      amount: 3200000,
      payment_method: "banco",
      concept: "Compra materiales Corralón Norte - ladrillo, cemento, arena",
      category: "materiales",
      project_id: projects[0]?.id,
      date: "2026-01-18",
    },
    {
      type: "egreso",
      amount: 1800000,
      payment_method: "banco",
      concept: "Compra materiales Corralón Norte - hierro y malla",
      category: "materiales",
      project_id: projects[1]?.id,
      date: "2026-02-03",
    },
    {
      type: "egreso",
      amount: 120000,
      payment_method: "efectivo_pesos",
      concept: "Almuerzo equipo obra Gonzalez x 5 dias",
      category: "gastos_obra",
      date: "2026-02-07",
    },
  ];

  for (const m of movements) {
    const r = await api("POST", "/api/caja", m);
    console.log(r.ok ? `  ✅ ${m.concept.slice(0, 50)}` : `  ❌ ${m.concept.slice(0, 50)}`);
  }
}

// ═══════════════════════════════════════════════
// 7. PROJECT EXPENSES & TRANSFERS
// ═══════════════════════════════════════════════
async function seedProjectExpenses(projects) {
  console.log("\n📋 Seeding project expenses & transfers...");

  if (!projects[0]?.id) {
    console.log("  ⚠ No projects available to seed expenses");
    return;
  }

  // Transfer money to project 1
  const pid1 = projects[0].id;
  const pid2 = projects[1]?.id;

  await api("POST", `/api/proyectos/${pid1}/transfer`, {
    amount: 5000000,
    payment_method: "banco",
    project_name: projects[0].nombre,
    date: "2026-01-16",
  });
  console.log("  ✅ Transfer $5.000.000 → Proyecto Gonzalez");

  // Project expenses
  const expenses1 = [
    { amount: 1200000, payment_method: "efectivo_pesos", concept: "Compra ladrillos 5000u", category: "materiales", date: "2026-01-18" },
    { amount: 800000, payment_method: "efectivo_pesos", concept: "Cemento 50 bolsas + arena 3m3", category: "materiales", date: "2026-01-20" },
    { amount: 350000, payment_method: "efectivo_pesos", concept: "Hierro y estribos para columnas", category: "materiales", date: "2026-01-22" },
    { amount: 190000, payment_method: "efectivo_pesos", concept: "Jornales albañil ayudante - semana 1", category: "mano_obra", date: "2026-01-24" },
    { amount: 55000, payment_method: "efectivo_pesos", concept: "Combustible ida y vuelta obra 5 dias", category: "transporte", date: "2026-01-25" },
    { amount: 190000, payment_method: "efectivo_pesos", concept: "Jornales albañil ayudante - semana 2", category: "mano_obra", date: "2026-01-31" },
  ];

  for (const e of expenses1) {
    const r = await api("POST", `/api/proyectos/${pid1}/expenses`, e);
    console.log(r.ok ? `  ✅ P1: ${e.concept.slice(0, 45)}` : `  ❌ P1: ${e.concept.slice(0, 45)}`);
  }

  if (pid2) {
    await api("POST", `/api/proyectos/${pid2}/transfer`, {
      amount: 3000000,
      payment_method: "banco",
      project_name: projects[1].nombre,
      date: "2026-02-02",
    });
    console.log("  ✅ Transfer $3.000.000 → Proyecto Rodriguez");

    const expenses2 = [
      { amount: 950000, payment_method: "efectivo_pesos", concept: "Compra hierro 12mm y 8mm", category: "materiales", date: "2026-02-03" },
      { amount: 420000, payment_method: "efectivo_pesos", concept: "Cemento y arena para cimientos", category: "materiales", date: "2026-02-04" },
      { amount: 190000, payment_method: "efectivo_pesos", concept: "Jornales semana 1", category: "mano_obra", date: "2026-02-07" },
    ];

    for (const e of expenses2) {
      const r = await api("POST", `/api/proyectos/${pid2}/expenses`, e);
      console.log(r.ok ? `  ✅ P2: ${e.concept.slice(0, 45)}` : `  ❌ P2: ${e.concept.slice(0, 45)}`);
    }
  }
}

// ═══════════════════════════════════════════════
// 8. CUENTA CORRIENTE
// ═══════════════════════════════════════════════
async function seedCuentaCorriente(clients, projects) {
  console.log("\n📒 Seeding cuenta corriente...");

  if (!clients[0]?.id) {
    console.log("  ⚠ No clients available");
    return;
  }

  // Client 1 — cargos por obra + cobros parciales
  const cid1 = clients[0].id;
  const entries1 = [
    { type: "cargo", amount: 45000000, concept: "Presupuesto total aprobado - Vivienda Los Nogales", date: "2026-01-10", project_id: projects[0]?.id },
    { type: "cobro", amount: 5000000, payment_method: "banco", concept: "Anticipo 1ra cuota", date: "2026-01-10", project_id: projects[0]?.id },
    { type: "cobro", amount: 5000000, payment_method: "banco", concept: "2da cuota", date: "2026-01-25", project_id: projects[0]?.id },
  ];

  for (const e of entries1) {
    const r = await api("POST", `/api/clientes/${cid1}/cuenta-corriente`, e);
    console.log(r.ok ? `  ✅ CC ${clients[0].apellido_nombre.split(",")[0]}: ${e.concept.slice(0, 40)}` : `  ❌ CC1: ${e.concept.slice(0, 40)}`);
  }

  // Client 2 — pago contado 50%
  if (clients[1]?.id) {
    const cid2 = clients[1].id;
    const entries2 = [
      { type: "cargo", amount: 22000000, concept: "Presupuesto ampliación 2 dorm + baño", date: "2026-02-01", project_id: projects[1]?.id },
      { type: "cobro", amount: 11000000, payment_method: "banco", concept: "Pago contado 50%", date: "2026-02-01", project_id: projects[1]?.id },
    ];
    for (const e of entries2) {
      const r = await api("POST", `/api/clientes/${cid2}/cuenta-corriente`, e);
      console.log(r.ok ? `  ✅ CC ${clients[1].apellido_nombre.split(",")[0]}: ${e.concept.slice(0, 40)}` : `  ❌ CC2: ${e.concept.slice(0, 40)}`);
    }
  }
}

// ═══════════════════════════════════════════════
// 9. QUOTATIONS (sample drafts)
// ═══════════════════════════════════════════════
async function seedQuotations(clients) {
  console.log("\n📝 Seeding quotations...");

  const { data: existingQ } = await api("GET", "/api/cotizaciones");
  const existingQNames = new Set((existingQ?.quotations || []).map(q => q.nombre));

  const quotations = [
    {
      client_id: clients[3]?.id || null,
      nombre: "Remodelación Frente Local - Martinez",
      notas: "Incluye demolición parcial, revoque nuevo, pintura exterior. Plazo: 30 días. Forma de pago: 50% anticipo, 50% entrega.",
      estado: "enviada",
      items: [
        { descripcion: "Demolición y retiro de revoque existente", m2: 35, unidad: "m2", costo_materiales: 0, costo_mano_obra: 280000, costo_fijos_prorrateados: 85000, subtotal: 365000 },
        { descripcion: "Revoque grueso + fino fachada", m2: 35, unidad: "m2", costo_materiales: 420000, costo_mano_obra: 560000, costo_fijos_prorrateados: 170000, subtotal: 1150000 },
        { descripcion: "Pintura exterior latex (2 manos)", m2: 35, unidad: "m2", costo_materiales: 180000, costo_mano_obra: 210000, costo_fijos_prorrateados: 85000, subtotal: 475000 },
        { descripcion: "Vereda perimetral contrapiso", m2: 12, unidad: "m2", costo_materiales: 350000, costo_mano_obra: 190000, costo_fijos_prorrateados: 50000, subtotal: 590000 },
      ],
      total_override: 3224000,
    },
    {
      client_id: clients[4]?.id || null,
      nombre: "Casa nueva 80m² - Lopez Sosa",
      notas: "Construcción llave en mano sobre lote con servicios. Incluye: cimientos, estructura, mampostería, instalaciones, terminaciones básicas. Plazo estimado: 180 días.",
      estado: "borrador",
      items: [
        { descripcion: "Cimientos y platea", m2: 80, unidad: "m2", costo_materiales: 4200000, costo_mano_obra: 2800000, costo_fijos_prorrateados: 540000, subtotal: 7540000 },
        { descripcion: "Mampostería ladrillo hueco 18 + 12", m2: 220, unidad: "m2", costo_materiales: 5800000, costo_mano_obra: 7200000, costo_fijos_prorrateados: 1800000, subtotal: 14800000 },
        { descripcion: "Losa vigueta y bovedilla", m2: 80, unidad: "m2", costo_materiales: 5600000, costo_mano_obra: 3200000, costo_fijos_prorrateados: 1100000, subtotal: 9900000 },
        { descripcion: "Instalación sanitaria completa", m2: 80, unidad: "global", costo_materiales: 3500000, costo_mano_obra: 2200000, costo_fijos_prorrateados: 680000, subtotal: 6380000 },
        { descripcion: "Instalación eléctrica completa", m2: 80, unidad: "global", costo_materiales: 2800000, costo_mano_obra: 1600000, costo_fijos_prorrateados: 680000, subtotal: 5080000 },
        { descripcion: "Revoques grueso + fino int/ext", m2: 440, unidad: "m2", costo_materiales: 2200000, costo_mano_obra: 4400000, costo_fijos_prorrateados: 1360000, subtotal: 7960000 },
        { descripcion: "Pisos cerámicos + revestimientos baño", m2: 80, unidad: "m2", costo_materiales: 2400000, costo_mano_obra: 1600000, costo_fijos_prorrateados: 680000, subtotal: 4680000 },
        { descripcion: "Pintura interior y exterior", m2: 440, unidad: "m2", costo_materiales: 1800000, costo_mano_obra: 2200000, costo_fijos_prorrateados: 1020000, subtotal: 5020000 },
        { descripcion: "Aberturas (puertas y ventanas)", m2: 1, unidad: "global", costo_materiales: 4500000, costo_mano_obra: 800000, costo_fijos_prorrateados: 340000, subtotal: 5640000 },
      ],
      total_override: 83750000,
    },
  ];

  for (const q of quotations) {
    if (existingQNames.has(q.nombre)) {
      console.log(`  ℹ Skipping existing: ${q.nombre}`);
      continue;
    }
    const r = await api("POST", "/api/cotizaciones", q);
    console.log(r.ok ? `  ✅ ${q.nombre}` : `  ❌ ${q.nombre}`);
  }
}

// ═══════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════
async function main() {
  console.log("🚀 AM Soluciones Constructivas - Data Seed Script\n");
  console.log("=" .repeat(55));

  await login();
  await runMigration007();
  await seedSettings();
  const materials = await fixMaterialPrices();
  await seedServiceTypes(materials);
  const clients = await seedClients();
  const projects = await seedProjects(clients);
  await seedCashMovements(clients, projects);
  await seedProjectExpenses(projects);
  await seedCuentaCorriente(clients, projects);
  await seedQuotations(clients);

  console.log("\n" + "=" .repeat(55));
  console.log("🎉 Seed complete!");
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
