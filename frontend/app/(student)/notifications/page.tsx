"use client";

import { useCallback, useEffect, useState } from "react";

import { useRequireAuth } from "@/features/auth/useRequireAuth";
import { FeedbackList } from "@/features/teacher/FeedbackForm";
import { apiAuth } from "@/lib/api/client";
import { markAllNotificationsRead, myNotifications } from "@/lib/api/teacher";
import { timeAgo } from "@/lib/time";
import type { AppNotification, FeedbackItem } from "@/types/teacher";

export default function NotificationsPage() {
  const allowed = useRequireAuth();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);

  const load = useCallback(() => {
    myNotifications()
      .then((n) => setItems(n.items))
      .catch(() => setItems([]));
    apiAuth<FeedbackItem[]>("/me/teacher-feedback")
      .then(setFeedback)
      .catch(() => setFeedback([]));
  }, []);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  if (!allowed || !items) return <p className="text-zinc-500">Chargement…</p>;
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Notifications</h1>
        {unread > 0 && (
          <button
            onClick={() => markAllNotificationsRead().then(load)}
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>
      {items.length === 0 && <p className="text-sm text-zinc-500">Aucune notification.</p>}
      <ul className="grid gap-2">
        {items.map((n) => (
          <li
            key={n.id}
            className={`rounded-xl border p-3 text-sm ${n.read_at ? "border-zinc-200 bg-white" : "border-indigo-300 bg-indigo-50"}`}
          >
            <p className="font-medium text-zinc-900">{n.title}</p>
            {n.message && <p className="mt-1 text-zinc-700">{n.message}</p>}
            <p className="mt-1 text-xs text-zinc-500">{timeAgo(n.created_at)}</p>
          </li>
        ))}
      </ul>

      <h2 className="mb-2 mt-8 font-semibold text-zinc-900">Feedback de vos enseignants</h2>
      <FeedbackList items={feedback} />
    </>
  );
}
