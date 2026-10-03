"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthScreen } from "@/components/auth/AuthScreen";
import { buttonClass, Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { CheckIcon, ClockIcon, LockIcon } from "@/components/ui/icons";
import { Notice } from "@/components/ui/Notice";
import { noticeFor, type FormNotice } from "@/features/auth/errors";
import { apiPublic } from "@/lib/api/client";
import { useOnline } from "@/lib/useOnline";
import { validateEmail } from "@/lib/validations/auth";

export default function ForgotPasswordPage() {
  const online = useOnline();
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    const invalid = validateEmail(email);
    setError(invalid);
    setNotice(null);
    if (invalid) return;
    setSubmitting(true);
    try {
      await apiPublic("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
      setSent(email);
    } catch (err) {
      const n = noticeFor(err);
      setNotice(n.title === "Serveur injoignable." ? { ...n, title: "Lien non envoyé.", text: "Serveur injoignable, réessayez." } : n);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthScreen
        tone="brand"
        icon={<CheckIcon size={28} strokeWidth={2.4} />}
        title="Vérifiez votre boîte mail"
        lead={
          <>
            Si un compte existe pour <b className="font-semibold text-ink">{sent}</b>, un lien de réinitialisation vient d&apos;être envoyé. Il est
            valable 30 minutes.
          </>
        }
      >
        <p role="status" className="text-sm leading-normal text-muted">
          Rien reçu ? Regardez dans vos courriers indésirables, puis réessayez.
        </p>
        <Link href="/login" className={buttonClass("primary", "mt-auto")}>
          Retour à la connexion
        </Link>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      back={{ href: "/login", label: "Connexion" }}
      icon={<LockIcon size={28} strokeWidth={1.8} />}
      title="Mot de passe oublié"
      lead="Saisissez votre email : nous vous enverrons un lien pour choisir un nouveau mot de passe."
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {!online && <Notice tone="offline" title="Hors ligne.">L&apos;envoi du lien demande Internet.</Notice>}
        {notice && (
          <Notice tone={notice.tone} title={notice.title} icon={notice.clock ? <ClockIcon size={20} strokeWidth={2} /> : undefined}>
            {notice.clock ? "Patientez un peu : 3 demandes maximum par heure." : notice.text}
          </Notice>
        )}
        <Field label="Email" name="email" type="email" autoComplete="email" error={error} readOnly={submitting} />
        <Button type="submit" loading={submitting}>
          {submitting ? "Envoi…" : "Envoyer le lien"}
        </Button>
      </form>
    </AuthScreen>
  );
}
