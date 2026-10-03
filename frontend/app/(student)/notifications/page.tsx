"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { buttonClass } from "@/components/ui/Button";
import { MessageIcon, MicIcon, StarIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Notice } from "@/components/ui/Notice";
import { useRequireAuth } from "@/features/auth/useRequireAuth";
import { FeedbackList } from "@/features/teacher/FeedbackForm";
import { apiAuth } from "@/lib/api/client";
import { markAllNotificationsRead, myNotifications } from "@/lib/api/teacher";
import { timeAgo } from "@/lib/time";
import { useOnline } from "@/lib/useOnline";
import type { AppNotification, FeedbackItem } from "@/types/teacher";

export default function NotificationsPage() {
  const allowed = useRequireAuth();
  const online = useOnline();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [failed, setFailed] = useState(false);

  // Une erreur réseau n'est plus confondue avec « aucune notification ».
  const load = useCallback(() => {
    void Promise.all([myNotifications(), apiAuth<FeedbackItem[]>("/me/teacher-feedback")])
      .then(([n, f]) => {
        setItems(n.items);
        setFeedback(f);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  const header = (action?: React.ReactNode) => (
    <div className="flex items-center justify-between gap-3">
      <h1 className="font-display text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink">Notifications</h1>
      {action}
    </div>
  );

  if (failed) {
    return (
      <div className="flex flex-col gap-4">
        {header()}
        {!online && <Notice tone="offline" title="Hors ligne.">Notifications indisponibles.</Notice>}
        <ErrorState
          title="Notifications indisponibles"
          offline={!online}
          onRetry={() => {
            setFailed(false);
            load();
          }}
        >
          Impossible de vérifier vos messages pour l&apos;instant.
        </ErrorState>
      </div>
    );
  }

  if (!allowed || !items) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Chargement">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-[84px] w-full rounded-[14px]" />
        <Skeleton className="h-[84px] w-full rounded-[14px]" />
        <Skeleton className="h-16 w-full rounded-[14px]" />
      </div>
    );
  }

  const unread = items.filter((n) => !n.read_at).length;

  if (items.length === 0 && feedback.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        {header()}
        <EmptyState
          icon={<MessageIcon size={28} />}
          title="Rien de nouveau"
          action={
            <Link href="/speaking" className={buttonClass("primary")}>
              Aller au Speaking Lab
            </Link>
          }
        >
          Les retours de votre enseignant apparaîtront ici après vos sessions d&apos;oral.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {header(
        unread > 0 && (
          <button
            type="button"
            onClick={() => markAllNotificationsRead().then(load)}
            className="flex h-11 items-center text-sm font-semibold text-brand-strong"
          >
            Tout marquer lu
          </button>
        ),
      )}
      <ul className="flex flex-col gap-2">
        {items.map((n) => {
          const unreadItem = !n.read_at;
          const Icon = /premium/i.test(n.title) ? StarIcon : /speaking|oral/i.test(n.title) ? MicIcon : MessageIcon;
          return (
            <li
              key={n.id}
              className={`flex gap-3 rounded-[14px] p-3.5 pl-4 ${unreadItem ? "bg-surface shadow-[0_1px_2px_rgba(23,37,84,0.06),0_4px_16px_rgba(23,37,84,0.08),inset_3px_0_0_#14b8a6]" : "bg-canvas shadow-[inset_0_0_0_1px_#e2e8f0]"}`}
            >
              <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${unreadItem ? "bg-brand-tint text-brand-strong" : "bg-slate-100 text-muted"}`}>
                <Icon size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex justify-between gap-2">
                  <span className={`text-[15px] font-semibold ${unreadItem ? "text-ink" : "text-ink-2"}`}>{n.title}</span>
                  {unreadItem && <span aria-label="Non lu" className="mt-1.5 h-2 w-2 flex-none rounded-full bg-brand" />}
                </span>
                {n.message && <span className="text-sm leading-[1.45] text-ink-2">{n.message}</span>}
                <span className="text-xs font-semibold text-muted">
                  {unreadItem ? "NON LU · " : ""}
                  {timeAgo(n.created_at)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {feedback.length > 0 && (
        <section className="mt-1.5 flex flex-col gap-2.5">
          <h2 className="font-display text-lg font-bold text-ink">Retours de vos enseignants</h2>
          <FeedbackList items={feedback} />
        </section>
      )}
    </div>
  );
}
