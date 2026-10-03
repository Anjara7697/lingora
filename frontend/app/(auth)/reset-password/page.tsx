"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AuthScreen } from "@/components/auth/AuthScreen";
import { Button, buttonClass } from "@/components/ui/Button";
import { AlertIcon, CheckIcon, ClockIcon, LockIcon } from "@/components/ui/icons";
import { Notice } from "@/components/ui/Notice";
import { PasswordField } from "@/components/ui/PasswordField";
import { noticeFor, type FormNotice } from "@/features/auth/errors";
import { ApiError, apiPublic } from "@/lib/api/client";
import { useOnline } from "@/lib/useOnline";
import { validatePassword } from "@/lib/validations/auth";

function ResetForm() {
  const params = useSearchParams();
  const online = useOnline();
  const [token] = useState(() => params.get("token") ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const [expired, setExpired] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Le jeton ne doit pas rester dans la barre d'adresse (historique, copier-coller, en-tête Referer).
  useEffect(() => {
    if (token) window.history.replaceState(null, "", window.location.pathname);
  }, [token]);

  if (!token || expired) {
    return (
      <AuthScreen
        icon={<AlertIcon size={28} strokeWidth={1.8} />}
        title="Ce lien n'est plus valable"
        lead="Il a expiré (30 min), a déjà servi ou est incomplet. Faites une nouvelle demande."
      >
        <Link href="/forgot-password" className={buttonClass("primary", "mt-auto")}>
          Demander un nouveau lien
        </Link>
      </AuthScreen>
    );
  }

  if (done) {
    return (
      <AuthScreen
        tone="brand"
        icon={<CheckIcon size={28} strokeWidth={2.4} />}
        title="Mot de passe modifié"
        lead="Connectez-vous avec votre nouveau mot de passe. Vos autres sessions ont été fermées."
      >
        <Link href="/login" className={buttonClass("primary", "mt-auto")}>
          Se connecter
        </Link>
      </AuthScreen>
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
    setNotice(null);
    if (Object.keys(next).length) return;
    setSubmitting(true);
    try {
      await apiPublic("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password, password_confirmation: confirmation }),
      });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && (err.body.code === "INVALID_OR_EXPIRED_TOKEN" || err.body.details?.some((d) => d.field === "token"))) {
        setExpired(true);
      } else if (err instanceof ApiError && err.status === 0) {
        setNotice({ tone: "error", title: "Non enregistré.", text: "Serveur injoignable. Le lien reste valable : réessayez." });
      } else {
        setNotice(noticeFor(err));
      }
      setSubmitting(false);
    }
  }

  return (
    <AuthScreen icon={<LockIcon size={28} strokeWidth={1.8} />} title="Nouveau mot de passe">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {!online && <Notice tone="offline" title="Hors ligne.">L&apos;enregistrement demande Internet.</Notice>}
        {notice && (
          <Notice tone={notice.tone} title={notice.title} icon={notice.clock ? <ClockIcon size={20} strokeWidth={2} /> : undefined}>
            {notice.text}
          </Notice>
        )}
        <PasswordField label="Nouveau mot de passe" name="password" autoComplete="new-password" error={errors.password} showRules readOnly={submitting} />
        <PasswordField label="Confirmer le mot de passe" name="password_confirmation" autoComplete="new-password" error={errors.password_confirmation} readOnly={submitting} />
        <Button type="submit" loading={submitting} className="mt-1">
          {submitting ? "Enregistrement…" : "Enregistrer le mot de passe"}
        </Button>
      </form>
    </AuthScreen>
  );
}

export default function ResetPasswordPage() {
  // useSearchParams exige une frontière Suspense pour la génération statique.
  return (
    <Suspense fallback={<p className="text-muted">Chargement…</p>}>
      <ResetForm />
    </Suspense>
  );
}
