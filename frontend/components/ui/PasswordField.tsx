"use client";

import { useState } from "react";

import { EyeIcon, EyeOffIcon, CheckIcon } from "@/components/ui/icons";
import { FieldError, inputClass } from "@/components/ui/Field";

/** Critères du mot de passe : mêmes règles que `validatePassword` (le serveur reste l'autorité). */
export const passwordRules = (value: string) => ({
  length: value.length >= 8,
  mix: /[A-Za-z]/.test(value) && /\d/.test(value),
});

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-1.5 ${ok ? "font-semibold text-brand-strong" : "text-muted"}`}>
      {ok ? <CheckIcon size={15} strokeWidth={3} /> : <span className="h-[15px] w-[15px] rounded-full shadow-[inset_0_0_0_2px_#cbd5e1]" />}
      {children}
    </li>
  );
}

interface Props {
  label: string;
  name: string;
  autoComplete: string;
  error?: string;
  /** Affiche les critères en direct sous le champ (création / changement de mot de passe). */
  showRules?: boolean;
  readOnly?: boolean;
}

/** Champ mot de passe avec œil (afficher / masquer) et, au besoin, critères en direct. Reste un champ non contrôlé (FormData). */
export function PasswordField({ label, name, autoComplete, error, showRules = false, readOnly }: Props) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");
  const rules = passwordRules(value);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          readOnly={readOnly}
          onInput={(e) => setValue(e.currentTarget.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${name}-error` : showRules ? `${name}-rules` : undefined}
          className={`${inputClass} pr-12`}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={visible}
          className="absolute right-0 top-0 flex h-12 w-11 items-center justify-center text-muted"
        >
          {visible ? <EyeOffIcon size={22} /> : <EyeIcon size={22} />}
        </button>
      </div>
      {error && <FieldError id={`${name}-error`}>{error}</FieldError>}
      {showRules && (
        <ul id={`${name}-rules`} className="mt-0.5 flex flex-col gap-1 text-[13px]">
          <Rule ok={rules.mix}>Une lettre et un chiffre</Rule>
          <Rule ok={rules.length}>
            8 caractères minimum{value.length > 0 && value.length < 8 ? ` (${value.length}/8)` : ""}
          </Rule>
        </ul>
      )}
    </div>
  );
}
