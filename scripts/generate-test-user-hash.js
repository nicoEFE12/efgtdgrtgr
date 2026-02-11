import crypto from "crypto";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

// Generar hash para contraseña "test123"
const passwordHash = hashPassword("test123");

console.log("\n=== COMANDO SQL PARA CREAR USUARIO DE PRUEBA ===\n");
console.log("INSERT INTO users (name, email, password_hash, role)");
console.log(`VALUES ('Usuario Test', 'test@example.com', '${passwordHash}', 'admin');`);
console.log("\n=== CREDENCIALES ===");
console.log("Email: test@example.com");
console.log("Contraseña: test123");
console.log("\n");
