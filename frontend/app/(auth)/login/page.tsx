"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Field } from "@/components/ui/Field";
import { useAuth } from "@/features/auth/AuthProvider";
import { useGuestRedirect } from "@/features/auth/useGuestRedirect";
import { ApiError } from "@/lib/api/client";
import { validateEmail } from "@/lib/validations/auth";

export default function LoginPage() {
  useGuestRedirect();
  const { login } = useAuth();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    const next: Record<string, string> = {};
    const emailError = validateEmail(email);
    if (emailError) next.email = emailError;
    if (!password) next.password = "Mot de passe requis";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-zinc-900">Connexion</h1>
      <Field label="Email" name="email" type="email" autoComplete="email" error={errors.email} />
      <Field
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="current-password"
        error={errors.password}
      />
      {formError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Connexion…" : "Se connecter"}
      </Button>
      <p className="text-center text-sm text-zinc-600">
        Pas encore de compte ?{" "}
        <Link href="/register" className="font-medium text-indigo-600 hover:underline">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}
