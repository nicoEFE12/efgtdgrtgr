import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

const sql = neon(process.env.DATABASE_URL);

// Simple password hashing using pbkdf2
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function seed() {
  const passwordHash = hashPassword("admin123");

  // Check if admin already exists
  const existing = await sql`SELECT id FROM users WHERE email = 'admin@amsoluciones.com'`;
  if (existing.length > 0) {
    console.log("Admin user already exists, skipping");
    return;
  }

  await sql`
    INSERT INTO users (name, email, password_hash, role)
    VALUES ('Silvia Fischer', 'admin@amsoluciones.com', ${passwordHash}, 'admin')
  `;

  console.log("Admin user created: admin@amsoluciones.com / admin123");
}

seed().catch(console.error);
