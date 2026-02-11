const { neon } = require("@neondatabase/serverless");
const fs = require("fs");

// Parse .env.local
const envFile = fs.readFileSync(".env.local", "utf8");
for (const line of envFile.split(/\r?\n/)) {
  const idx = line.indexOf("=");
  if (idx > 0 && !line.startsWith("#")) {
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key && val) process.env[key] = val;
  }
}

async function run() {
  const sql = neon(process.env.DATABASE_URL);

  // Run any SQL file passed as argument
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node scripts/run-sql.cjs <file.sql>");
    process.exit(1);
  }

  const content = fs.readFileSync(file, "utf8");
  // Split on semicolons, filter empty/comments-only
  const statements = content
    .split(";")
    .map(s => s.trim())
    .filter(s => s && !s.startsWith("--"));

  for (const stmt of statements) {
    console.log(`  → ${stmt.slice(0, 80)}...`);
    await sql(stmt);
  }
  console.log(`✅ ${file} executed (${statements.length} statements)`);
}

run().catch(e => { console.error("❌", e); process.exit(1); });
