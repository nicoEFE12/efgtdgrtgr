"use client";

import React from "react"

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wallet,
  FolderKanban,
  Package,
  Calculator,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  FileUp,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface User {
  userId: number;
  name: string;
  email: string;
  role: string;
}

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Clientes",
    href: "/dashboard/clientes",
    icon: Users,
  },
  {
    label: "Caja General",
    href: "/dashboard/caja",
    icon: Wallet,
  },
  {
    label: "Proyectos",
    href: "/dashboard/proyectos",
    icon: FolderKanban,
  },
  {
    label: "Materiales",
    href: "/dashboard/materiales",
    icon: Package,
  },
  {
    label: "Cotizador",
    href: "/dashboard/cotizador",
    icon: Calculator,
  },
  {
    label: "Tipos de Servicio",
    href: "/dashboard/servicios",
    icon: Wrench,
  },
  {
    label: "Importar Excel",
    href: "/dashboard/importar",
    icon: FileUp,
  },
  {
    label: "Configuracion",
    href: "/dashboard/configuracion",
    icon: Settings,
  },
];

export function DashboardShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: User;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={() => {}}
          role="button"
          tabIndex={-1}
          aria-label="Cerrar menu"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Image
              src="/logo.png"
              alt="Am Soluciones"
              width={28}
              height={28}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-tight text-sidebar-foreground">
              Am Soluciones
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              Constructivas
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto text-sidebar-foreground hover:bg-sidebar-accent lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {active && (
                    <ChevronRight className="h-3.5 w-3.5 opacity-70" />
                  )}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* User info */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary/20 text-xs font-bold text-sidebar-primary">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-sidebar-foreground">
                {user.name}
              </span>
              <span className="truncate text-xs text-sidebar-foreground/60">
                {user.email}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="shrink-0 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-destructive"
              title="Cerrar sesion"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent px-4 lg:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir menu</span>
            </Button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Image
                src="/logo.png"
                alt="Am Soluciones"
                width={24}
                height={24}
              />
            </div>
          </div>
          <div className="flex-1" />
          <span className="text-sm font-medium text-muted-foreground">
            {new Date().toLocaleDateString("es-AR", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
