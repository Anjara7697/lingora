"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Field } from "@/components/ui/Field";
import { useAuth } from "@/features/auth/AuthProvider";
import { useGuestRedirect } from "@/features/auth/useGuestRedirect";
import { ApiError } from "@/lib/api/client";
import { validateEmail, validatePassword } from "@/lib/validations/auth";

export default function RegisterPage() {
  useGuestRedirect();
  const { register } = useAuth();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "");
    const input = {
      first_name: value("first_name").trim(),
      last_name: value("last_name").trim(),
      email: value("email").trim(),
      password: value("password"),
      password_confirmation: value("password_confirmation"),
    };

    const next: Record<string, string> = {};
    if (!input.first_name) next.first_name = "Prénom requis";
    if (!input.last_name) next.last_name = "Nom requis";
    const emailError = validateEmail(input.email);
    if (emailError) next.email = emailError;
    const passwordError = validatePassword(input.password);
    if (passwordError) next.password = passwordError;
    if (input.password !== input.password_confirmation) {
      next.password_confirmation = "La confirmation ne correspond pas";
    }
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await register(input);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.body.code === "EMAIL_ALREADY_USED") {
          setErrors({ email: "Cet email est déjà utilisé" });
        } else {
          const serverErrors: Record<string, string> = {};
          for (const d of err.body.details ?? []) serverErrors[d.field] = d.message;
          setErrors(serverErrors);
          if (!Object.keys(serverErrors).length) setFormError(err.message);
        }
      } else {
        setFormError("Une erreur est survenue.");
      }
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-zinc-900">Créer mon compte</h1>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom" name="first_name" autoComplete="given-name" error={errors.first_name} />
        <Field label="Nom" name="last_name" autoComplete="family-name" error={errors.last_name} />
      </div>
      <Field label="Email" name="email" type="email" autoComplete="email" error={errors.email} />
      <Field
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        error={errors.password}
      />
      <Field
        label="Confirmer le mot de passe"
        name="password_confirmation"
        type="password"
        autoComplete="new-password"
        error={errors.password_confirmation}
      />
      <p className="text-xs text-zinc-500">8 caractères minimum, avec au moins une lettre et un chiffre.</p>
      {formError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Création…" : "Créer mon compte"}
      </Button>
      <p className="text-center text-sm text-zinc-600">
        Déjà inscrit ?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
