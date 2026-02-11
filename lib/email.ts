import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendVerificationEmail(
  email: string,
  token: string,
  name: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const verifyUrl = `${baseUrl}/api/auth/verify?token=${token}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Verificá tu cuenta - AM Soluciones Constructivas",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a2e; font-size: 24px;">AM Soluciones Constructivas</h1>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px;">
          <h2 style="color: #333; margin-top: 0;">¡Hola ${name}!</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Tu cuenta fue creada exitosamente. Para completar el registro y acceder al sistema, 
            verificá tu email haciendo click en el siguiente botón:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" 
               style="background: #1a1a2e; color: white; padding: 14px 32px; border-radius: 8px; 
                      text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
              Verificar mi cuenta
            </a>
          </div>
          <p style="color: #888; font-size: 13px;">
            Si no podés hacer click en el botón, copiá y pegá esta URL en tu navegador:<br>
            <a href="${verifyUrl}" style="color: #1a1a2e; word-break: break-all;">${verifyUrl}</a>
          </p>
          <p style="color: #888; font-size: 13px;">
            Este enlace expira en 24 horas.
          </p>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
          Si no creaste esta cuenta, podés ignorar este email.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  name: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const resetUrl = `${baseUrl}/login/reset-password?token=${token}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Restablecer contraseña - AM Soluciones Constructivas",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a2e; font-size: 24px;">AM Soluciones Constructivas</h1>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px;">
          <h2 style="color: #333; margin-top: 0;">Hola ${name},</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Recibimos una solicitud para restablecer tu contraseña. 
            Hacé click en el siguiente botón para crear una nueva:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #1a1a2e; color: white; padding: 14px 32px; border-radius: 8px; 
                      text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
              Restablecer contraseña
            </a>
          </div>
          <p style="color: #888; font-size: 13px;">
            Este enlace expira en 1 hora. Si no solicitaste esto, ignorá este email.
          </p>
        </div>
      </div>
    `,
  });
}
