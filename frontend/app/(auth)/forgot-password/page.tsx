"use client";

import Link from "next/link";
import { useState } from "react";

import { Button, Field } from "@/components/ui/Field";
import { ApiError, apiPublic } from "@/lib/api/client";
import { validateEmail } from "@/lib/validations/auth";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    const invalid = validateEmail(email);
    setError(invalid);
    setFormError(null);
    if (invalid) return;
    setSubmitting(true);
    try {
      await apiPublic("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
      setSent(email);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4" role="status">
        <h1 className="text-xl font-semibold text-zinc-900">Vérifiez votre boîte mail</h1>
        <p className="text-sm text-zinc-700">
          Si un compte existe pour <b>{sent}</b>, un email contenant un lien de réinitialisation vient d&apos;être envoyé.
          Le lien est valable 30 minutes.
        </p>
        <p className="text-xs text-zinc-500">Rien reçu ? Regardez dans vos courriers indésirables, puis réessayez.</p>
        <Link href="/login" className="text-center text-sm font-medium text-indigo-600 hover:underline">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-zinc-900">Mot de passe oublié</h1>
      <p className="text-sm text-zinc-600">Saisissez votre email : nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>
      <Field label="Email" name="email" type="email" autoComplete="email" error={error} />
      {formError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Envoi…" : "Envoyer le lien"}
      </Button>
      <Link href="/login" className="text-center text-sm font-medium text-indigo-600 hover:underline">
        Retour à la connexion
      </Link>
    </form>
  );
}
