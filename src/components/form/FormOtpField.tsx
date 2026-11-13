"use client";

import { useId } from "react";
import { InputOTP, Label, REGEXP_ONLY_DIGITS } from "@heroui/react";
import { useController, type Control, type FieldPath, type FieldValues } from "react-hook-form";

interface FormOtpFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  autoFocus?: boolean;
  isDisabled?: boolean;
  className?: string;
}

/** Código TOTP de seis dígitos, com colagem e preenchimento automático. */
export function FormOtpField<T extends FieldValues>({
  control,
  name,
  label,
  autoFocus,
  isDisabled,
  className,
}: FormOtpFieldProps<T>) {
  const id = useId();
  const { field, fieldState, formState } = useController({ control, name });
  const errorId = `${id}-error`;

  return (
    <div className={`w-full min-w-0 ${className ?? ""}`}>
      <Label htmlFor={id} className="mb-2 block">{label}</Label>
      <InputOTP
        {...field}
        id={id}
        className="w-full"
        value={field.value ?? ""}
        maxLength={6}
        pattern={REGEXP_ONLY_DIGITS}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        isDisabled={isDisabled || formState.isSubmitting}
        isInvalid={Boolean(fieldState.error)}
        aria-invalid={Boolean(fieldState.error)}
        aria-describedby={fieldState.error ? errorId : undefined}
        required
        pasteTransformer={(text) => text.replace(/[\s-]/g, "")}
      >
        <InputOTP.Group className="w-full">
          {Array.from({ length: 6 }, (_, index) => (
            <InputOTP.Slot
              key={index}
              index={index}
              className="h-14 min-w-0 flex-1 sm:h-16 [&_.input-otp__slot-value]:text-2xl"
            />
          ))}
        </InputOTP.Group>
      </InputOTP>
      {fieldState.error && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-danger">
          {fieldState.error.message}
        </p>
      )}
    </div>
  );
}
