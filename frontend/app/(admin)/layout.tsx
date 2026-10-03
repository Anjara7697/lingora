import { AppHeader } from "@/components/AppHeader";

export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <AppHeader />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</div>
    </>
  );
}
