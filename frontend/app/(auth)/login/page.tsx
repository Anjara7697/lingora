"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthCard, authLink } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ClockIcon } from "@/components/ui/icons";
import { Notice } from "@/components/ui/Notice";
import { PasswordField } from "@/components/ui/PasswordField";
import { useAuth } from "@/features/auth/AuthProvider";
import { noticeFor, type FormNotice } from "@/features/auth/errors";
import { homeFor } from "@/features/auth/roles";
import { useGuestRedirect } from "@/features/auth/useGuestRedirect";
import { validateEmail } from "@/lib/validations/auth";
import { useOnline } from "@/lib/useOnline";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const online = useOnline();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useGuestRedirect(!submitting);

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
    setNotice(null);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const user = await login(email, password);
      router.replace(homeFor(user.role));
    } catch (err) {
      const n = noticeFor(err);
      setNotice(n.tone === "error" && !n.title && /incorrect/i.test(n.text) ? { ...n, title: "Connexion impossible." } : n);
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href="/register" className={authLink}>
            Créer un compte
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-ink">Connexion</h1>
          <p className="text-[15px] text-muted">Content de vous revoir.</p>
        </div>
        {!online && <Notice tone="offline" title="Hors ligne.">La connexion demande Internet.</Notice>}
        {notice && (
          <Notice tone={notice.tone} title={notice.title} icon={notice.clock ? <ClockIcon size={20} strokeWidth={2} /> : undefined}>
            {notice.text}
          </Notice>
        )}
        <Field label="Email" name="email" type="email" autoComplete="email" error={errors.email} readOnly={submitting} />
        <PasswordField label="Mot de passe" name="password" autoComplete="current-password" error={errors.password} readOnly={submitting} />
        <Button type="submit" loading={submitting} className="mt-1">
          {submitting ? "Connexion…" : "Se connecter"}
        </Button>
        <Link href="/forgot-password" className={`${authLink} flex h-11 items-center justify-center text-[15px]`}>
          Mot de passe oublié ?
        </Link>
      </form>
    </AuthCard>
  );
}
