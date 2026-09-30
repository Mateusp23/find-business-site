"use client";

import { Button, Spinner } from "@heroui/react";

/** Botão de enviar com spinner enquanto o formulário está sendo enviado. */
export function SubmitButton({
  isSubmitting,
  children,
  icon,
  fullWidth = true,
  variant,
  className,
  isDisabled,
}: {
  isSubmitting: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  variant?: "primary" | "secondary" | "tertiary";
  className?: string;
  isDisabled?: boolean;
}) {
  return (
    <Button
      type="submit"
      fullWidth={fullWidth}
      variant={variant}
      className={className}
      isDisabled={isSubmitting || isDisabled}
    >
      {isSubmitting ? <Spinner size="sm" color="current" /> : icon}
      {children}
    </Button>
  );
}
