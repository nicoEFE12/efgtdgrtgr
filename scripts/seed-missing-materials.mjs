/**
 * Adds missing materials and links them to existing service types.
 * Also sets proper prices for existing materials that had generic defaults.
 * 
 * Usage: node scripts/seed-missing-materials.mjs
 */

const BASE = "http://localhost:3000";
let COOKIE = "";

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@amsoluciones.com", password: "admin123" }),
    redirect: "manual",
  });
  COOKIE = (res.headers.get("set-cookie") || "").split(";")[0];
  console.log("✅ Logged in");
}

async function api(method, path, body) {
  const opts = { method, headers: { "Content-Type": "application/json", Cookie: COOKIE } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => null);
  return { ok: res.ok, data };
}

async function main() {
  await login();

  // --- 1. Get existing materials ---
  const { data: matData } = await api("GET", "/api/materiales");
  const existingMats = matData?.materials || [];
  const existingNames = new Set(existingMats.map(m => m.nombre.toLowerCase()));
  console.log(`\nExisting materials: ${existingMats.length}`);

  // --- 2. Missing materials to create (realistic AR prices Feb 2026) ---
  const newMaterials = [
    // Aglomerantes
    { nombre: "Cal hidratada x 25kg", precio_unitario: 7500, unidad: "bolsa", categoria: "aglomerantes" },
    { nombre: "Cascote triturado", precio_unitario: 25000, unidad: "m3", categoria: "aridos" },
    // Ladrillos
    { nombre: "Ladrillo hueco 8cm (12x18x33)", precio_unitario: 380, unidad: "un", categoria: "mamposteria" },
    { nombre: "Ladrillo hueco 12cm (12x18x33)", precio_unitario: 480, unidad: "un", categoria: "mamposteria" },
    { nombre: "Ladrillo hueco 18cm (18x18x33)", precio_unitario: 580, unidad: "un", categoria: "mamposteria" },
    { nombre: "Ladrillo común macizo", precio_unitario: 180, unidad: "un", categoria: "mamposteria" },
    // Terminaciones
    { nombre: "Cerámica piso 45x45", precio_unitario: 18000, unidad: "m2", categoria: "terminaciones" },
    { nombre: "Porcelanato 60x60", precio_unitario: 32000, unidad: "m2", categoria: "terminaciones" },
    { nombre: "Pegamento cerámica Weber x 30kg", precio_unitario: 12500, unidad: "bolsa", categoria: "terminaciones" },
    { nombre: "Pastina Klaukol x 5kg", precio_unitario: 8500, unidad: "bolsa", categoria: "terminaciones" },
    // Pintura
    { nombre: "Pintura latex interior x 20L", precio_unitario: 45000, unidad: "balde", categoria: "pintura" },
    { nombre: "Fijador sellador al agua x 20L", precio_unitario: 21000, unidad: "balde", categoria: "pintura" },
    // Impermeabilización
    { nombre: "Membrana líquida x 20L", precio_unitario: 68000, unidad: "balde", categoria: "impermeabilizacion" },
    // Estructura
    { nombre: "Vigueta pretensada x ml", precio_unitario: 8500, unidad: "ml", categoria: "estructura" },
    { nombre: "Bovedilla cerámica", precio_unitario: 3800, unidad: "un", categoria: "estructura" },
    { nombre: "Malla electrosoldada 15x15 (2x3m)", precio_unitario: 35000, unidad: "un", categoria: "estructura" },
    // Electricidad
    { nombre: "Cable unipolar 2.5mm²", precio_unitario: 3500, unidad: "ml", categoria: "electricidad" },
    { nombre: "Caja de luz rectangular", precio_unitario: 2800, unidad: "un", categoria: "electricidad" },
    { nombre: "Tomacorriente doble", precio_unitario: 6500, unidad: "un", categoria: "electricidad" },
    { nombre: "Interruptor simple", precio_unitario: 6500, unidad: "un", categoria: "electricidad" },
  ];

  // Create only truly new materials
  const created = [];
  for (const m of newMaterials) {
    if (existingNames.has(m.nombre.toLowerCase())) {
      console.log(`  ℹ Already exists: ${m.nombre}`);
      continue;
    }
    const r = await api("POST", "/api/materiales", m);
    if (r.ok) {
      console.log(`  ✅ Created: ${m.nombre} — $${m.precio_unitario}`);
      created.push(r.data?.material || m);
    } else {
      console.log(`  ❌ Failed: ${m.nombre}`);
    }
  }

  // Refetch all materials
  const { data: allMatData } = await api("GET", "/api/materiales");
  const allMats = allMatData?.materials || [];
  console.log(`\nTotal materials now: ${allMats.length}`);

  // --- 3. Update prices for "Columna prearmada" items (realistic AR prices) ---
  console.log("\n🔧 Updating columna prices...");
  const columnaPrices = {
    '8" 15x15': 28000,
    '8" 15x20': 32000,
    '8" 20x30': 45000,
    '8" 30x30': 58000,
    '10" 15x15': 35000,
    '10" 15x20': 40000,
    '10" 20x30': 55000,
    '10" 30x30': 72000,
    '12" 15x15': 42000,
    '12" 15x20': 48000,
    '12" 20x30': 65000,
    '12" 30x30': 85000,
  };
  for (const mat of allMats) {
    if (!mat.nombre.toLowerCase().includes("columna prearmada")) continue;
    for (const [key, price] of Object.entries(columnaPrices)) {
      if (mat.nombre.includes(key) && Number(mat.precio_unitario) !== price) {
        await api("PUT", "/api/materiales", {
          id: mat.id, nombre: mat.nombre, precio_unitario: price,
          unidad: mat.unidad, proveedor: mat.proveedor,
          codigo_referencia: mat.codigo_referencia, categoria: mat.categoria || "estructura",
        });
        console.log(`  🔧 ${mat.nombre}: $${mat.precio_unitario} → $${price}`);
      }
    }
  }

  // Also update aislante pricing
  for (const mat of allMats) {
    if (mat.nombre.toLowerCase().includes("aislante espuma") && Number(mat.precio_unitario) < 10000) {
      const newP = 15000; // rollo 1x20m
      await api("PUT", "/api/materiales", {
        id: mat.id, nombre: mat.nombre, precio_unitario: newP,
        unidad: mat.unidad, proveedor: mat.proveedor,
        codigo_referencia: mat.codigo_referencia, categoria: mat.categoria || "aislacion",
      });
      console.log(`  🔧 ${mat.nombre}: $${mat.precio_unitario} → $${newP}`);
    }
  }

  // Also update chapas pricing
  for (const mat of allMats) {
    if (mat.nombre.toLowerCase().includes("chapa") && Number(mat.precio_unitario) === 45000) {
      const newP = 52000; // chapa c25 110x5m
      await api("PUT", "/api/materiales", {
        id: mat.id, nombre: mat.nombre, precio_unitario: newP,
        unidad: mat.unidad, proveedor: mat.proveedor,
        codigo_referencia: mat.codigo_referencia, categoria: mat.categoria || "cubierta",
      });
      console.log(`  🔧 ${mat.nombre}: $${mat.precio_unitario} → $${newP}`);
    }
  }

  // Also update clavos espiralados
  for (const mat of allMats) {
    if (mat.nombre.toLowerCase().includes("clavo") && Number(mat.precio_unitario) === 3800) {
      const newP = 4200;
      await api("PUT", "/api/materiales", {
        id: mat.id, nombre: mat.nombre, precio_unitario: newP,
        unidad: mat.unidad, proveedor: mat.proveedor,
        codigo_referencia: mat.codigo_referencia, categoria: mat.categoria || "ferreteria",
      });
      console.log(`  🔧 ${mat.nombre}: $${mat.precio_unitario} → $${newP}`);
    }
  }

  // --- 4. Now update service types with the missing material links ---
  console.log("\n🔗 Linking materials to service types...");
  const { data: stData } = await api("GET", "/api/service-types");
  const serviceTypes = stData?.serviceTypes || [];

  // Helper: find material by keyword
  function findMat(keyword) {
    const kw = keyword.toLowerCase();
    return allMats.find(m => m.nombre.toLowerCase().includes(kw));
  }

  // Mapping: service type name → materials that should exist
  const stMaterialsMap = {
    "Contrapiso": [
      { keyword: "cemento", cantidad_por_m2: 0.3 },
      { keyword: "arena", cantidad_por_m2: 0.06 },
      { keyword: "cascote", cantidad_por_m2: 0.05 },
    ],
    "Carpeta fina": [
      { keyword: "cemento", cantidad_por_m2: 0.15 },
      { keyword: "arena", cantidad_por_m2: 0.03 },
    ],
    "Mampostería ladrillo hueco 12": [
      { keyword: "ladrillo hueco 12", cantidad_por_m2: 16 },
      { keyword: "cemento", cantidad_por_m2: 0.16 },
      { keyword: "cal hidratada", cantidad_por_m2: 0.25 },
      { keyword: "arena", cantidad_por_m2: 0.03 },
    ],
    "Mampostería ladrillo hueco 18": [
      { keyword: "ladrillo hueco 18", cantidad_por_m2: 16 },
      { keyword: "cemento", cantidad_por_m2: 0.2 },
      { keyword: "cal hidratada", cantidad_por_m2: 0.3 },
      { keyword: "arena", cantidad_por_m2: 0.04 },
    ],
    "Mampostería ladrillo común": [
      { keyword: "ladrillo común", cantidad_por_m2: 64 },
      { keyword: "cemento", cantidad_por_m2: 0.2 },
      { keyword: "cal hidratada", cantidad_por_m2: 0.35 },
      { keyword: "arena", cantidad_por_m2: 0.05 },
    ],
    "Revoque grueso": [
      { keyword: "cemento", cantidad_por_m2: 0.12 },
      { keyword: "cal hidratada", cantidad_por_m2: 0.2 },
      { keyword: "arena", cantidad_por_m2: 0.03 },
    ],
    "Revoque fino": [
      { keyword: "cal hidratada", cantidad_por_m2: 0.15 },
      { keyword: "arena", cantidad_por_m2: 0.02 },
      { keyword: "cemento", cantidad_por_m2: 0.05 },
    ],
    "Colocación de cerámica piso": [
      { keyword: "cerámica piso", cantidad_por_m2: 1.05 },
      { keyword: "pegamento cerámica", cantidad_por_m2: 0.15 },
      { keyword: "pastina", cantidad_por_m2: 0.1 },
    ],
    "Pintura interior": [
      { keyword: "pintura latex", cantidad_por_m2: 0.015 },
      { keyword: "fijador sellador", cantidad_por_m2: 0.008 },
    ],
    "Impermeabilización de techo": [
      { keyword: "membrana líquida", cantidad_por_m2: 0.018 },
    ],
    "Losa vigueta y bovedilla": [
      { keyword: "vigueta", cantidad_por_m2: 3 },
      { keyword: "bovedilla", cantidad_por_m2: 6 },
      { keyword: "hierro 8", cantidad_por_m2: 0.5 },
      { keyword: "cemento", cantidad_por_m2: 0.2 },
      { keyword: "arena", cantidad_por_m2: 0.04 },
      { keyword: "malla electrosoldada", cantidad_por_m2: 0.08 },
    ],
    "Instalación eléctrica": [
      { keyword: "cable unipolar 2.5", cantidad_por_m2: 3 },
      { keyword: "caja de luz", cantidad_por_m2: 0.15 },
      { keyword: "tomacorriente", cantidad_por_m2: 0.1 },
      { keyword: "interruptor", cantidad_por_m2: 0.08 },
      { keyword: "caño", cantidad_por_m2: 1.5 },
    ],
  };

  for (const st of serviceTypes) {
    const requiredMats = stMaterialsMap[st.nombre];
    if (!requiredMats) continue;

    const mats = [];
    let missing = 0;
    for (const rm of requiredMats) {
      const mat = findMat(rm.keyword);
      if (mat) {
        mats.push({ material_id: mat.id, cantidad_por_m2: rm.cantidad_por_m2 });
      } else {
        console.log(`  ⚠ Still missing: "${rm.keyword}" for "${st.nombre}"`);
        missing++;
      }
    }

    // Only update if we have more materials than currently
    const currentCount = Array.isArray(st.materiales) ? st.materiales.length : 0;
    if (mats.length > currentCount) {
      const r = await api("PUT", "/api/service-types", {
        id: st.id,
        nombre: st.nombre,
        descripcion: st.descripcion,
        rendimiento_m2_dia: st.rendimiento_m2_dia,
        costo_mano_obra_dia: st.costo_mano_obra_dia,
        incluye_cargas_sociales: st.incluye_cargas_sociales,
        porcentaje_cargas: st.porcentaje_cargas,
        materiales: mats,
      });
      console.log(r.ok
        ? `  ✅ ${st.nombre}: ${currentCount} → ${mats.length} materiales`
        : `  ❌ ${st.nombre} update failed`);
    } else {
      console.log(`  ℹ ${st.nombre}: already has ${currentCount} materiales (needed ${mats.length})`);
    }
  }

  console.log("\n🎉 Done!");
}

main().catch(err => { console.error(err); process.exit(1); });
