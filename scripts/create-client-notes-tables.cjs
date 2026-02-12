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

  console.log("Creating client_notes table...");
  await sql`
    CREATE TABLE IF NOT EXISTS client_notes (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  console.log("Creating client_attachments table...");
  await sql`
    CREATE TABLE IF NOT EXISTS client_attachments (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      filename VARCHAR(255) NOT NULL,
      original_filename VARCHAR(255) NOT NULL,
      url TEXT NOT NULL,
      mime_type VARCHAR(100),
      file_size INTEGER,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  console.log("Creating indexes...");
  await sql`CREATE INDEX IF NOT EXISTS idx_client_notes_client_id ON client_notes(client_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_client_attachments_client_id ON client_attachments(client_id)`;

  console.log("✅ Tables and indexes created successfully!");
}

run().catch(e => { console.error("❌", e); process.exit(1); });
