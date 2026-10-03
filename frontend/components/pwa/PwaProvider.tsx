"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { OfflineIcon } from "@/components/ui/icons";
import { useAuth } from "@/features/auth/AuthProvider";
import { SYNCED_EVENT, type SyncReport, syncPending } from "@/lib/offline/sync";

type InstallEvent = Event & { prompt: () => Promise<void> };

export function PwaProvider() {
  const [online, setOnline] = useState(true);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const { user } = useAuth();
  const userId = user?.id;

  // Les réponses données sans réseau sont envoyées dès que la connexion revient (et au démarrage).
  useEffect(() => {
    if (!userId) return;
    const flush = () => void syncPending(userId);
    const onSynced = (e: Event) => {
      const { synced, dropped } = (e as CustomEvent<SyncReport>).detail;
      setSyncNote(
        synced
          ? `${synced} réponse(s) envoyée(s) et corrigée(s). Retrouvez les corrections dans vos leçons.`
          : `${dropped} réponse(s) n'ont pas pu être envoyées (leçon retirée ou inscription terminée).`,
      );
      setTimeout(() => setSyncNote(null), 8000);
    };
    flush();
    window.addEventListener("online", flush);
    window.addEventListener(SYNCED_EVENT, onSynced);
    return () => {
      window.removeEventListener("online", flush);
      window.removeEventListener(SYNCED_EVENT, onSynced);
    };
  }, [userId]);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
    const sync = () => setOnline(navigator.onLine);
    sync();
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
    };
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setInstallEvent(null));
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  return (
    <>
      {!online && (
        <div role="status" className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-ink px-4 py-2 text-center text-sm font-semibold text-white">
          <OfflineIcon size={18} />
          <span>Hors ligne : lecture seule, réponses gardées.</span>
          {userId && (
            <Link href="/downloads" className="text-brand underline">
              Mes leçons téléchargées
            </Link>
          )}
        </div>
      )}
      {syncNote && (
        <div role="status" className="fixed inset-x-3 top-3 z-50 rounded-md bg-brand-strong px-4 py-3 text-center text-sm font-semibold text-white shadow-card">
          {syncNote}
        </div>
      )}
      {installEvent && (
        <div className="fixed inset-x-3 bottom-20 z-50 flex items-center justify-between gap-3 rounded-lg bg-surface p-3 text-sm shadow-card ring-1 ring-line md:bottom-3">
          <span className="font-semibold text-ink">Installer Lingora sur votre écran d&apos;accueil</span>
          <span className="flex gap-2">
            <button type="button" className="h-10 px-2 text-muted" onClick={() => setInstallEvent(null)}>
              Plus tard
            </button>
            <button
              type="button"
              className="h-10 rounded-md bg-ink px-4 font-semibold text-white"
              onClick={async () => {
                await installEvent.prompt();
                setInstallEvent(null);
              }}
            >
              Installer
            </button>
          </span>
        </div>
      )}
    </>
  );
}
