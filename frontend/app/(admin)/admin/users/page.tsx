"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Field";
import { useAuth } from "@/features/auth/AuthProvider";
import { useRequireRole } from "@/features/auth/useRequireRole";
import { createUser, listUsers, resetPassword, updateUser } from "@/lib/api/admin";
import { formatDate } from "@/lib/time";
import type { Role } from "@/types/api";
import type { AdminUser, UserPage, UserStatus } from "@/types/admin";

const ADMIN: Role[] = ["ADMIN"];
const PAGE = 20;
const ROLE_LABEL: Record<Role, string> = { STUDENT: "Élève", TEACHER: "Enseignant", ADMIN: "Administrateur" };
const STATUS_LABEL: Record<UserStatus, string> = {
  PENDING: "En attente",
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  DELETED: "Supprimé",
};

export default function UsersPage() {
  const allowed = useRequireRole(ADMIN);
  const { user: me } = useAuth();
  const [page, setPage] = useState<UserPage | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [offset, setOffset] = useState(0);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    listUsers({ search: search.trim(), role, status, offset, limit: PAGE })
      .then(setPage)
      .catch((e: Error) => setMessage({ ok: false, text: e.message }));
  }, [search, role, status, offset]);

  useEffect(() => {
    if (!allowed) return;
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [allowed, load]);

  async function act(fn: () => Promise<unknown>, success: string) {
    setMessage(null);
    try {
      await fn();
      setMessage({ ok: true, text: success });
      load();
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    }
  }

  if (!allowed) return <p className="text-zinc-500">Chargement…</p>;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Utilisateurs</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? "Fermer" : "Nouvel utilisateur"}</Button>
      </div>

      {message && (
        <p role={message.ok ? "status" : "alert"} className={`mb-3 rounded-lg px-3 py-2 text-sm ${message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      )}

      {showCreate && (
        <CreateForm
          onCreate={(body) =>
            act(async () => {
              await createUser(body);
              setShowCreate(false);
            }, "Utilisateur créé.")
          }
        />
      )}

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
          placeholder="Nom, email…"
          aria-label="Rechercher"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 sm:col-span-1"
        />
        <select value={role} onChange={(e) => { setRole(e.target.value as Role | ""); setOffset(0); }} aria-label="Filtrer par rôle" className="rounded-lg border border-zinc-300 bg-white px-3 py-2">
          <option value="">Tous les rôles</option>
          {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value as UserStatus | ""); setOffset(0); }} aria-label="Filtrer par statut" className="rounded-lg border border-zinc-300 bg-white px-3 py-2">
          <option value="">Tous les statuts</option>
          <option value="ACTIVE">Actif</option>
          <option value="SUSPENDED">Suspendu</option>
        </select>
      </div>

      <ul className="grid gap-3">
        {page?.items.map((u) => (
          <UserRow
            key={u.id}
            u={u}
            isMe={u.id === me?.id}
            onRole={(r) => act(() => updateUser(u.id, { role: r }), `Rôle de ${u.first_name} mis à jour.`)}
            onStatus={(s) => act(() => updateUser(u.id, { status: s }), s === "SUSPENDED" ? `${u.first_name} est suspendu(e).` : `${u.first_name} est réactivé(e).`)}
            onPassword={(p) => act(() => resetPassword(u.id, p), `Mot de passe de ${u.first_name} réinitialisé.`)}
          />
        ))}
      </ul>
      {page && page.items.length === 0 && <p className="text-sm text-zinc-500">Aucun utilisateur.</p>}

      {page && page.total > PAGE && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
          <Button onClick={() => setOffset(Math.max(0, offset - PAGE))} disabled={offset === 0} variant="secondary">
            Précédent
          </Button>
          <span className="text-zinc-600">
            {offset + 1}–{Math.min(offset + PAGE, page.total)} sur {page.total}
          </span>
          <Button onClick={() => setOffset(offset + PAGE)} disabled={offset + PAGE >= page.total} variant="secondary">
            Suivant
          </Button>
        </nav>
      )}
    </>
  );
}

function UserRow({ u, isMe, onRole, onStatus, onPassword }: {
  u: AdminUser;
  isMe: boolean;
  onRole: (r: Role) => void;
  onStatus: (s: "ACTIVE" | "SUSPENDED") => void;
  onPassword: (p: string) => void;
}) {
  const [pwd, setPwd] = useState<string | null>(null);
  const suspended = u.status === "SUSPENDED";
  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-zinc-900">
            {u.first_name} {u.last_name} {isMe && <span className="text-xs font-normal text-zinc-500">(vous)</span>}
          </p>
          <p className="text-xs text-zinc-500">{u.email} · inscrit le {formatDate(u.created_at)}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${suspended ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
          {STATUS_LABEL[u.status]}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-zinc-600">Rôle</span>
          <select
            value={u.role}
            disabled={isMe}
            onChange={(e) => {
              const r = e.target.value as Role;
              if (window.confirm(`Passer ${u.first_name} ${u.last_name} en « ${ROLE_LABEL[r]} » ?`)) onRole(r);
            }}
            aria-label={`Rôle de ${u.first_name} ${u.last_name}`}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1 disabled:opacity-60"
          >
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
        </label>
        <button
          disabled={isMe}
          onClick={() => onStatus(suspended ? "ACTIVE" : "SUSPENDED")}
          className="rounded-lg border border-zinc-300 px-3 py-1 hover:bg-zinc-50 disabled:opacity-60"
        >
          {suspended ? "Réactiver" : "Suspendre"}
        </button>
        <button onClick={() => setPwd(pwd === null ? "" : null)} className="rounded-lg border border-zinc-300 px-3 py-1 hover:bg-zinc-50">
          Mot de passe
        </button>
      </div>
      {pwd !== null && (
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onPassword(pwd);
            setPwd(null);
          }}
        >
          <input
            type="text"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Nouveau mot de passe temporaire"
            aria-label="Nouveau mot de passe"
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5"
          />
          <Button type="submit" disabled={pwd.length < 8}>Définir</Button>
          <p className="w-full text-xs text-zinc-500">8 caractères minimum, avec une lettre et un chiffre. Communiquez-le à la personne.</p>
        </form>
      )}
    </li>
  );
}

function CreateForm({ onCreate }: { onCreate: (b: { email: string; first_name: string; last_name: string; role: Role; password: string }) => void }) {
  const [f, setF] = useState({ email: "", first_name: "", last_name: "", role: "TEACHER" as Role, password: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const input = "rounded-lg border border-zinc-300 px-3 py-2";
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onCreate(f); }}
      className="mb-4 grid gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 sm:grid-cols-2"
    >
      <input className={input} placeholder="Prénom" aria-label="Prénom" value={f.first_name} onChange={set("first_name")} required />
      <input className={input} placeholder="Nom" aria-label="Nom" value={f.last_name} onChange={set("last_name")} required />
      <input className={`${input} sm:col-span-2`} type="email" placeholder="Email" aria-label="Email" value={f.email} onChange={set("email")} required />
      <select className={input} aria-label="Rôle du nouvel utilisateur" value={f.role} onChange={set("role")}>
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
        ))}
      </select>
      <input className={input} placeholder="Mot de passe temporaire" aria-label="Mot de passe temporaire" value={f.password} onChange={set("password")} required minLength={8} />
      <Button type="submit" className="sm:col-span-2">Créer l&apos;utilisateur</Button>
    </form>
  );
}
