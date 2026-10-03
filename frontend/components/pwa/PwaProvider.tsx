"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void> };

export function PwaProvider() {
  const [online, setOnline] = useState(true);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);

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
        <div role="status" className="fixed inset-x-0 top-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
          Connexion perdue : certaines actions sont indisponibles.
        </div>
      )}
      {installEvent && (
        <div className="fixed inset-x-3 bottom-3 z-50 flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm shadow-lg ring-1 ring-zinc-200">
          <span className="text-zinc-800">Installer Lingora sur votre écran d&apos;accueil</span>
          <span className="flex gap-2">
            <button type="button" className="text-zinc-500" onClick={() => setInstallEvent(null)}>
              Plus tard
            </button>
            <button
              type="button"
              className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white"
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
