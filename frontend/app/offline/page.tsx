import Link from "next/link";

export const metadata = { title: "Hors ligne – Lingora" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-zinc-900">Vous êtes hors ligne</h1>
      <p className="text-zinc-600">
        Lingora a besoin d&apos;Internet pour charger vos leçons et analyser votre voix.
        Vérifiez votre connexion puis réessayez.
      </p>
      <Link href="/" className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white">
        Réessayer
      </Link>
    </main>
  );
}
