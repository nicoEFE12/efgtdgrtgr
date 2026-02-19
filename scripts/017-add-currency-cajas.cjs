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

  try {
    // Add currency columns
    console.log("✓ Adding currency column to cash_movements...");
    await sql`ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'ARS'`;

    console.log("✓ Adding exchange_rate column to cash_movements...");
    await sql`ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,4) DEFAULT 1.0`;

    console.log("✓ Adding currency column to project_cash_movements...");
    await sql`ALTER TABLE project_cash_movements ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'ARS'`;

    console.log("✓ Adding exchange_rate column to project_cash_movements...");
    await sql`ALTER TABLE project_cash_movements ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,4) DEFAULT 1.0`;

    // Set USD for efectivo_usd payments
    console.log("✓ Setting currency=USD for efectivo_usd in cash_movements...");
    await sql`UPDATE cash_movements SET currency = 'USD' WHERE payment_method = 'efectivo_usd' AND currency = 'ARS'`;

    console.log("✓ Setting currency=USD for efectivo_usd in project_cash_movements...");
    await sql`UPDATE project_cash_movements SET currency = 'USD' WHERE payment_method = 'efectivo_usd' AND currency = 'ARS'`;

    // Create indexes
    console.log("✓ Creating currency index on cash_movements...");
    await sql`CREATE INDEX IF NOT EXISTS idx_cash_movements_currency ON cash_movements(currency)`;

    console.log("✓ Creating currency index on project_cash_movements...");
    await sql`CREATE INDEX IF NOT EXISTS idx_project_cash_movements_currency ON project_cash_movements(currency)`;

    console.log("\n✅ Independent currency cajas ready!\n");
    console.log("   • cash_movements now has 'currency' column (ARS or USD)");
    console.log("   • Each transaction tracks its own currency");
    console.log("   • ARS and USD cajas are completely separate");

  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

run();
