"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { Dialog } from "@/components/ui/Dialog";
import { Field, FieldError, inputClass } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { SearchIcon } from "@/components/ui/icons";
import { useAuth } from "@/features/auth/AuthProvider";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { ActionMenu, type MenuAction } from "@/features/admin/ActionMenu";
import { ListSkeleton, Pager, Tag } from "@/features/admin/ui";
import { Avatar } from "@/features/teacher/StatusPill";
import { ApiError } from "@/lib/api/client";
import { createUser, listUsers, resetPassword, updateUser } from "@/lib/api/admin";
import { formatDate } from "@/lib/time";
import type { Role } from "@/types/api";
import type { AdminUser, UserPage, UserStatus } from "@/types/admin";

const ADMIN: Role[] = ["ADMIN"];
const PAGE = 20;
const ROLE_LABEL: Record<Role, string> = { STUDENT: "Élève", TEACHER: "Enseignant", ADMIN: "Admin" };
const ROLES: Role[] = ["STUDENT", "TEACHER", "ADMIN"];
const STATUS_LABEL: Record<UserStatus, string> = { PENDING: "En attente", ACTIVE: "Actif", SUSPENDED: "Suspendu", DELETED: "Supprimé" };

type Pending =
  | { kind: "suspend"; u: AdminUser }
  | { kind: "role"; u: AdminUser; role: Role }
  | { kind: "password"; u: AdminUser };

function StatusTag({ s }: { s: UserStatus }) {
  return <Tag tone={s === "ACTIVE" ? "brand" : s === "SUSPENDED" ? "solid" : "outline"}>{STATUS_LABEL[s]}</Tag>;
}

export default function UsersPage() {
  const allowed = useRequireRole(ADMIN);
  const { user: me } = useAuth();
  const [page, setPage] = useState<UserPage | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [offset, setOffset] = useState(0);
  const [message, setMessage] = useState<{ tone: "success" | "error"; title?: string; text: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    listUsers({ search: search.trim(), role, status, offset, limit: PAGE })
      .then((r) => {
        setPage(r);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [search, role, status, offset]);

  useEffect(() => {
    if (!allowed) return;
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [allowed, load]);

  async function act(fn: () => Promise<unknown>, success: string) {
    setMessage(null);
    setBusy(true);
    try {
      await fn();
      setMessage({ tone: "success", text: success });
      load();
    } catch (e) {
      // les garde-fous de l'API (son propre rôle, dernier admin) arrivent en 409 ; le reste est un souci de connexion
      setMessage(
        e instanceof ApiError && e.status < 500
          ? { tone: "error", title: "Action impossible.", text: e.message }
          : { tone: "error", title: "Non enregistré.", text: "Le serveur ne répond pas. Réessayez." },
      );
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  if (!allowed) return null;
  const filtered = search !== "" || role !== "" || status !== "";
  const clear = () => {
    setSearch("");
    setRole("");
    setStatus("");
    setOffset(0);
  };

  const actionsFor = (u: AdminUser): MenuAction[] => {
    const isMe = u.id === me?.id;
    const reason = "Vous ne pouvez pas modifier votre propre compte.";
    const suspended = u.status === "SUSPENDED";
    return [
      ...ROLES.map((r, i) => ({
        heading: i === 0 ? "Changer le rôle" : undefined,
        label: r === "ADMIN" ? "Administrateur" : ROLE_LABEL[r],
        current: u.role === r,
        disabled: isMe || u.role === r,
        reason: isMe ? reason : undefined,
        onSelect: () => setPending({ kind: "role", u, role: r }),
      })),
      { heading: "Compte", label: "Réinitialiser le mot de passe", onSelect: () => setPending({ kind: "password", u }) },
      suspended
        ? { label: "Réactiver le compte", disabled: isMe, reason: isMe ? reason : undefined, onSelect: () => void act(() => updateUser(u.id, { status: "ACTIVE" }), `${u.first_name} est réactivé(e).`) }
        : { label: "Suspendre le compte…", tone: "danger" as const, disabled: isMe, reason: isMe ? reason : undefined, onSelect: () => setPending({ kind: "suspend", u }) },
    ];
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[28px] font-bold leading-tight text-ink">Utilisateurs</h1>
        <Button onClick={() => setShowCreate(true)} className="h-11 px-4">
          Nouvel utilisateur
        </Button>
      </div>

      {message && (
        <Notice tone={message.tone} title={message.title} className="mt-4">
          {message.text}
        </Notice>
      )}

      <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <SearchIcon size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            placeholder="Nom, email…"
            aria-label="Rechercher"
            className={`${inputClass} pl-11`}
          />
        </div>
        <select value={role} onChange={(e) => { setRole(e.target.value as Role | ""); setOffset(0); }} aria-label="Filtrer par rôle" className={`${inputClass} sm:w-44`}>
          <option value="">Tous les rôles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value as UserStatus | ""); setOffset(0); }} aria-label="Filtrer par statut" className={`${inputClass} sm:w-44`}>
          <option value="">Tous les statuts</option>
          <option value="ACTIVE">Actif</option>
          <option value="SUSPENDED">Suspendu</option>
          <option value="PENDING">En attente</option>
        </select>
      </div>

      <div className="mt-4">
        {failed && !page ? (
          <ErrorState title="Liste indisponible" onRetry={load} />
        ) : !page ? (
          <ListSkeleton />
        ) : page.items.length === 0 ? (
          <EmptyState
            icon={<SearchIcon size={28} />}
            title="Aucun utilisateur ne correspond"
            action={
              filtered ? (
                <button type="button" onClick={clear} className="text-[15px] font-semibold text-brand-strong underline">
                  Effacer les filtres
                </button>
              ) : undefined
            }
          >
            {[role && `Rôle : ${ROLE_LABEL[role]}`, status && `Statut : ${STATUS_LABEL[status]}`, search && `« ${search} »`].filter(Boolean).join(" · ")}
          </EmptyState>
        ) : (
          <>
            <div className="hidden rounded-lg bg-surface shadow-card md:block">
              <table className="w-full text-left text-[15px]">
                <thead className="text-[12px] uppercase tracking-wide text-muted">
                  <tr className="h-10">
                    <th className="pl-4 font-semibold">Utilisateur</th>
                    <th className="font-semibold">Rôle</th>
                    <th className="font-semibold">Statut</th>
                    <th className="font-semibold">Inscrit le</th>
                    <th className="w-14" />
                  </tr>
                </thead>
                <tbody>
                  {page.items.map((u) => (
                    <tr key={u.id} className="h-16 border-t border-line">
                      <td className="pl-4">
                        <span className="flex items-center gap-3">
                          <Avatar first={u.first_name} last={u.last_name} size={36} />
                          <span className="min-w-0">
                            <span className="block font-semibold text-ink">
                              {u.first_name} {u.last_name} {u.id === me?.id && <span className="text-[13px] font-normal text-muted">(vous)</span>}
                            </span>
                            <span className="block text-[13px] text-muted">{u.email}</span>
                          </span>
                        </span>
                      </td>
                      <td className="text-ink-2">{ROLE_LABEL[u.role]}</td>
                      <td>
                        <StatusTag s={u.status} />
                      </td>
                      <td className="text-ink-2">{formatDate(u.created_at)}</td>
                      <td>
                        <ActionMenu label={`Actions pour ${u.first_name} ${u.last_name}`} actions={actionsFor(u)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="grid gap-2.5 md:hidden">
              {page.items.map((u) => (
                <li key={u.id} className="flex items-center gap-3 rounded-lg bg-surface p-3.5 shadow-card">
                  <Avatar first={u.first_name} last={u.last_name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">
                      {u.first_name} {u.last_name} {u.id === me?.id && <span className="text-[13px] font-normal text-muted">(vous)</span>}
                    </span>
                    <span className="block truncate text-[13px] text-muted">{u.email}</span>
                    <span className="mt-1.5 flex gap-2">
                      <Tag tone="tint">{ROLE_LABEL[u.role]}</Tag>
                      <StatusTag s={u.status} />
                    </span>
                  </span>
                  <ActionMenu label={`Actions pour ${u.first_name} ${u.last_name}`} actions={actionsFor(u)} />
                </li>
              ))}
            </ul>
            <Pager offset={offset} page={PAGE} total={page.total} onChange={setOffset} />
          </>
        )}
      </div>

      <CreateDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(u) => {
          setShowCreate(false);
          setMessage({ tone: "success", title: "Utilisateur créé.", text: `${u.first_name} ${u.last_name} peut se connecter.` });
          load();
        }}
      />

      <ConfirmSheet
        open={pending?.kind === "suspend"}
        busy={busy}
        title={pending?.kind === "suspend" ? `Suspendre ${pending.u.first_name} ${pending.u.last_name} ?` : ""}
        confirmLabel="Suspendre le compte"
        cancelLabel="Annuler"
        onCancel={() => setPending(null)}
        onConfirm={() => pending?.kind === "suspend" && void act(() => updateUser(pending.u.id, { status: "SUSPENDED" }), `${pending.u.first_name} est suspendu(e).`)}
      >
        La personne est déconnectée immédiatement, sur tous ses appareils. Ses données et ses élèves assignés sont conservés. Vous pourrez réactiver le compte.
      </ConfirmSheet>

      <ConfirmSheet
        open={pending?.kind === "role"}
        tone="neutral"
        busy={busy}
        title={pending?.kind === "role" ? `Passer ${pending.u.first_name} en « ${ROLE_LABEL[pending.role]} » ?` : ""}
        confirmLabel="Changer le rôle"
        cancelLabel="Annuler"
        onCancel={() => setPending(null)}
        onConfirm={() => pending?.kind === "role" && void act(() => updateUser(pending.u.id, { role: pending.role }), `Rôle de ${pending.u.first_name} mis à jour.`)}
      >
        {pending?.kind === "role" && pending.u.role === "TEACHER" && pending.role !== "ADMIN"
          ? "Ses élèves lui seront retirés et devront être réassignés."
          : "Les accès de la personne changent immédiatement."}
      </ConfirmSheet>

      <PasswordDialog
        user={pending?.kind === "password" ? pending.u : null}
        onClose={() => setPending(null)}
        onSet={(u, p) => act(() => resetPassword(u.id, p), `Mot de passe de ${u.first_name} réinitialisé.`)}
        busy={busy}
      />
    </>
  );
}

function CreateDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (u: AdminUser) => void }) {
  const [f, setF] = useState({ email: "", first_name: "", last_name: "", role: "STUDENT" as Role, password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: "email" | "first_name" | "last_name" | "password") => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const weak = f.password !== "" && !(f.password.length >= 8 && /[A-Za-z]/.test(f.password) && /\d/.test(f.password));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (weak) return;
    setBusy(true);
    setError(null);
    try {
      const u = await createUser(f);
      setF({ email: "", first_name: "", last_name: "", role: "STUDENT", password: "" });
      onCreated(u);
    } catch (err) {
      setError(err instanceof ApiError && err.status < 500 ? err.message : "Le serveur ne répond pas. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} title="Nouvel utilisateur" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <Field label="Prénom" name="first_name" value={f.first_name} onChange={set("first_name")} required />
        <Field label="Nom" name="last_name" value={f.last_name} onChange={set("last_name")} required />
        <Field label="Email" name="email" type="email" value={f.email} onChange={set("email")} required />
        <div role="radiogroup" aria-label="Rôle" className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink">Rôle</span>
          <div className="flex gap-1 rounded-md bg-ink-tint p-1">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={f.role === r}
                onClick={() => setF({ ...f, role: r })}
                className={`h-10 flex-1 rounded-[10px] text-sm font-semibold ${f.role === r ? "bg-surface text-ink shadow-card" : "text-ink-2"}`}
              >
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>
        <Field
          label="Mot de passe temporaire"
          name="password"
          value={f.password}
          onChange={set("password")}
          error={weak ? "8 caractères minimum, une lettre et un chiffre" : undefined}
          hint="8 caractères minimum, une lettre et un chiffre. À communiquer à la personne."
          required
        />
        {error && <FieldError id="create-error">{error}</FieldError>}
        <Button type="submit" loading={busy} disabled={weak}>
          Créer l&apos;utilisateur
        </Button>
      </form>
    </Dialog>
  );
}

function PasswordDialog({ user, onClose, onSet, busy }: { user: AdminUser | null; onClose: () => void; onSet: (u: AdminUser, p: string) => void; busy: boolean }) {
  const [pwd, setPwd] = useState("");
  const weak = pwd !== "" && !(pwd.length >= 8 && /[A-Za-z]/.test(pwd) && /\d/.test(pwd));
  return (
    <Dialog open={user !== null} title={user ? `Nouveau mot de passe pour ${user.first_name}` : ""} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (user && !weak && pwd) {
            onSet(user, pwd);
            setPwd("");
          }
        }}
        className="flex flex-col gap-3.5"
      >
        <Field label="Mot de passe temporaire" name="new_password" value={pwd} onChange={(e) => setPwd(e.target.value)} error={weak ? "8 caractères minimum, une lettre et un chiffre" : undefined} hint="Toutes ses sessions seront fermées. Communiquez-lui ce mot de passe." />
        <Button type="submit" loading={busy} disabled={!pwd || weak}>
          Définir
        </Button>
      </form>
    </Dialog>
  );
}
