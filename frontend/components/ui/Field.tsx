import type { InputHTMLAttributes } from "react";

import { AlertIcon } from "@/components/ui/icons";

export { Button } from "@/components/ui/Button";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

/** Une erreur de champ est une bordure bleu nuit épaisse + icône + texte : jamais rouge, l'élève corrige sans être bloqué. */
export const inputClass =
  "h-12 w-full rounded-md bg-surface px-3.5 text-base text-ink shadow-[inset_0_0_0_1.5px_#cbd5e1] outline-none placeholder:text-muted focus:shadow-[inset_0_0_0_1.5px_#0f766e,0_0_0_4px_#e6f7f5] aria-[invalid=true]:shadow-[inset_0_0_0_2px_#172554] read-only:bg-canvas read-only:text-muted disabled:bg-canvas";

export function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
      <AlertIcon size={16} strokeWidth={2} className="flex-none" />
      {children}
    </p>
  );
}

export function Field({ label, error, hint, id, ...props }: FieldProps) {
  const fieldId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={inputClass}
        {...props}
      />
      {error ? (
        <FieldError id={`${fieldId}-error`}>{error}</FieldError>
      ) : (
        hint && (
          <p id={`${fieldId}-hint`} className="text-[13px] text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
