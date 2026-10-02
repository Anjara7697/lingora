import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <Link href="/" className="text-center text-3xl font-bold text-zinc-900">
        Lingora
      </Link>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">{children}</div>
    </main>
  );
}
