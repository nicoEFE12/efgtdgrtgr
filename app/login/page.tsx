"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, LogIn, UserPlus, ArrowLeft, Mail } from "lucide-react";

type View = "login" | "register" | "forgot-password" | "forgot-sent";

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Check URL params for messages
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    const verified = params.get("verified");
    if (errorParam) setError(decodeURIComponent(errorParam));
    if (verified === "true") setSuccess("¡Email verificado correctamente! Ya podés iniciar sesión.");
  }, []);

  function resetForm() {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setError("");
    setSuccess("");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Error de conexión. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al registrarse");
        return;
      }

      setView("login");
      resetForm();
      setSuccess(data.message || "Cuenta creada. Revisá tu email para verificar tu cuenta.");
    } catch {
      setError("Error de conexión. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setView("forgot-sent");
      } else {
        const data = await res.json();
        setError(data.error || "Error al enviar email");
      }
    } catch {
      setError("Error de conexión. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  }

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
              Am Soluciones Constructivas
            </h1>
            <p className="mt-2 text-sm text-muted-foreground font-medium">
              Sistema de Gestión
            </p>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8 pt-4">
          {/* Success message */}
          {success && (
            <div className="mb-4 rounded-md bg-green-500/10 border border-green-500/20 px-3 py-2 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
              <Mail className="h-4 w-4 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* LOGIN VIEW */}
          {view === "login" && (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-11"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Ingresá tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
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
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                Iniciar Sesión
              </Button>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { resetForm(); setView("register"); }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ¿No tenés cuenta? <span className="font-medium text-primary underline">Registrate</span>
                </button>
                <button
                  type="button"
                  onClick={() => { resetForm(); setView("forgot-password"); }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </form>
          )}

          {/* REGISTER VIEW */}
          {view === "register" && (
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="reg-name" className="text-sm font-medium">
                  Nombre completo
                </Label>
                <Input
                  id="reg-name"
                  type="text"
                  placeholder="Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="h-11"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="reg-email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Solo emails autorizados por el administrador pueden registrarse.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="reg-password" className="text-sm font-medium">
                  Contraseña
                </Label>
                <Input
                  id="reg-password"
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
                <Label htmlFor="reg-confirm" className="text-sm font-medium">
                  Confirmar contraseña
                </Label>
                <Input
                  id="reg-confirm"
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
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                Crear cuenta
              </Button>
              <button
                type="button"
                onClick={() => { resetForm(); setView("login"); }}
                className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Volver al login
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD VIEW */}
          {view === "forgot-password" && (
            <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña.
              </p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="forgot-email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
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
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Enviar enlace
              </Button>
              <button
                type="button"
                onClick={() => { resetForm(); setView("login"); }}
                className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Volver al login
              </button>
            </form>
          )}

          {/* FORGOT SENT VIEW */}
          {view === "forgot-sent" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold">¡Email enviado!</h2>
              <p className="text-sm text-muted-foreground">
                Si existe una cuenta con <strong>{email}</strong>, recibirás un enlace para restablecer tu contraseña.
                Revisá tu bandeja de entrada y spam.
              </p>
              <Button
                variant="outline"
                onClick={() => { resetForm(); setView("login"); }}
                className="mt-2"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
