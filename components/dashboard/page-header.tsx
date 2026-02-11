import Image from "next/image";
import { Card } from "@/components/ui/card";

interface PageHeaderProps {
  title: string;
  description?: string;
  showLogo?: boolean;
}

export function PageHeader({
  title,
  description,
  showLogo = true,
}: PageHeaderProps) {
  return (
    <Card className="mb-6 overflow-hidden border-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
      <div className="flex items-center gap-4 px-6 py-6">
        {showLogo && (
          <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
            <Image
              src="/logo.png"
              alt="Logo"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
        )}
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
