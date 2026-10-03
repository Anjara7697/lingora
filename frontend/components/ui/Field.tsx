import type { InputHTMLAttributes } from "react";

export { Button } from "@/components/ui/Button";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const inputClass =
  "h-12 w-full rounded-md bg-surface px-3.5 text-base text-ink shadow-[inset_0_0_0_1.5px_#cbd5e1] outline-none placeholder:text-muted focus:shadow-[inset_0_0_0_1.5px_#0f766e,0_0_0_4px_#e6f7f5] aria-[invalid=true]:shadow-[inset_0_0_0_1.5px_#b42318] disabled:bg-canvas";

export function Field({ label, error, id, ...props }: FieldProps) {
  const fieldId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={inputClass}
        {...props}
      />
      {error && (
        <p id={`${fieldId}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
