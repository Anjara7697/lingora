"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Button, Field } from "@/components/ui/Field";
import { ApiError, apiPublic } from "@/lib/api/client";
import { validatePassword } from "@/lib/validations/auth";

function ResetForm() {
  const params = useSearchParams();
  const [token] = useState(() => params.get("token") ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Le jeton ne doit pas rester dans la barre d'adresse (historique, copier-coller, en-tête Referer).
  useEffect(() => {
    if (token) window.history.replaceState(null, "", window.location.pathname);
  }, [token]);

  if (!token) {
    return (
      <div className="flex flex-col gap-4" role="alert">
        <h1 className="text-xl font-semibold text-zinc-900">Lien incomplet</h1>
        <p className="text-sm text-zinc-700">Ce lien de réinitialisation est incomplet. Faites une nouvelle demande.</p>
        <Link href="/forgot-password" className="text-center text-sm font-medium text-indigo-600 hover:underline">
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4" role="status">
        <h1 className="text-xl font-semibold text-zinc-900">Mot de passe modifié ✅</h1>
        <p className="text-sm text-zinc-700">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe. Vos autres sessions ont été fermées.</p>
        <Link href="/login" className="rounded-lg bg-indigo-600 px-4 py-2.5 text-center font-semibold text-white hover:bg-indigo-700">
          Se connecter
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("password_confirmation") ?? "");
    const next: Record<string, string> = {};
    const weak = validatePassword(password);
    if (weak) next.password = weak;
    if (password !== confirmation) next.password_confirmation = "La confirmation ne correspond pas";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;
    setSubmitting(true);
    try {
      await apiPublic("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password, password_confirmation: confirmation }),
      });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.body.code === "INVALID_OR_EXPIRED_TOKEN") {
        setFormError("Ce lien est invalide ou a expiré. Faites une nouvelle demande.");
      } else {
        setFormError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
      }
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-zinc-900">Nouveau mot de passe</h1>
      <Field label="Nouveau mot de passe" name="password" type="password" autoComplete="new-password" error={errors.password} />
      <Field label="Confirmer le mot de passe" name="password_confirmation" type="password" autoComplete="new-password" error={errors.password_confirmation} />
      <p className="text-xs text-zinc-500">8 caractères minimum, avec au moins une lettre et un chiffre.</p>
      {formError && (
        <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{formError}</p>
          <Link href="/forgot-password" className="mt-1 inline-block font-medium underline">
            Demander un nouveau lien
          </Link>
        </div>
      )}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Enregistrement…" : "Enregistrer le mot de passe"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  // useSearchParams exige une frontière Suspense pour la génération statique.
  return (
    <Suspense fallback={<p className="text-zinc-500">Chargement…</p>}>
      <ResetForm />
    </Suspense>
  );
}
