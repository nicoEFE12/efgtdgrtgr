// Script para agregar numeración automática a contratos/proyectos existentes
// Ejecutar con: node scripts/add-contrato-numbers.cjs

const { neon } = require("@neondatabase/serverless");

// Usar DATABASE_URL del entorno
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ Error: DATABASE_URL no está configurada en las variables de entorno");
  console.error("   Por favor, configure la variable de entorno DATABASE_URL antes de ejecutar este script");
  process.exit(1);
}

async function main() {
  const sql = neon(DATABASE_URL);

  console.log("🚀 Iniciando migración de numeración de contratos...\n");

  try {
    // 1. Agregar columna si no existe
    console.log("📝 Agregando columna numero_contrato_auto...");
    await sql`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS numero_contrato_auto INTEGER
    `;
    console.log("✅ Columna agregada\n");

    // 2. Obtener proyectos existentes sin número
    console.log("🔍 Buscando contratos existentes...");
    const projects = await sql`
      SELECT id, nombre 
      FROM projects 
      WHERE numero_contrato_auto IS NULL
      ORDER BY id
    `;
    console.log(`📊 Encontrados ${projects.length} contratos para numerar\n`);

    // 3. Asignar números secuenciales
    if (projects.length > 0) {
      console.log("🔢 Asignando números...");
      for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        const numeroContrato = i + 1;
        
        await sql`
          UPDATE projects 
          SET numero_contrato_auto = ${numeroContrato}
          WHERE id = ${project.id}
        `;
        
        console.log(`  ✓ Contrato #${numeroContrato}: ${project.nombre}`);
      }
      console.log("");
    }

    // 4. Verificar resultados
    console.log("✅ Verificando migración...");
    const updated = await sql`
      SELECT id, nombre, numero_contrato_auto 
      FROM projects 
      ORDER BY numero_contrato_auto
    `;
    
    console.log("\n📋 Contratos numerados:");
    updated.forEach(p => {
      console.log(`  Contrato #${p.numero_contrato_auto}: ${p.nombre} (ID: ${p.id})`);
    });

    console.log("\n✨ Migración completada exitosamente!");
    console.log(`💡 Próximo número de contrato: ${updated.length + 1}\n`);

  } catch (error) {
    console.error("❌ Error durante la migración:", error);
    process.exit(1);
  }
}

main();
