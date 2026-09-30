"use client";

import type { Key } from "react";
import { ComboBox, FieldError, Input, Label, ListBox, Select } from "@heroui/react";

export interface Option {
  id: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  isDisabled?: boolean;
  className?: string;
  /** Mensagem de erro de validação (deixa o campo vermelho). */
  error?: string;
  onBlur?: () => void;
}

/** Select simples (listas curtas: estado, serviço, quantidade, status). */
export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = "Selecione",
  isDisabled,
  className,
  error,
  onBlur,
}: SelectFieldProps) {
  return (
    <Select
      className={className}
      fullWidth
      placeholder={placeholder}
      isDisabled={isDisabled}
      isInvalid={Boolean(error)}
      onBlur={onBlur}
      value={value || null}
      onChange={(key: Key | null) => onChange(key ? String(key) : "")}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox items={options}>
          {(item) => (
            <ListBox.Item id={item.id} textValue={item.label}>
              {item.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          )}
        </ListBox>
      </Select.Popover>
      <FieldError>{error}</FieldError>
    </Select>
  );
}

interface ComboFieldProps extends SelectFieldProps {
  /** Permite digitar um valor fora da lista (ex.: nicho personalizado). */
  allowsCustomValue?: boolean;
}

/** ComboBox com busca (listas longas: cidades, nichos). */
export function ComboField({
  label,
  value,
  options,
  onChange,
  placeholder,
  isDisabled,
  allowsCustomValue,
  className,
  error,
  onBlur,
}: ComboFieldProps) {
  const custom = allowsCustomValue
    ? {
        allowsCustomValue: true,
        inputValue: value,
        onInputChange: onChange,
      }
    : {
        value: value || null,
        onChange: (key: Key | null) => onChange(key ? String(key) : ""),
      };

  return (
    <ComboBox
      className={className}
      fullWidth
      isDisabled={isDisabled}
      isInvalid={Boolean(error)}
      onBlur={onBlur}
      defaultItems={options}
      {...custom}
    >
      <Label>{label}</Label>
      <ComboBox.InputGroup>
        <Input placeholder={placeholder} />
        <ComboBox.Trigger />
      </ComboBox.InputGroup>
      <ComboBox.Popover>
        <ListBox>
          {(item: Option) => (
            <ListBox.Item id={item.id} textValue={item.label}>
              {item.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          )}
        </ListBox>
      </ComboBox.Popover>
      <FieldError>{error}</FieldError>
    </ComboBox>
  );
}
