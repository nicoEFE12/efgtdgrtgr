import React from "react"
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Am Soluciones Constructivas - Sistema de Gestion",
  description:
    "Plataforma de gestion centralizada para Am Soluciones Constructivas. Control financiero, presupuestos y proyectos.",
};

export const viewport: Viewport = {
  themeColor: "#1e3a6e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
