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
import { useGuestRedirect } from "@/features/auth/useGuestRedirect";
import { ApiError } from "@/lib/api/client";
import { validateEmail, validatePassword } from "@/lib/validations/auth";
import { useOnline } from "@/lib/useOnline";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const online = useOnline();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  useGuestRedirect(!submitting);

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
    setNotice(null);
    setEmailTaken(false);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await register(input);
      router.replace("/onboarding");
    } catch (err) {
      if (err instanceof ApiError && err.body.code === "EMAIL_ALREADY_USED") {
        setErrors({ email: "Cet email est déjà utilisé" });
        setEmailTaken(true);
      } else if (err instanceof ApiError && err.status !== 0 && err.status !== 429 && err.body.details?.length) {
        const serverErrors: Record<string, string> = {};
        for (const d of err.body.details) serverErrors[d.field] = d.message;
        setErrors(serverErrors);
      } else if (err instanceof ApiError && err.status === 0) {
        setNotice({ tone: "error", title: "Compte non créé.", text: "Le serveur est injoignable, réessayez une fois connecté." });
      } else {
        setNotice(noticeFor(err));
      }
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      footer={
        <>
          Déjà inscrit ?{" "}
          <Link href="/login" className={authLink}>
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5">
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-ink">Créer mon compte</h1>
        {!online && <Notice tone="offline" title="Hors ligne.">Vos saisies sont conservées.</Notice>}
        {notice && (
          <Notice tone={notice.tone} title={notice.title} icon={notice.clock ? <ClockIcon size={20} strokeWidth={2} /> : undefined}>
            {notice.text}
          </Notice>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Prénom" name="first_name" autoComplete="given-name" error={errors.first_name} readOnly={submitting} />
          <Field label="Nom" name="last_name" autoComplete="family-name" error={errors.last_name} readOnly={submitting} />
        </div>
        <div className="flex flex-col gap-2">
          <Field label="Email" name="email" type="email" autoComplete="email" error={errors.email} readOnly={submitting} />
          {emailTaken && (
            <Link href="/login" className={`${authLink} text-sm`}>
              Se connecter avec cet email
            </Link>
          )}
        </div>
        <PasswordField label="Mot de passe" name="password" autoComplete="new-password" error={errors.password} showRules readOnly={submitting} />
        <PasswordField
          label="Confirmer le mot de passe"
          name="password_confirmation"
          autoComplete="new-password"
          error={errors.password_confirmation}
          readOnly={submitting}
        />
        <Button type="submit" loading={submitting} className="mt-1">
          {submitting ? "Création…" : "Créer mon compte"}
        </Button>
      </form>
    </AuthCard>
  );
}
