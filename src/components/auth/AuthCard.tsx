import { Card } from "@heroui/react";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

interface AuthCardProps {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Moldura das telas de login/cadastro: logo, cartão centralizado e troca de tema. */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="mb-8">
        <BrandLogo variant="full" />
      </div>
      <Card className="w-full max-w-md gap-6 p-6 sm:p-8">
        <Card.Header className="gap-1.5">
          <Card.Title className="text-2xl font-semibold tracking-tight">{title}</Card.Title>
          {description && <Card.Description>{description}</Card.Description>}
        </Card.Header>
        <Card.Content className="gap-6">{children}</Card.Content>
      </Card>
      {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
    </div>
  );
}
