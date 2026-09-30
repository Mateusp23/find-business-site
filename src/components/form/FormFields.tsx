"use client";

import { useState } from "react";
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Button, Description, FieldError, Input, InputGroup, Label, TextField } from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";
import { ComboField, SelectField, type Option } from "@/components/ui/fields";

/**
 * Campos do HeroUI ligados ao React Hook Form.
 * Uso: <FormTextField control={form.control} name="email" label="E-mail" />
 * A validação vem do schema Zod passado ao useForm (zodResolver).
 */
interface BaseProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  className?: string;
}

interface TextProps<T extends FieldValues> extends BaseProps<T> {
  type?: "text" | "email" | "url" | "search" | "tel";
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  isReadOnly?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}

export function FormTextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  type = "text",
  placeholder,
  autoComplete,
  autoFocus,
  isRequired,
  isReadOnly,
  isDisabled,
  inputMode,
  className,
}: TextProps<T>) {
  const {
    field: { name: fieldName, value, onChange, onBlur, ref },
    fieldState,
  } = useController({ control, name });
  return (
    <TextField
      fullWidth
      className={className}
      type={type}
      name={fieldName}
      value={value ?? ""}
      onChange={onChange}
      onBlur={onBlur}
      ref={ref}
      isInvalid={Boolean(fieldState.error)}
      isRequired={isRequired}
      isReadOnly={isReadOnly}
      isDisabled={isDisabled}
      autoComplete={autoComplete}
      autoFocus={autoFocus}
      validationBehavior="aria"
    >
      <Label>{label}</Label>
      <Input placeholder={placeholder} inputMode={inputMode} />
      {description && !fieldState.error && <Description>{description}</Description>}
      <FieldError>{fieldState.error?.message}</FieldError>
    </TextField>
  );
}

interface PasswordProps<T extends FieldValues> extends BaseProps<T> {
  autoComplete?: "current-password" | "new-password";
  autoFocus?: boolean;
}

/** Senha com botão de mostrar/ocultar. */
export function FormPasswordField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  autoComplete = "current-password",
  autoFocus,
  isRequired = true,
  className,
}: PasswordProps<T>) {
  const {
    field: { name: fieldName, value, onChange, onBlur, ref },
    fieldState,
  } = useController({ control, name });
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      fullWidth
      className={className}
      type={visible ? "text" : "password"}
      name={fieldName}
      value={value ?? ""}
      onChange={onChange}
      onBlur={onBlur}
      ref={ref}
      isInvalid={Boolean(fieldState.error)}
      isRequired={isRequired}
      autoComplete={autoComplete}
      autoFocus={autoFocus}
      validationBehavior="aria"
    >
      <Label>{label}</Label>
      <InputGroup>
        <InputGroup.Input placeholder="••••••••" />
        <InputGroup.Suffix>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            onPress={() => setVisible((v) => !v)}
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        </InputGroup.Suffix>
      </InputGroup>
      {description && !fieldState.error && <Description>{description}</Description>}
      <FieldError>{fieldState.error?.message}</FieldError>
    </TextField>
  );
}

interface ChoiceProps<T extends FieldValues> extends BaseProps<T> {
  options: Option[];
  placeholder?: string;
  /** Efeito extra ao mudar (ex.: limpar a cidade ao trocar o estado). */
  onValueChange?: (value: string) => void;
}

export function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder,
  isDisabled,
  className,
  onValueChange,
}: ChoiceProps<T>) {
  const { field, fieldState } = useController({ control, name });
  return (
    <SelectField
      className={className}
      label={label}
      placeholder={placeholder}
      isDisabled={isDisabled}
      options={options}
      value={field.value == null ? "" : String(field.value)}
      onChange={(v) => {
        field.onChange(v);
        onValueChange?.(v);
      }}
      onBlur={field.onBlur}
      error={fieldState.error?.message}
    />
  );
}

export function FormComboBox<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder,
  isDisabled,
  className,
  allowsCustomValue,
  onValueChange,
}: ChoiceProps<T> & { allowsCustomValue?: boolean }) {
  const { field, fieldState } = useController({ control, name });
  return (
    <ComboField
      className={className}
      label={label}
      placeholder={placeholder}
      isDisabled={isDisabled}
      allowsCustomValue={allowsCustomValue}
      options={options}
      value={field.value ?? ""}
      onChange={(v) => {
        field.onChange(v);
        onValueChange?.(v);
      }}
      onBlur={field.onBlur}
      error={fieldState.error?.message}
    />
  );
}
