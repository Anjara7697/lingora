import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <h1 className="text-5xl font-bold tracking-tight text-zinc-900">Lingora</h1>
      <p className="text-xl font-medium text-indigo-600">Learn. Speak. Grow.</p>
      <p className="text-zinc-600">
        Apprenez l&apos;anglais en le parlant : pratique orale, feedback et progression mesurable.
      </p>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/register"
          className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
        >
          Créer mon compte
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-zinc-300 px-6 py-3 font-semibold text-zinc-800 hover:bg-zinc-100"
        >
          Se connecter
        </Link>
      </div>
    </main>
  );
}
