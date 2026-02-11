"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, KeyRound, CheckCircle, ArrowLeft } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (!token) {
      setError("Token inválido. Solicitá un nuevo enlace de restablecimiento.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al restablecer la contraseña");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Error de conexión. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <KeyRound className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold">Enlace inválido</h2>
        <p className="text-sm text-muted-foreground">
          Este enlace de restablecimiento no es válido o ha expirado.
        </p>
        <Button variant="outline" onClick={() => router.push("/login")} className="mt-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al login
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-lg font-semibold">¡Contraseña actualizada!</h2>
        <p className="text-sm text-muted-foreground">
          Tu contraseña fue restablecida correctamente. Ya podés iniciar sesión.
        </p>
        <Button onClick={() => router.push("/login")} className="mt-2">
          Iniciar Sesión
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Ingresá tu nueva contraseña.
      </p>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="new-password" className="text-sm font-medium">
          Nueva contraseña
        </Label>
        <Input
          id="new-password"
          type="password"
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className="h-11"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm-password" className="text-sm font-medium">
          Confirmar contraseña
        </Label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="Repetí la contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className="h-11"
        />
      </div>
      <Button
        type="submit"
        className="mt-2 h-11 w-full text-base font-semibold"
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <KeyRound className="mr-2 h-4 w-4" />
        )}
        Restablecer contraseña
      </Button>
      <button
        type="button"
        onClick={() => router.push("/login")}
        className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Volver al login
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-primary p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="flex flex-col items-center gap-4 pb-2 pt-8">
          <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-primary/10 p-3 shadow-lg">
            <Image
              src="/logo.png"
              alt="Am Soluciones Constructivas"
              width={100}
              height={100}
              priority
              className="object-contain"
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Restablecer contraseña
            </h1>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-8 pt-4">
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
