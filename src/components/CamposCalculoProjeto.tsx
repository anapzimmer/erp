"use client";
import type React from "react";
const limitarNumero4Digitos = (valor: string) => Number(valor.replace(/\D/g, "").slice(0, 4) || 0);
export function DataInput({
  icon,
  label,
  value,
  suffix,
  tabIndex,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  tabIndex?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-text-secondary">
        {label}
      </span>

      <span className="flex h-11 items-center rounded-lg border border-border bg-background px-3 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
        <span className="mr-2 flex shrink-0 text-text-secondary">
          {icon}
        </span>

        <input
          type="number"
          value={value}
          tabIndex={tabIndex}
          min={0}
          max={9999}
          inputMode="numeric"
          onKeyDown={(e) => {
            if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
              e.preventDefault();
            }
          }}
          onChange={(e) =>
            onChange(limitarNumero4Digitos(e.target.value))
          }
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-text-primary outline-none"
        />

        {suffix && (
          <span className="ml-2 text-xs font-medium text-text-secondary">
            {suffix}
          </span>
        )}
      </span>
    </label>
  );
}

export function OptionInput({
  icon,
  label,
  value,
  options,
  tabIndex,
  disabled = false,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  options: string[];
  tabIndex?: number;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className={`block ${disabled ? "opacity-50" : ""}`}>
      <span className="mb-1.5 block text-xs font-medium text-text-secondary">
        {label}
      </span>

      <span className="flex h-11 items-center rounded-lg border border-border bg-background px-3 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
        <span className="mr-2 flex shrink-0 text-text-secondary">
          {icon}
        </span>

        <select
          value={value}
          tabIndex={tabIndex}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-text-primary outline-none disabled:cursor-not-allowed"
        >
          {options.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}