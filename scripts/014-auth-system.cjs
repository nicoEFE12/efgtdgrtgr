const { neon } = require("@neondatabase/serverless");
const fs = require("fs");

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

  // 1. Allowed emails table
  await sql`
    CREATE TABLE IF NOT EXISTS allowed_emails (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      added_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  console.log("✅ allowed_emails table created");

  // 2. Email verification tokens
  await sql`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  console.log("✅ email_verification_tokens table created");

  // 3. Password reset tokens
  await sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  console.log("✅ password_reset_tokens table created");

  // 4. Add email_verified to users
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE`;
  console.log("✅ email_verified column added to users");

  // 5. Mark existing users as verified
  await sql`UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE`;
  console.log("✅ Existing users marked as verified");

  // 6. Seed first allowed email
  await sql`
    INSERT INTO allowed_emails (email, role)
    VALUES ('nicolasferrai79@gmail.com', 'admin')
    ON CONFLICT (email) DO NOTHING
  `;
  console.log("✅ Admin email seeded in allowed_emails");

  console.log("\n🎉 Auth system migration complete!");
}

run().catch(e => { console.error("❌", e); process.exit(1); });
