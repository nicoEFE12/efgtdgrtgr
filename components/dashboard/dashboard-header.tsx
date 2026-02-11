import Image from "next/image";
import { Card } from "@/components/ui/card";

export function DashboardHeader() {
  return (
    <Card className="mb-6 overflow-hidden border-0 bg-gradient-to-r from-primary via-primary/80 to-primary/60 text-white shadow-lg">
      <div className="flex items-center gap-6 px-6 py-8">
        <div className="hidden sm:flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
          <Image
            src="/logo.png"
            alt="Am Soluciones Constructivas"
            width={64}
            height={64}
            className="object-contain"
          />
        </div>
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold tracking-tight">
            Am Soluciones Constructivas
          </h1>
          <p className="mt-1 text-white/80">
            Sistema integral de gestión
          </p>
        </div>
      </div>
    </Card>
  );
}
